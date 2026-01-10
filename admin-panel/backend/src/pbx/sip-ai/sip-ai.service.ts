import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type SipAiDefaults = {
  sipServerAddr: string;
  sipDomain: string;
  sipContactHost: string;
  sdpIP: string;
  sipListenAddr: string;
  sipPass: string;
  registerExpires: number;
};

export type SipAiAgent = {
  id: string;
  source: 'pbx' | 'external';
  // PBX agent
  extension?: string;
  // External agent
  sipUser?: string;
  sipPass?: string;
  sipServerAddr?: string;
  sipDomain?: string;
  // common
  geminiSocketUrl?: string;
  enabled?: boolean;
};

export type SipAiConfigV2 = {
  defaults: SipAiDefaults;
  agents: SipAiAgent[];
};

@Injectable()
export class SipAiService {
  private readonly cfgPath: string;

  constructor(config: ConfigService) {
    const dataDir = config.get<string>('DATA_DIR') ?? '/data';
    const override = config.get<string>('SIP_AI_CONFIG_PATH');
    this.cfgPath = override
      ? path.resolve(override)
      : path.resolve(dataDir, 'sip-ai.json');
  }

  private defaultCfg(): SipAiConfigV2 {
    return {
      defaults: {
        sipServerAddr: 'auto:5060',
        sipDomain: 'auto',
        sipContactHost: 'auto',
        sdpIP: 'auto',
        sipListenAddr: '0.0.0.0:5090',
        sipPass: '1234',
        registerExpires: 300,
      },
      agents: [],
    };
  }

  private normalize(next: SipAiConfigV2): SipAiConfigV2 {
    const d = next.defaults ?? ({} as any);
    const rawExpires = Number(d.registerExpires ?? 300);
    const registerExpires =
      rawExpires === 0 ? 0 : Math.max(30, rawExpires || 300);

    const defaults: SipAiDefaults = {
      sipServerAddr: String(d.sipServerAddr ?? 'auto:5060').trim() || 'auto:5060',
      sipDomain: String(d.sipDomain ?? 'auto').trim() || 'auto',
      sipContactHost: String(d.sipContactHost ?? 'auto').trim() || 'auto',
      sdpIP: String(d.sdpIP ?? 'auto').trim() || 'auto',
      sipListenAddr: String(d.sipListenAddr ?? '0.0.0.0:5090').trim() || '0.0.0.0:5090',
      sipPass: String(d.sipPass ?? '1234'),
      registerExpires,
    };

    const agentsIn = Array.isArray(next.agents) ? next.agents : [];
    const agents: SipAiAgent[] = [];
    const seen = new Set<string>();
    for (const a of agentsIn) {
      if (!a) continue;
      const source = (a.source === 'external' ? 'external' : 'pbx') as 'pbx' | 'external';
      const enabled = a.enabled !== false;
      const geminiSocketUrl = String(a.geminiSocketUrl ?? '').trim();
      if (geminiSocketUrl && !/^wss?:\/\//i.test(geminiSocketUrl)) {
        throw new BadRequestException('geminiSocketUrl must start with ws:// or wss://');
      }

      if (source === 'pbx') {
        const ext = String(a.extension ?? '').trim();
        if (!/^\d+$/.test(ext)) continue;
        const id = String(a.id ?? `pbx-${ext}`).trim() || `pbx-${ext}`;
        if (seen.has(id)) continue;
        seen.add(id);
        agents.push({ id, source, extension: ext, geminiSocketUrl, enabled });
        continue;
      }

      // external
      const sipUser = String(a.sipUser ?? '').trim();
      const sipPass = String(a.sipPass ?? '').trim();
      const sipServerAddr = String(a.sipServerAddr ?? '').trim();
      const sipDomain = String(a.sipDomain ?? '').trim();
      if (!sipUser || !sipPass || !sipServerAddr || !sipDomain) continue;
      const id = String(a.id ?? `ext-${sipUser}`).trim() || `ext-${sipUser}`;
      if (seen.has(id)) continue;
      seen.add(id);
      agents.push({
        id,
        source,
        sipUser,
        sipPass,
        sipServerAddr,
        sipDomain,
        geminiSocketUrl,
        enabled,
      });
    }

    return { defaults, agents };
  }

  private migrateIfNeeded(parsed: any): SipAiConfigV2 {
    // Old format: { geminiSocketUrl: string, extensions: string[] }
    if (parsed && (typeof parsed.geminiSocketUrl === 'string' || Array.isArray(parsed.extensions))) {
      const def = this.defaultCfg();
      const gem = String(parsed.geminiSocketUrl ?? '').trim();
      const exts = Array.isArray(parsed.extensions)
        ? parsed.extensions.map((x: any) => String(x)).filter((x: string) => /^\d+$/.test(x))
        : [];
      def.agents = exts.map((ext: string) => ({
        id: `pbx-${ext}`,
        source: 'pbx' as const,
        extension: ext,
        geminiSocketUrl: gem,
        enabled: true,
      }));
      return def;
    }
    return parsed as SipAiConfigV2;
  }

  get(): SipAiConfigV2 {
    if (!fs.existsSync(this.cfgPath)) return this.defaultCfg();
    try {
      const raw = fs.readFileSync(this.cfgPath, 'utf8');
      const parsed: any = JSON.parse(raw || '{}');
      const migrated = this.migrateIfNeeded(parsed);
      return this.normalize({
        defaults: migrated?.defaults as any,
        agents: migrated?.agents as any,
      });
    } catch {
      return this.defaultCfg();
    }
  }

  update(input: Partial<SipAiConfigV2>) {
    const cur = this.get();
    const merged: SipAiConfigV2 = {
      defaults: { ...(cur.defaults as any), ...((input as any).defaults ?? {}) },
      agents: (input as any).agents ?? cur.agents,
    };
    const next = this.normalize(merged);
    fs.mkdirSync(path.dirname(this.cfgPath), { recursive: true });
    const content = JSON.stringify(next, null, 2) + '\n';
    const tmp = this.cfgPath + '.tmp';
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, this.cfgPath);
    return { ok: true as const, config: next };
  }
}


