import { BadRequestException, Injectable } from '@nestjs/common';
import { FilesService } from '../../files/files.service';
import { asArray, xmlParser } from '../xml';
import {
  TimeCondition,
  TimeConditionDestination,
} from './time-conditions.types';

const TC_PATH = 'dialplan/default/99_time_conditions.xml';

@Injectable()
export class TimeConditionsService {
  constructor(private readonly files: FilesService) {}

  list() {
    // ensure file exists
    let etag = '';
    let content = '';
    try {
      const read = this.files.readFile(TC_PATH);
      etag = read.etag;
      content = read.content;
    } catch {
      const xml = this.render([]);
      this.files.writeFile({ path: TC_PATH, content: xml });
      const read = this.files.readFile(TC_PATH);
      etag = read.etag;
      content = read.content;
    }

    const obj: any = xmlParser.parse(content);
    const include = obj?.include;
    // This file is included into <context name="default"> via dialplan/default.xml,
    // so it contains <extension> nodes directly (no nested <context> wrapper).
    const exts = asArray(include?.extension);

    const items: TimeCondition[] = exts.map((ext: any) => {
      const name = String(ext?.['@_name'] ?? '');
      const c1 = asArray(ext?.condition)[0];
      const dnExpr = String(c1?.['@_expression'] ?? '');
      const extensionNumber = dnExpr
        .replace(/^\^?/, '')
        .replace(/\$?$/, '')
        .replace(/\$$/, '')
        .replace(/\^|\$/g, '');

      const nested = asArray(c1?.condition);
      const dayCond = nested.find((c: any) =>
        String(c?.['@_field'] ?? '').includes('strftime(%u)'),
      );
      const hourCond = nested.find((c: any) =>
        String(c?.['@_field'] ?? '').includes('strftime(%H)'),
      );

      const days = parseNumberAlternation(dayCond?.['@_expression']);
      const hours = parseNumberAlternation(hourCond?.['@_expression']);
      const { startHour, endHour } = inferHourRange(hours);

      const action = asArray(hourCond?.action)[0];
      const anti = asArray(hourCond?.['anti-action'])[0];

      return {
        name,
        extensionNumber,
        days,
        startHour,
        endHour,
        onMatch: parseDestination(action),
        onElse: parseDestination(anti),
      };
    });

    return { etag, items };
  }

  upsert(input: TimeCondition & { etag: string }) {
    const read = this.files.readFile(TC_PATH);
    const obj: any = xmlParser.parse(read.content);
    const include = obj?.include;
    const exts = asArray(include?.extension);

    const nextExts = exts.filter(
      (e: any) => String(e?.['@_name'] ?? '') !== input.name,
    );
    nextExts.push(this.buildExtension(input));

    const out = this.render(nextExts);
    return this.files.writeFile({
      path: TC_PATH,
      content: out,
      etag: input.etag ?? read.etag,
    });
  }

  delete(name: string, etag: string) {
    const read = this.files.readFile(TC_PATH);
    const obj: any = xmlParser.parse(read.content);
    const include = obj?.include;
    const exts = asArray(include?.extension).filter(
      (e: any) => String(e?.['@_name'] ?? '') !== name,
    );
    const out = this.render(exts);
    return this.files.writeFile({
      path: TC_PATH,
      content: out,
      etag: etag ?? read.etag,
    });
  }

  private buildExtension(tc: TimeCondition) {
    if (!/^\d+$/.test(tc.extensionNumber))
      throw new BadRequestException('Invalid extensionNumber');
    const daysExpr = buildAlternation(tc.days.map((d) => String(d)));
    const hours = hourList(tc.startHour, tc.endHour).map((h) =>
      String(h).padStart(2, '0'),
    );
    const hoursExpr = buildAlternation(hours);

    const matchAction = buildAction(tc.onMatch);
    const elseAction = buildAction(tc.onElse, true);

    return {
      '@_name': tc.name,
      condition: {
        '@_field': 'destination_number',
        '@_expression': `^${tc.extensionNumber}$`,
        condition: [
          {
            '@_field': '${strftime(%u)}',
            '@_expression': `^${daysExpr}$`,
          },
          {
            '@_field': '${strftime(%H)}',
            '@_expression': `^${hoursExpr}$`,
            action: matchAction,
            'anti-action': elseAction,
          },
        ],
      },
    };
  }

