import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ExtensionsService } from '../extensions/extensions.service';
import { QueuesService } from '../queues/queues.service';
import { IvrService } from '../ivr/ivr.service';
import { SoundsService } from '../sounds/sounds.service';
import { FilesService } from '../../files/files.service';
import { xmlParser } from '../xml';
import { TimeConditionsService } from '../time-conditions/time-conditions.service';
import { PbxMetaService } from '../meta/pbx-meta.service';
import { TrunksService } from '../trunks/trunks.service';

@UseGuards(JwtAuthGuard)
@Controller('pbx/options')
export class OptionsController {
  constructor(
    private readonly extensions: ExtensionsService,
    private readonly trunks: TrunksService,
    private readonly queues: QueuesService,
    private readonly ivrs: IvrService,
    private readonly timeConditions: TimeConditionsService,
    private readonly sounds: SoundsService,
    private readonly files: FilesService,
    private readonly meta: PbxMetaService,
  ) {}

  @Get()
  get() {
    const ext = this.extensions.list().map((e) => ({
      id: e.id,
      label: `${e.id} - ${e.callerIdName}`,
    }));

    const q = this.queues.getConfig().queues.map((x) => ({ name: x.name }));
    const ivr = this.ivrs.list().menus.map((m: any) => ({ name: m.name }));
    const tc = this.timeConditions.list().items.map((t: any) => ({
      name: t.name,
      extensionNumber: t.extensionNumber,
    }));
    const soundIndex = this.sounds.getIndex();

    const mohClasses = this.getMohClasses();
    const strategies = [
      'ring-all',
      'round-robin',
      'top-down',
      'agent-with-least-talk-time',
      'agent-with-least-calls',
      'sequentially-by-agent-order',
      'random',
      'longest-idle-agent',
    ];
    const domains = ['default'];

    const m = this.meta.get().meta;
    const aiServices = (m.aiServices ?? [])
      .filter((s: any) => s && s.enabled !== false && s.id && s.socketUrl)
      .map((s: any) => ({
        id: String(s.id),
        name: String(s.name ?? s.id),
        socketUrl: String(s.socketUrl),
      }));

    const trunks = this.trunks.list().map((t) => ({
      name: t.name,
      isDefault: Boolean(t.isDefault),
    }));

    return {
      extensions: ext,
      trunks,
      queues: q,
      ivrs: ivr,
      timeConditions: tc,
      sounds: soundIndex,
      mohClasses,
      strategies,
      domains,
      aiServices,
      defaultAiServiceId: m.defaultAiServiceId ?? null,
      defaultTrunkName: m.defaultTrunkName ?? null,
    };
  }

  private getMohClasses() {
    try {
      const read = this.files.readFile(
        'autoload_configs/local_stream.conf.xml',
      );
      const obj: any = xmlParser.parse(read.content);
      const cfg = obj?.configuration;
      const dirs = cfg?.directory;
      const arr = Array.isArray(dirs) ? dirs : dirs ? [dirs] : [];
      const names = arr
        .map((d: any) => String(d?.['@_name'] ?? ''))
        .filter(Boolean);
      const out = new Set<string>();
      out.add('local_stream://moh');
      for (const n of names) out.add(`local_stream://${n}`);
      return [...out].sort();
    } catch {
      return ['local_stream://moh'];
    }
  }
}
