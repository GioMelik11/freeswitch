import { BadRequestException, Injectable } from '@nestjs/common';
import { FilesService } from '../../files/files.service';
import { asArray, xmlParser } from '../xml';
import { Trunk } from './trunks.types';
import { PbxMetaService } from '../meta/pbx-meta.service';
import { DialplanService } from '../dialplan/dialplan.service';

const TRUNK_DIR = 'sip_profiles/external';

@Injectable()
export class TrunksService {
  constructor(
    private readonly files: FilesService,
    private readonly meta: PbxMetaService,
    private readonly dialplan: DialplanService,
  ) {}

  list(): Trunk[] {
    const m = this.meta.get().meta;
    const files = this.files.listFiles(TRUNK_DIR, { extensions: ['.xml'] });
    return files
      .map((f: { name: string; path: string }) => this.tryGetByPath(f.path, m))
      .filter((t): t is Trunk => Boolean(t))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get(name: string) {
    this.assertName(name);
    const m = this.meta.get().meta;
    return this.getByPath(`${TRUNK_DIR}/${name}.xml`, m);
  }

  upsert(input: {
    name: string;
    register: boolean;
    username?: string;
    password?: string;
    realm?: string;
    proxy?: string;
    fromUser?: string;
    fromDomain?: string;
    extension?: string;
    transport?: string;
    inboundDestination?: any;
    outgoingDefault?: any;
    prefixRules?: any[];
    etag?: string;
  }) {
    this.assertName(input.name);
    const filePath = `${TRUNK_DIR}/${input.name}.xml`;
    const xml = this.render(input);
    const res = this.files.writeFile({
      path: filePath,
      content: xml,
      etag: input.etag,
    });

    // Persist admin-panel-only fields and regenerate inbound dialplan.
    if (
      input.inboundDestination ||
      input.outgoingDefault ||
      input.prefixRules
    ) {
      this.meta.upsertTrunkMeta(input.name, {
        inboundDestination: input.inboundDestination,
        outgoingDefault: input.outgoingDefault,
        prefixRules: input.prefixRules,
      });
      const m = this.meta.get().meta;
      this.dialplan.ensurePublicIncludesDir();
      this.dialplan.writeTrunkInbound(m);
      this.dialplan.ensureDefaultIncludesDirEarly();
      this.dialplan.writeOutboundDefaults(m);
      this.dialplan.writeOutboundPrefixRoutes(m);
    }

    return res;
  }

  delete(name: string, etag?: string) {
    this.assertName(name);
    const filePath = `${TRUNK_DIR}/${name}.xml`;
    const res = this.files.deleteFile(filePath, etag);
    this.meta.deleteTrunkMeta(name);
    const m = this.meta.get().meta;
    this.dialplan.ensurePublicIncludesDir();
    this.dialplan.writeTrunkInbound(m);
    this.dialplan.ensureDefaultIncludesDirEarly();
    this.dialplan.writeOutboundDefaults(m);
    this.dialplan.writeOutboundPrefixRoutes(m);
    return res;
  }

  private getByPath(filePath: string, meta: any): Trunk {
    const read = this.files.readFile(filePath);
    const obj: any = xmlParser.parse(read.content);
    const include = obj?.include ?? obj?.['include'];
    const gw = include?.gateway;
    const gateway = Array.isArray(gw) ? gw[0] : gw;
    const name = String(gateway?.['@_name'] ?? '');
    if (!name) throw new BadRequestException(`Invalid trunk file: ${filePath}`);

    const params = asArray(gateway?.param);
    const get = (paramName: string) =>
      params.find((p: any) => p?.['@_name'] === paramName)?.['@_value'];

    const trunk: Trunk = {
      name,
      filePath,
      register: String(get('register') ?? 'false') === 'true',
      username: get('username'),
      password: get('password'),
      realm: get('realm'),
      proxy: get('proxy'),
      fromUser: get('from-user'),
      fromDomain: get('from-domain'),
      extension: get('extension'),
      transport: get('register-transport'),
    };

    const m = meta?.trunks?.[name];
    if (m) {
      (trunk as any).inboundDestination = m.inboundDestination;
      (trunk as any).outgoingDefault = m.outgoingDefault;
      (trunk as any).prefixRules = m.prefixRules ?? [];
    }

    return trunk;
  }

  private tryGetByPath(filePath: string, meta: any): Trunk | null {
    try {
      return this.getByPath(filePath, meta);
    } catch {
      // Some shipped files (e.g. sip_profiles/external/example.xml) are templates with commented gateways.
      // Skip them so one bad file doesn't break the whole Trunks page.
      return null;
    }
  }

  private assertName(name: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(name))
      throw new BadRequestException('Invalid trunk name');
  }

  private render(t: {
    name: string;
    register: boolean;
    username?: string;
    password?: string;
    realm?: string;
    proxy?: string;
    fromUser?: string;
    fromDomain?: string;
    extension?: string;
    transport?: string;
  }) {
    const lines: string[] = [];
    const push = (n: string, v: string | undefined) => {
      if (v == null || v === '') return;
      lines.push(
        `        <param name="${escapeXml(n)}" value="${escapeXml(v)}"/>`,
      );
    };

    lines.push('<include>');
    lines.push(`    <gateway name="${escapeXml(t.name)}">`);
    push('username', t.username);
    push('realm', t.realm);
    push('password', t.password);
    push('proxy', t.proxy);
    push('register-proxy', t.proxy);
    push('outbound-proxy', t.proxy);
    push('register', t.register ? 'true' : 'false');
    push('register-transport', t.transport ?? 'udp');
    push('retry-seconds', '30');
    push('register-timeout', '20');
    push('register-retry-timeout', '20');
    push('caller-id-in-from', 'true');
    push('extension', t.extension);
    push('from-user', t.fromUser ?? t.username);
    push('from-domain', t.fromDomain ?? t.realm ?? t.proxy);
    lines.push('    </gateway>');
    lines.push('</include>');
    lines.push('');
    return lines.join('\n');
  }
}

function escapeXml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
