import { BadRequestException, Injectable } from '@nestjs/common';
import { FilesService } from '../../files/files.service';
import { asArray, xmlParser } from '../xml';
import { Extension } from './extensions.types';
import { DialplanService } from '../dialplan/dialplan.service';
import { PbxMetaService } from '../meta/pbx-meta.service';

const EXT_DIR = 'directory/default';

@Injectable()
export class ExtensionsService {
  constructor(
    private readonly files: FilesService,
    private readonly dialplan: DialplanService,
    private readonly meta: PbxMetaService,
  ) {}

  list(): Extension[] {
    const files = this.files.listFiles(EXT_DIR, {
      regex: /^\d+\.xml$/i,
      extensions: ['.xml'],
    });
    return files
      .map((f: { name: string; path: string }) => this.getByPath(f.path))
      .sort((a, b) => Number(a.id) - Number(b.id));
  }

  get(id: string) {
    if (!/^\d+$/.test(id))
      throw new BadRequestException('Invalid extension id');
    const filePath = `${EXT_DIR}/${id}.xml`;
    return this.getByPath(filePath);
  }

  private getByPath(filePath: string): Extension {
    const read = this.files.readFile(filePath);
    const obj: any = xmlParser.parse(read.content);

    // expected: <include><user id="1000"><params>...<param .../></params><variables>...</variables></user></include>
    const include = obj?.include ?? obj?.['include'];
    const user = include?.user;
    const userNode = Array.isArray(user) ? user[0] : user;
    const id = String(userNode?.['@_id'] ?? '');
    if (!id)
      throw new BadRequestException(`Invalid extension file: ${filePath}`);

    const params = asArray(userNode?.params?.param);
    const variables = asArray(userNode?.variables?.variable);
    const getParam = (name: string) =>
      params.find((p: any) => p?.['@_name'] === name)?.['@_value'] ?? '';
    const getVar = (name: string) =>
      variables.find((v: any) => v?.['@_name'] === name)?.['@_value'] ?? '';

    return {
      id,
      filePath,
      password: String(getParam('password') ?? ''),
      userContext: String(getVar('user_context') ?? 'default'),
      callerIdName: String(
        getVar('effective_caller_id_name') ?? `Extension ${id}`,
      ),
      callerIdNumber: String(getVar('effective_caller_id_number') ?? id),
      callgroup: getVar('callgroup') ? String(getVar('callgroup')) : undefined,
      outgoingSound: getVar('adminpanel_outgoing_sound')
        ? String(getVar('adminpanel_outgoing_sound'))
        : undefined,
      outgoingIvr: getVar('adminpanel_outgoing_ivr')
        ? String(getVar('adminpanel_outgoing_ivr'))
        : undefined,
      forwardMobile: getVar('adminpanel_forward_mobile')
        ? String(getVar('adminpanel_forward_mobile'))
        : undefined,
      aiEnabled:
        String(getVar('adminpanel_ai_enabled') ?? 'false') === 'true'
          ? true
          : undefined,
      aiServiceId: getVar('adminpanel_ai_service_id')
        ? String(getVar('adminpanel_ai_service_id'))
        : undefined,
    };
  }

  upsert(input: {
    id: string;
    password: string;
    userContext: string;
    callerIdName: string;
    callerIdNumber: string;
    callgroup?: string;
    outgoingSound?: string;
    outgoingIvr?: string;
    forwardMobile?: string;
    aiEnabled?: boolean;
    aiServiceId?: string;
    etag?: string;
  }) {
    const id = input.id;
    if (!/^\d+$/.test(id))
      throw new BadRequestException('Invalid extension id');
    const filePath = `${EXT_DIR}/${id}.xml`;

    if (input.aiEnabled) {
      const m = this.meta.get().meta;
      const hasService = (m.aiServices ?? []).some(
        (s: any) => s && s.enabled !== false && s.socketUrl,
      );
      if (!hasService) {
        throw new BadRequestException(
          'No AI services configured. Add at least one AI service first.',
        );
      }
    }

    const xml = this.render({
      id,
      password: input.password,
      userContext: input.userContext,
      callerIdName: input.callerIdName,
      callerIdNumber: input.callerIdNumber,
      callgroup: input.callgroup,
      outgoingSound: input.outgoingSound,
      outgoingIvr: input.outgoingIvr,
      forwardMobile: input.forwardMobile,
      aiEnabled: input.aiEnabled,
      aiServiceId: input.aiServiceId,
    });

    const res = this.files.writeFile({
      path: filePath,
      content: xml,
      etag: input.etag,
    });

    // regenerate extension dialplan (AI + mobile forward)
    try {
      const list = this.list();
      if (this.dialplan?.ensureDefaultIncludesDirEarly)
        this.dialplan.ensureDefaultIncludesDirEarly();
      if (this.dialplan?.writeExtensionsSpecial) {
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
      }
    } catch {
      // best-effort; do not fail the save if dialplan regeneration fails
    }

    return res;
  }

