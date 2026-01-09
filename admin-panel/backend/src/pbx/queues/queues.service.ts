import { BadRequestException, Injectable } from '@nestjs/common';
import { FilesService } from '../../files/files.service';
import { asArray, xmlParser } from '../xml';
import {
  CallcenterAgent,
  CallcenterQueue,
  CallcenterTier,
} from './queues.types';
import { PbxMetaService } from '../meta/pbx-meta.service';
import { DialplanService } from '../dialplan/dialplan.service';

const CALLCENTER_PATH = 'autoload_configs/callcenter.conf.xml';

@Injectable()
export class QueuesService {
  constructor(
    private readonly files: FilesService,
    private readonly meta: PbxMetaService,
    private readonly dialplan: DialplanService,
  ) {}

  getConfig() {
    const read = this.files.readFile(CALLCENTER_PATH);
    const obj: any = xmlParser.parse(read.content);
    const cfg = obj?.configuration;
    if (!cfg) throw new BadRequestException('Invalid callcenter.conf.xml');

    const m = this.meta.get().meta;

    const queues = asArray(cfg?.queues?.queue).map(
      (q: any): CallcenterQueue => {
        const name = String(q?.['@_name'] ?? '');
        const params = asArray(q?.param);
        const get = (n: string) =>
          params.find((p: any) => p?.['@_name'] === n)?.['@_value'];
        const meta = m.queues?.[name] ?? {};
        return {
          name,
          strategy: get('strategy'),
          mohSound: get('moh-sound'),
          maxWaitTime: get('max-wait-time'),
          discardAbandonedAfter: get('discard-abandoned-after'),
          extensionNumber: meta.extensionNumber,
          timeoutDestination: meta.timeoutDestination,
        };
      },
    );

    const agents = asArray(cfg?.agents?.agent).map(
      (a: any): CallcenterAgent => ({
        name: String(a?.['@_name'] ?? ''),
        contact: String(a?.['@_contact'] ?? ''),
        type: a?.['@_type'] ? String(a['@_type']) : undefined,
        status: a?.['@_status'] ? String(a['@_status']) : undefined,
      }),
    );

    const tiers = asArray(cfg?.tiers?.tier).map(
      (t: any): CallcenterTier => ({
        queue: String(t?.['@_queue'] ?? ''),
        agent: String(t?.['@_agent'] ?? ''),
        level: t?.['@_level'] ? String(t['@_level']) : undefined,
        position: t?.['@_position'] ? String(t['@_position']) : undefined,
      }),
    );

    return { etag: read.etag, queues, agents, tiers };
  }

