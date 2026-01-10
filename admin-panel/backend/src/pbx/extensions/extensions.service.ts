import { BadRequestException, Injectable } from '@nestjs/common';
import { FilesService } from '../../files/files.service';
import { asArray, xmlParser } from '../xml';
import { Extension } from './extensions.types';
import { DialplanService } from '../dialplan/dialplan.service';
import { EslService } from '../../freeswitch/esl/esl.service';

const EXT_DIR = 'directory/default';

@Injectable()
export class ExtensionsService {
  constructor(
    private readonly files: FilesService,
    private readonly dialplan: DialplanService,
    private readonly esl: EslService,
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
      outboundTrunk: getVar('adminpanel_outbound_trunk')
        ? String(getVar('adminpanel_outbound_trunk'))
        : undefined,
      forwardMobile: getVar('adminpanel_forward_mobile')
        ? String(getVar('adminpanel_forward_mobile'))
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
    outboundTrunk?: string;
    forwardMobile?: string;
    etag?: string;
  }) {
    const id = input.id;
    if (!/^\d+$/.test(id))
      throw new BadRequestException('Invalid extension id');
    const filePath = `${EXT_DIR}/${id}.xml`;

    const xml = this.render({
      id,
      password: input.password,
      userContext: input.userContext,
      callerIdName: input.callerIdName,
      callerIdNumber: input.callerIdNumber,
      callgroup: input.callgroup,
      outgoingSound: input.outgoingSound,
      outgoingIvr: input.outgoingIvr,
      outboundTrunk: input.outboundTrunk,
      forwardMobile: input.forwardMobile,
    });

    const res = this.files.writeFile({
      path: filePath,
      content: xml,
      etag: input.etag,
    });

    // regenerate extension dialplan (mobile forward)
    try {
      const list = this.list();
      if (this.dialplan?.ensureDefaultIncludesDirEarly)
        this.dialplan.ensureDefaultIncludesDirEarly();
      if (this.dialplan?.writeExtensionsSpecial) {
        this.dialplan.writeExtensionsSpecial(list);
      }
    } catch {
      // best-effort; do not fail the save if dialplan regeneration fails
    }

    // Apply changes immediately (no manual reload needed)
    void this.reloadFsBestEffort();

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
        this.dialplan.writeExtensionsSpecial(list);
      }
    } catch {
      // ignore
    }

    void this.reloadFsBestEffort();
    return res;
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

  private render(e: {
    id: string;
    password: string;
    userContext: string;
    callerIdName: string;
    callerIdNumber: string;
    callgroup?: string;
    outgoingSound?: string;
    outgoingIvr?: string;
    outboundTrunk?: string;
    forwardMobile?: string;
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

    const outboundTrunkLine = e.outboundTrunk
      ? `      <variable name="adminpanel_outbound_trunk" value="${escapeXml(e.outboundTrunk)}"/>\n`
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
      outboundTrunkLine +
      forwardMobileLine +
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
