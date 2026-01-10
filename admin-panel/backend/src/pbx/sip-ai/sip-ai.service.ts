import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type SipAiConfig = {
  geminiSocketUrl: string;
  extensions: string[];
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

  private defaultCfg(): SipAiConfig {
    return { geminiSocketUrl: '', extensions: [] };
  }

  get(): SipAiConfig {
    if (!fs.existsSync(this.cfgPath)) return this.defaultCfg();
    try {
      const raw = fs.readFileSync(this.cfgPath, 'utf8');
      const parsed: any = JSON.parse(raw || '{}');
      return {
        geminiSocketUrl: String(parsed?.geminiSocketUrl ?? '').trim(),
        extensions: Array.isArray(parsed?.extensions)
          ? parsed.extensions.map((x: any) => String(x)).filter((x: string) => /^\d+$/.test(x))
          : [],
      };
    } catch {
      return this.defaultCfg();
    }
  }

  update(input: { geminiSocketUrl?: string; extensions?: string[] }) {
    const cur = this.get();
    const next: SipAiConfig = {
      geminiSocketUrl:
        input.geminiSocketUrl !== undefined
          ? String(input.geminiSocketUrl ?? '').trim()
          : cur.geminiSocketUrl,
      extensions:
        input.extensions !== undefined
          ? [...new Set((input.extensions ?? []).map((x) => String(x)).filter((x) => /^\d+$/.test(x)))]
          : cur.extensions,
    };

    if (next.geminiSocketUrl && !/^wss?:\/\//i.test(next.geminiSocketUrl)) {
      throw new BadRequestException('geminiSocketUrl must start with ws:// or wss://');
    }

    fs.mkdirSync(path.dirname(this.cfgPath), { recursive: true });
    const content = JSON.stringify(next, null, 2) + '\n';
    const tmp = this.cfgPath + '.tmp';
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, this.cfgPath);
    return { ok: true as const, config: next };
  }
}


