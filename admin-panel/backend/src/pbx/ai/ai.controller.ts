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
import { EslService } from '../../freeswitch/esl/esl.service';
import { BadRequestException } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Controller('pbx/ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly extensions: ExtensionsService,
    private readonly dialplan: DialplanService,
    private readonly meta: PbxMetaService,
    private readonly esl: EslService,
  ) { }

  @Get('settings')
  settings() {
    return this.ai.getSettings();
  }

  @Post('settings')
  async update(@Body() dto: UpdateAiSettingsDto) {
    const res = this.ai.updateSettings(dto);
    await this.reloadFsBestEffort();
    return res;
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
    // Enforce: if ANY extension has AI enabled, there must remain at least one enabled AI service with a URL.
    const aiExtCount = this.extensions
      .list()
      .filter((e: any) => Boolean(e.aiEnabled)).length;

    if (aiExtCount > 0) {
      const cur = this.meta.get().meta;
      const list = Array.isArray(cur.aiServices) ? [...cur.aiServices] : [];

      const incomingId = body.id ? String(body.id) : undefined;
      const name = String(body.name ?? '').trim();
      const socketUrl = String(body.socketUrl ?? body.audioStreamUrl ?? '').trim();
      const enabled = body.enabled !== false;
      if (!name) throw new BadRequestException('name is required');
      if (!socketUrl) throw new BadRequestException('audio_stream_url is required');

      // simulate upsert result
      const idx = incomingId
        ? list.findIndex((s: any) => String(s?.id) === incomingId)
        : -1;
      const nextId = incomingId || '__new__';
      const next = { id: nextId, name, socketUrl, enabled };
      if (idx >= 0) list[idx] = next;
      else list.push(next);

      const enabledCount = list.filter(
        (s: any) => s && s.enabled !== false && s.socketUrl,
      ).length;
      if (enabledCount === 0) {
        throw new BadRequestException(
          'You have AI-enabled extensions. At least one AI service must remain enabled with a valid WS URL.',
        );
      }
    }

    const res = this.ai.upsertService(body);
    this.regenExtensionsDialplan();
    // Ensure dialplan changes are applied immediately (no manual reload needed)
    void this.reloadFsBestEffort();
    return res;
  }

  @Delete('services/:id')
  deleteService(@Param('id') id: string) {
    const aiExtCount = this.extensions
      .list()
      .filter((e: any) => Boolean(e.aiEnabled)).length;

    if (aiExtCount > 0) {
      const cur = this.meta.get().meta;
      const list = (cur.aiServices ?? []).filter(
        (s: any) => String(s?.id) !== String(id),
      );
      const enabledCount = list.filter(
        (s: any) => s && s.enabled !== false && s.socketUrl,
      ).length;
      if (enabledCount === 0) {
        throw new BadRequestException(
          'You have AI-enabled extensions. You cannot delete the last enabled AI service.',
        );
      }
    }

    const res = this.ai.deleteService(id);
    this.regenExtensionsDialplan();
    void this.reloadFsBestEffort();
    return res;
  }

  @Post('services/:id/default')
  setDefault(@Param('id') id: string) {
    const res = this.ai.setDefaultService(id);
    this.regenExtensionsDialplan();
    void this.reloadFsBestEffort();
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

  private async reloadFsBestEffort() {
    // Best-effort reload sequence (safe defaults).
    const cmds = [
      'reloadxml',
      'sofia profile internal rescan reloadxml',
      'sofia profile external rescan reloadxml',
    ];
    for (const c of cmds) {
      try {
        await this.esl.api(c);
      } catch {
        // ignore (ESL may be briefly unavailable during restarts)
      }
    }
  }
}
