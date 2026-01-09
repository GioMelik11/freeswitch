import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ExtensionsService } from '../extensions/extensions.service';
import { AiService } from './ai.service';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { DialplanService } from '../dialplan/dialplan.service';
import { PbxMetaService } from '../meta/pbx-meta.service';

@UseGuards(JwtAuthGuard)
@Controller('pbx/ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly extensions: ExtensionsService,
    private readonly dialplan: DialplanService,
    private readonly meta: PbxMetaService,
  ) {}

  @Get('settings')
  settings() {
    return this.ai.getSettings();
  }

  @Post('settings')
  update(@Body() dto: UpdateAiSettingsDto) {
    return this.ai.updateSettings(dto);
  }

  @Get('extensions')
  listAiExtensions() {
    const list = this.extensions.list();
    return list
      .filter((e: any) => Boolean(e.aiEnabled))
      .map((e: any) => ({
        id: e.id,
        callerIdName: e.callerIdName,
        aiServiceId: e.aiServiceId ?? null,
      }));
  }

  @Get('services')
  listServices() {
    return this.ai.listServices();
  }

  @Post('services')
  upsertService(
    @Body()
    body: {
      id?: string;
      name: string;
      socketUrl?: string;
      audioStreamUrl?: string;
      enabled?: boolean;
    },
  ) {
    const res = this.ai.upsertService(body);
    this.regenExtensionsDialplan();
    return res;
  }

  @Delete('services/:id')
  deleteService(@Param('id') id: string) {
    const res = this.ai.deleteService(id);
    this.regenExtensionsDialplan();
    return res;
  }

  @Post('services/:id/default')
  setDefault(@Param('id') id: string) {
    const res = this.ai.setDefaultService(id);
    this.regenExtensionsDialplan();
    return res;
  }

  private regenExtensionsDialplan() {
    try {
      const list = this.extensions.list();
      this.dialplan.ensureDefaultIncludesDirEarly();
      const m = this.meta.get().meta;
      const services = new Map<string, string>();
      for (const s of m.aiServices ?? []) {
        if (s?.enabled === false) continue;
        if (!s?.id || !s?.socketUrl) continue;
        services.set(String(s.id), String(s.socketUrl));
      }
      const defaultUrl =
        (m.defaultAiServiceId
          ? (services.get(String(m.defaultAiServiceId)) ?? '')
          : '') || (services.size ? [...services.values()][0] : '');
      this.dialplan.writeExtensionsSpecial(list, { services, defaultUrl });
    } catch {
      // best-effort: don't fail API call if regen fails
    }
  }
}
