import { BadRequestException, Injectable } from '@nestjs/common';
import { FilesService } from '../../files/files.service';
import { asArray, xmlParser } from '../xml';
import { IvrMenu } from './ivr.types';

const IVR_CONF_PATH = 'autoload_configs/ivr.conf.xml';

@Injectable()
export class IvrService {
  constructor(private readonly files: FilesService) {}

  private normalizeSoundPath(v: any) {
    const s = String(v ?? '');
    const prefix = '/usr/share/freeswitch/sounds/';
    return s.startsWith(prefix) ? s.slice(prefix.length) : s;
  }

  list() {
    const read = this.files.readFile(IVR_CONF_PATH);
    const obj: any = xmlParser.parse(read.content);
    const cfg = obj?.configuration;
    if (!cfg) throw new BadRequestException('Invalid ivr.conf.xml');
    const menus = asArray(cfg?.menus?.menu).map((m: any) => this.mapMenu(m));
    return { etag: read.etag, menus };
  }

  upsert(input: any) {
    const read = this.files.readFile(IVR_CONF_PATH);
    const obj: any = xmlParser.parse(read.content);
    const cfg = obj?.configuration;
    if (!cfg) throw new BadRequestException('Invalid ivr.conf.xml');

    const menus = asArray(cfg?.menus?.menu);
    const renderedMenu = this.buildMenuNode(input);

    let found = false;
    const nextMenus = menus.map((m: any) => {
      if (String(m?.['@_name'] ?? '') !== input.name) return m;
      found = true;
      return renderedMenu;
    });
    if (!found) nextMenus.push(renderedMenu);

    const xml = this.renderIvrConf(nextMenus);
    return this.files.writeFile({
      path: IVR_CONF_PATH,
      content: xml,
      etag: input.etag ?? read.etag,
    });
  }

  delete(name: string, etag?: string) {
    const read = this.files.readFile(IVR_CONF_PATH);
    const obj: any = xmlParser.parse(read.content);
    const cfg = obj?.configuration;
    if (!cfg) throw new BadRequestException('Invalid ivr.conf.xml');
    const menus = asArray(cfg?.menus?.menu).filter(
      (m: any) => String(m?.['@_name'] ?? '') !== name,
    );
    const xml = this.renderIvrConf(menus);
    return this.files.writeFile({
      path: IVR_CONF_PATH,
      content: xml,
      etag: etag ?? read.etag,
    });
  }

  private mapMenu(m: any): IvrMenu {
    const attrs = m ?? {};
    const entries = asArray(m?.entry).map((e: any) => {
      const digits = String(e?.['@_digits'] ?? '');
      const action = String(e?.['@_action'] ?? 'menu-exec-app');
      const param = String(e?.['@_param'] ?? '');

      // Our structured mapping is best-effort
      if (action === 'menu-exec-app' && param.startsWith('transfer ')) {
        return {
          digits,
          type: 'transfer' as const,
          target: param.replace(/^transfer\s+/, ''),
        };
      }
      if (action === 'menu-exec-app' && param.startsWith('callcenter ')) {
        return {
          digits,
          type: 'queue' as const,
          target: param.replace(/^callcenter\s+/, ''),
        };
      }
      if (action === 'menu-sub') {
        return { digits, type: 'ivr' as const, target: param };
      }
      return {
        digits,
        type: 'app' as const,
        target: `${action} ${param}`.trim(),
      };
    });

    return {
      name: String(attrs['@_name'] ?? ''),
      greetLong: this.normalizeSoundPath(attrs['@_greet-long']),
      greetShort: this.normalizeSoundPath(attrs['@_greet-short']),
      invalidSound: this.normalizeSoundPath(attrs['@_invalid-sound']),
      exitSound: this.normalizeSoundPath(attrs['@_exit-sound']),
      timeout: attrs['@_timeout'],
      interDigitTimeout: attrs['@_inter-digit-timeout'],
      maxFailures: attrs['@_max-failures'],
      maxTimeouts: attrs['@_max-timeouts'],
      digitLen: attrs['@_digit-len'],
      entries,
    };
  }