  delete(id: string, etag?: string) {
    if (!/^\d+$/.test(id))
      throw new BadRequestException('Invalid extension id');
    const filePath = `${EXT_DIR}/${id}.xml`;
    const res = this.files.deleteFile(filePath, etag);
    try {
      const list = this.list();
      if (this.dialplan?.ensureDefaultIncludesDirEarly)
        this.dialplan.ensureDefaultIncludesDirEarly();
      if (this.dialplan?.writeExtensionsSpecial) {
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
      }
    } catch {
      // ignore
    }
    return res;
  }

  private render(e: {
    id: string;
    password: string;
    userContext: string;
    callerIdName: string;
    callerIdNumber: string;
    callgroup?: string;
    outgoingSound?: string;
    outgoingIvr?: string;
    forwardMobile?: string;
    aiEnabled?: boolean;
    aiServiceId?: string;
  }) {
    const callgroupLine = e.callgroup
      ? `      <variable name="callgroup" value="${escapeXml(e.callgroup)}"/>\n`
      : '';

    const outgoingSoundLine = e.outgoingSound
      ? `      <variable name="adminpanel_outgoing_sound" value="${escapeXml(e.outgoingSound)}"/>\n`
      : '';

    const outgoingIvrLine = e.outgoingIvr
      ? `      <variable name="adminpanel_outgoing_ivr" value="${escapeXml(e.outgoingIvr)}"/>\n`
      : '';

    const forwardMobileLine = e.forwardMobile
      ? `      <variable name="adminpanel_forward_mobile" value="${escapeXml(e.forwardMobile)}"/>\n`
      : '';

    const aiEnabledLine = e.aiEnabled
      ? `      <variable name="adminpanel_ai_enabled" value="true"/>\n`
      : '';

    const aiServiceIdLine = e.aiServiceId
      ? `      <variable name="adminpanel_ai_service_id" value="${escapeXml(e.aiServiceId)}"/>\n`
      : '';

    return (
      `<include>\n` +
      `  <user id="${escapeXml(e.id)}">\n` +
      `    <params>\n` +
      `      <param name="password" value="${escapeXml(e.password)}"/>\n` +
      `    </params>\n` +
      `    <variables>\n` +
      `      <variable name="toll_allow" value="domestic,international,local"/>\n` +
      `      <variable name="accountcode" value="${escapeXml(e.id)}"/>\n` +
      `      <variable name="user_context" value="${escapeXml(e.userContext)}"/>\n` +
      `      <variable name="effective_caller_id_name" value="${escapeXml(e.callerIdName)}"/>\n` +
      `      <variable name="effective_caller_id_number" value="${escapeXml(e.callerIdNumber)}"/>\n` +
      `      <variable name="outbound_caller_id_name" value="$${'{'}{outbound_caller_name}"/>\n` +
      `      <variable name="outbound_caller_id_number" value="$${'{'}{outbound_caller_id}"/>\n` +
      callgroupLine +
      outgoingSoundLine +
      outgoingIvrLine +
      forwardMobileLine +
      aiEnabledLine +
      aiServiceIdLine +
      `    </variables>\n` +
      `  </user>\n` +
      `</include>\n`
    );
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