  upsertQueue(input: {
    name: string;
    domain?: string;
    strategy?: string;
    mohSound?: string;
    maxWaitTime?: string;
    discardAbandonedAfter?: string;
    extensionNumber?: string;
    timeoutDestination?: any;
    agentExtensions?: string[];
    etag?: string;
  }) {
    const domain = input.domain ?? 'default';
    const fullName = `${input.name}@${domain}`;

    if (input.timeoutDestination) {
      assertQueueTimeoutDestination(input.timeoutDestination);
    }

    const read = this.files.readFile(CALLCENTER_PATH);
    const obj: any = xmlParser.parse(read.content);
    const cfg = obj?.configuration;
    if (!cfg) throw new BadRequestException('Invalid callcenter.conf.xml');

    const queues = asArray(cfg?.queues?.queue);
    let found = false;
    const newQueues = queues.map((q: any) => {
      if (String(q?.['@_name'] ?? '') !== fullName) return q;
      found = true;
      return this.buildQueueNode(fullName, input);
    });
    if (!found) newQueues.push(this.buildQueueNode(fullName, input));

    // Agents + tiers (minimal): ensure agent entries exist for each extension, and tiers map them to queue
    const agentExts = (input.agentExtensions ?? []).filter((x) =>
      /^\d+$/.test(String(x)),
    );
    const desiredAgents = agentExts.map((ext) => `${ext}@${domain}`);

    const agents = asArray(cfg?.agents?.agent);
    const existingAgentNames = new Set(
      agents.map((a: any) => String(a?.['@_name'] ?? '')),
    );
    const newAgents = [...agents];
    for (const agentName of desiredAgents) {
      if (existingAgentNames.has(agentName)) continue;
      const ext = agentName.split('@')[0];
      newAgents.push({
        '@_name': agentName,
        '@_type': 'callback',
        '@_contact': `user/${ext}@$${'{'}{domain}`,
        '@_status': 'Available',
        '@_max-no-answer': '10',
        '@_wrap-up-time': '10',
        '@_reject-delay-time': '0',
        '@_busy-delay-time': '0',
        '@_no-answer-delay-time': '0',
        '@_last-offered-call': '0',
        '@_no-answer-count': '0',
        '@_calls-waiting': '0',
        '@_talk-time': '0',
        '@_ready-time': '0',
      });
    }

    const tiers = asArray(cfg?.tiers?.tier);
    const keptTiers = tiers.filter(
      (t: any) => String(t?.['@_queue'] ?? '') !== fullName,
    );
    const newTiers = [
      ...keptTiers,
      ...desiredAgents.map((agent, idx) => ({
        '@_agent': agent,
        '@_queue': fullName,
        '@_level': '1',
        '@_position': String(idx + 1),
      })),
    ];

    const updated = this.renderCallcenter({
      settings: cfg?.settings,
      queues: newQueues,
      agents: newAgents,
      tiers: newTiers,
    });

    const res = this.files.writeFile({
      path: CALLCENTER_PATH,
      content: updated,
      etag: input.etag ?? read.etag,
    });

    // Persist admin-panel-only fields and regenerate queue dialplan.
    if (input.extensionNumber || input.timeoutDestination) {
      this.meta.upsertQueueMeta(fullName, {
        extensionNumber: input.extensionNumber,
        timeoutDestination: input.timeoutDestination,
      });
      const m = this.meta.get().meta;
      this.dialplan.ensureDefaultIncludesDirEarly();
      this.dialplan.writeQueues(m);
    }

    return res;
  }

  deleteQueue(name: string, domain?: string, etag?: string) {
    const dom = domain ?? 'default';
    const fullName = `${name}@${dom}`;
    const read = this.files.readFile(CALLCENTER_PATH);
    const obj: any = xmlParser.parse(read.content);
    const cfg = obj?.configuration;
    if (!cfg) throw new BadRequestException('Invalid callcenter.conf.xml');

    const queues = asArray(cfg?.queues?.queue).filter(
      (q: any) => String(q?.['@_name'] ?? '') !== fullName,
    );
    const tiers = asArray(cfg?.tiers?.tier).filter(
      (t: any) => String(t?.['@_queue'] ?? '') !== fullName,
    );

    const updated = this.renderCallcenter({
      settings: cfg?.settings,
      queues,
      agents: asArray(cfg?.agents?.agent),
      tiers,
    });

    const res = this.files.writeFile({
      path: CALLCENTER_PATH,
      content: updated,
      etag: etag ?? read.etag,
    });

    this.meta.deleteQueueMeta(fullName);
    const m = this.meta.get().meta;
    this.dialplan.ensureDefaultIncludesDirEarly();
    this.dialplan.writeQueues(m);

    return res;
  }

  private buildQueueNode(fullName: string, input: any) {
    const param = (n: string, v: string | undefined) =>
      v == null ? null : { '@_name': n, '@_value': v };
    const params = [
      param('strategy', input.strategy ?? 'ring-all'),
      param('moh-sound', input.mohSound ?? 'local_stream://moh'),
      param('time-base-score', 'system'),
      param('max-wait-time', input.maxWaitTime ?? '0'),
      param('max-wait-time-with-no-agent', '0'),
      param('max-wait-time-with-no-agent-time-reached', '5'),
      param('tier-rules-apply', 'false'),
      param('tier-rule-wait-second', '300'),
      param('tier-rule-wait-multiply-level', 'true'),
      param('tier-rule-no-agent-no-wait', 'false'),
      param('discard-abandoned-after', input.discardAbandonedAfter ?? '60'),
    ].filter(Boolean);

    return { '@_name': fullName, param: params };
  }

