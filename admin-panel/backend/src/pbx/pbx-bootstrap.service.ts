import { Injectable, OnModuleInit } from '@nestjs/common';
import { DialplanService } from './dialplan/dialplan.service';
import { ExtensionsService } from './extensions/extensions.service';
import { PbxMetaService } from './meta/pbx-meta.service';
import { EslService } from '../freeswitch/esl/esl.service';

@Injectable()
export class PbxBootstrapService implements OnModuleInit {
  constructor(
    private readonly dialplan: DialplanService,
    private readonly extensions: ExtensionsService,
    private readonly meta: PbxMetaService,
    private readonly esl: EslService,
  ) {}

  async onModuleInit() {
    // Best-effort: keep generated dialplan consistent on container restarts
    // without requiring a user to "re-save" anything in the UI.
    try {
      const { meta } = this.meta.get();

      this.dialplan.ensurePublicIncludesDir();
      this.dialplan.ensureDefaultIncludesDirEarly();

      this.dialplan.writeTrunkInbound(meta);
      this.dialplan.writeOutboundDefaults(meta);
      this.dialplan.writeOutboundPrefixRoutes(meta);
      this.dialplan.writeOutboundDefaultTrunkRoutes(meta);
      this.dialplan.writeQueues(meta);

      const list = this.extensions.list();
      const services = new Map<string, string>();
      for (const s of meta.aiServices ?? []) {
        if (s?.enabled === false) continue;
        if (!s?.id || !s?.socketUrl) continue;
        services.set(String(s.id), String(s.socketUrl));
      }
      const defaultUrl =
        (meta.defaultAiServiceId
          ? (services.get(String(meta.defaultAiServiceId)) ?? '')
          : '') || (services.size ? [...services.values()][0] : '');
      this.dialplan.writeExtensionsSpecial(list, { services, defaultUrl });

      await this.reloadFsBestEffort();
    } catch {
      // ignore: system may start before FS/ESL is ready
    }
  }

  private async reloadFsBestEffort() {
    const cmds = [
      'reloadxml',
      'sofia profile internal rescan reloadxml',
      'sofia profile external rescan reloadxml',
    ];
    for (const c of cmds) {
      try {
        await this.esl.api(c);
      } catch {
        // ignore
      }
    }
  }
}