  private buildMenuNode(input: any) {
    const attr: any = {
      '@_name': input.name,
    };
    const set = (k: string, v: string | undefined) => {
      if (v == null || v === '') return;
      attr[`@_${k}`] = v;
    };

    set('greet-long', this.normalizeSoundPath(input.greetLong));
    set('greet-short', this.normalizeSoundPath(input.greetShort));
    set('invalid-sound', this.normalizeSoundPath(input.invalidSound));
    set('exit-sound', this.normalizeSoundPath(input.exitSound));
    set('timeout', input.timeout ?? '15000');
    set('inter-digit-timeout', input.interDigitTimeout ?? '3000');
    set('max-failures', input.maxFailures ?? '3');
    set('max-timeouts', input.maxTimeouts ?? '3');
    set('digit-len', input.digitLen ?? '1');

    const entry = (input.entries ?? []).map((e: any) => {
      const digits = String(e.digits ?? '');
      const type = e.type;

      if (!/^\d+$/.test(digits)) {
        throw new BadRequestException(
          `Invalid DTMF digits "${digits}". Digits must be numeric.`,
        );
      }
      const digitLen = String(
        input.digitLen ?? attr['@_digit-len'] ?? '1',
      ).trim();
      if (/^\d+$/.test(digitLen) && digits.length !== Number(digitLen)) {
        throw new BadRequestException(
          `DTMF "${digits}" must be length ${digitLen}.`,
        );
      }

      if (type === 'transfer') {
        const target = String(e.target ?? '').trim();
        if (!/^\d+\s+XML\s+\w+$/.test(target)) {
          throw new BadRequestException(
            `Invalid transfer target "${target}". Expected format like "1001 XML default".`,
          );
        }
        return {
          '@_action': 'menu-exec-app',
          '@_digits': digits,
          '@_param': `transfer ${target}`,
        };
      }
      if (type === 'queue') {
        // target should be queue name like queue1@default
        const target = String(e.target ?? '').trim();
        if (!/^[^\s@]+@[^\s@]+$/.test(target)) {
          throw new BadRequestException(
            `Invalid queue target "${target}". Expected format like "queue1@default".`,
          );
        }
        return {
          '@_action': 'menu-exec-app',
          '@_digits': digits,
          '@_param': `callcenter ${target}`,
        };
      }
      if (type === 'ivr') {
        const target = String(e.target ?? '').trim();
        if (!/^[a-zA-Z0-9_-]+$/.test(target)) {
          throw new BadRequestException(
            `Invalid IVR submenu target "${target}".`,
          );
        }
        return {
          '@_action': 'menu-sub',
          '@_digits': digits,
          '@_param': target,
        };
      }
      // raw app line: "menu-exec-app transfer 2000 XML default" etc
      const raw = String(e.target ?? '');
      const [action, ...rest] = raw.split(' ');
      return {
        '@_action': action || 'menu-exec-app',
        '@_digits': digits,
        '@_param': rest.join(' '),
      };
    });

    return { ...attr, entry };
  }

  private renderIvrConf(menus: any[]) {
    const menuXml = menus.map((m) => this.renderMenu(m)).join('\n');
    return (
      `<configuration name="ivr.conf" description="IVR menus">\n` +
      `  <menus>\n` +
      `${menuXml}\n` +
      `  </menus>\n` +
      `</configuration>\n`
    );
  }

  private renderMenu(m: any) {
    const attrs = Object.entries(m)
      .filter(([k]) => k.startsWith('@_'))
      .map(([k, v]) => `${k.substring(2)}="${esc(String(v))}"`)
      .join(' ');

    const entries = asArray(m.entry).map((e: any) => {
      const a = esc(String(e['@_action'] ?? 'menu-exec-app'));
      const d = esc(String(e['@_digits'] ?? ''));
      const p = esc(String(e['@_param'] ?? ''));
      return `    <entry action="${a}" digits="${d}" param="${p}"/>`;
    });

    return `    <menu ${attrs}>\n${entries.join('\n')}\n    </menu>`;
  }
}

function esc(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