  private renderCallcenter(parts: {
    settings: any;
    queues: any[];
    agents: any[];
    tiers: any[];
  }) {
    // Render minimal but valid XML. We keep <settings> node as-is if present.
    const settingsXml = this.renderSettings(parts.settings);
    const queuesXml =
      parts.queues.map((q) => this.renderQueue(q)).join('\n') || '';
    const agentsXml =
      parts.agents.map((a) => this.renderAgent(a)).join('\n') || '';
    const tiersXml =
      parts.tiers.map((t) => this.renderTier(t)).join('\n') || '';

    return (
      `<configuration name="callcenter.conf" description="CallCenter">\n` +
      `  ${settingsXml}\n` +
      `  <queues>\n${queuesXml}\n  </queues>\n\n` +
      `  <agents>\n${agentsXml}\n  </agents>\n\n` +
      `  <tiers>\n${tiersXml}\n  </tiers>\n` +
      `</configuration>\n`
    );
  }

  private renderSettings(settings: any) {
    const params = asArray(settings?.param);
    if (params.length === 0) {
      return `<settings>\n    <param name="dbname" value="/dev/shm/callcenter.db"/>\n    <param name="cc-instance-id" value="single_box"/>\n  </settings>`;
    }
    const lines = params.map(
      (p: any) =>
        `    <param name="${esc(p['@_name'])}" value="${esc(p['@_value'])}"/>`,
    );
    return `<settings>\n${lines.join('\n')}\n  </settings>`;
  }

  private renderQueue(q: any) {
    const name = esc(q['@_name']);
    const params = asArray(q?.param).map(
      (p: any) =>
        `      <param name="${esc(p['@_name'])}" value="${esc(p['@_value'])}"/>`,
    );
    return `    <queue name="${name}">\n${params.join('\n')}\n    </queue>`;
  }

  private renderAgent(a: any) {
    const attrs = [
      ['name', a['@_name']],
      ['type', a['@_type'] ?? 'callback'],
      ['contact', a['@_contact']],
      ['status', a['@_status'] ?? 'Available'],
      ['max-no-answer', a['@_max-no-answer'] ?? '10'],
      ['wrap-up-time', a['@_wrap-up-time'] ?? '10'],
      ['reject-delay-time', a['@_reject-delay-time'] ?? '0'],
      ['busy-delay-time', a['@_busy-delay-time'] ?? '0'],
      ['no-answer-delay-time', a['@_no-answer-delay-time'] ?? '0'],
      ['last-offered-call', a['@_last-offered-call'] ?? '0'],
      ['no-answer-count', a['@_no-answer-count'] ?? '0'],
      ['calls-waiting', a['@_calls-waiting'] ?? '0'],
      ['talk-time', a['@_talk-time'] ?? '0'],
      ['ready-time', a['@_ready-time'] ?? '0'],
    ]
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}="${esc(String(v))}"`)
      .join(' ');
    return `    <agent ${attrs}/>`;
  }

  private renderTier(t: any) {
    const attrs = [
      ['agent', t['@_agent'] ?? t.agent],
      ['queue', t['@_queue'] ?? t.queue],
      ['level', t['@_level'] ?? t.level ?? '1'],
      ['position', t['@_position'] ?? t.position ?? '1'],
    ]
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}="${esc(String(v))}"`)
      .join(' ');
    return `    <tier ${attrs}/>`;
  }
}

function assertQueueTimeoutDestination(dest: any) {
  const type = String(dest?.type ?? '').trim();
  const target = String(dest?.target ?? '').trim();

  if (!type)
    throw new BadRequestException('timeoutDestination.type is required');
  if (type === 'terminate') return;

  if (type === 'extension' || type === 'timeCondition') {
    if (!/^\d+$/.test(target)) {
      throw new BadRequestException(
        `Invalid ${type} target "${target}". Expected digits only.`,
      );
    }
    return;
  }

  if (type === 'queue') {
    if (!/^[^\s@]+@[^\s@]+$/.test(target)) {
      throw new BadRequestException(
        `Invalid queue target "${target}". Expected format like "queue1@default".`,
      );
    }
    return;
  }

  if (type === 'ivr') {
    if (!/^[a-zA-Z0-9_-]+$/.test(target)) {
      throw new BadRequestException(`Invalid IVR target "${target}".`);
    }
    return;
  }

  throw new BadRequestException(`Unknown timeoutDestination.type "${type}"`);
}

function esc(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