  private render(extNodes: any[]) {
    const extensionsXml = extNodes
      .map((e) => this.renderExtension(e))
      .join('\n');
    return (
      `<include>\n` +
      `  <!-- Included into default context via dialplan/default.xml -->\n` +
      `${extensionsXml}\n` +
      `</include>\n`
    );
  }

  private renderExtension(e: any) {
    const name = esc(e['@_name']);
    const c1 = e.condition;
    const dnExpr = esc(c1['@_expression']);
    const nested = asArray(c1.condition);
    const day = nested.find((c: any) =>
      String(c['@_field']).includes('strftime(%u)'),
    );
    const hour = nested.find((c: any) =>
      String(c['@_field']).includes('strftime(%H)'),
    );

    const dayExpr = esc(day['@_expression']);
    const hourExpr = esc(hour['@_expression']);
    const action = asArray(hour.action)[0];
    const anti = asArray(hour['anti-action'])[0];

    return (
      `    <extension name="${name}">\n` +
      `      <condition field="destination_number" expression="${dnExpr}">\n` +
      `        <condition field="${'$'}{strftime(%u)}" expression="${dayExpr}"/>\n` +
      `        <condition field="${'$'}{strftime(%H)}" expression="${hourExpr}">\n` +
      renderActionXml(action, 'action') +
      renderActionXml(anti, 'anti-action') +
      `        </condition>\n` +
      `      </condition>\n` +
      `    </extension>`
    );
  }
}

function buildAction(dest: TimeConditionDestination, anti = false) {
  if (dest.type === 'transfer') {
    const target = String(dest.target ?? '').trim();
    if (!/^\d+\s+XML\s+\w+$/.test(target)) {
      throw new BadRequestException(
        `Invalid transfer target "${target}". Expected format like "1001 XML default".`,
      );
    }
    return { '@_application': 'transfer', '@_data': target };
  }
  if (dest.type === 'ivr') {
    const target = String(dest.target ?? '').trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(target)) {
      throw new BadRequestException(`Invalid IVR target "${target}".`);
    }
    return { '@_application': 'ivr', '@_data': target };
  }
  if (dest.type === 'queue') {
    const target = String(dest.target ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+$/.test(target)) {
      throw new BadRequestException(
        `Invalid queue target "${target}". Expected format like "queue1@default".`,
      );
    }
    return { '@_application': 'callcenter', '@_data': target };
  }
  if (anti) return { '@_application': 'hangup', '@_data': 'NORMAL_CLEARING' };
  return { '@_application': 'hangup', '@_data': 'NORMAL_CLEARING' };
}

function parseDestination(node: any): TimeConditionDestination {
  const app = String(node?.['@_application'] ?? 'transfer');
  const data = String(node?.['@_data'] ?? '');
  if (app === 'ivr') return { type: 'ivr', target: data };
  if (app === 'callcenter') return { type: 'queue', target: data };
  return { type: 'transfer', target: data };
}

function renderActionXml(node: any, tag: 'action' | 'anti-action') {
  const app = esc(String(node?.['@_application'] ?? 'hangup'));
  const data = esc(String(node?.['@_data'] ?? ''));
  return `          <${tag} application="${app}" data="${data}"/>\n`;
}

function buildAlternation(parts: string[]) {
  const uniq = [...new Set(parts.filter(Boolean))];
  return uniq.length === 1 ? uniq[0] : `(${uniq.join('|')})`;
}

function hourList(start: number, end: number) {
  const out: number[] = [];
  if (start <= end) {
    for (let h = start; h <= end; h++) out.push(h);
  } else {
    for (let h = start; h <= 23; h++) out.push(h);
    for (let h = 0; h <= end; h++) out.push(h);
  }
  return out;
}

function parseNumberAlternation(expr: any): number[] {
  const s = String(expr ?? '')
    .replace(/^\^/, '')
    .replace(/\$$/, '')
    .replace(/[()]/g, '');
  if (!s) return [];
  return s
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
}

function inferHourRange(hours: number[]) {
  if (!hours.length) return { startHour: 9, endHour: 17 };
  const sorted = [...hours].sort((a, b) => a - b);
  return { startHour: sorted[0], endHour: sorted[sorted.length - 1] };
}

function esc(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
