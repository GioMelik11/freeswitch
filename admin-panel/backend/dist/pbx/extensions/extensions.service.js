"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionsService = void 0;
const common_1 = require("@nestjs/common");
const files_service_1 = require("../../files/files.service");
const xml_1 = require("../xml");
const dialplan_service_1 = require("../dialplan/dialplan.service");
const pbx_meta_service_1 = require("../meta/pbx-meta.service");
const esl_service_1 = require("../../freeswitch/esl/esl.service");
const EXT_DIR = 'directory/default';
let ExtensionsService = class ExtensionsService {
    files;
    dialplan;
    meta;
    esl;
    constructor(files, dialplan, meta, esl) {
        this.files = files;
        this.dialplan = dialplan;
        this.meta = meta;
        this.esl = esl;
    }
    list() {
        const files = this.files.listFiles(EXT_DIR, {
            regex: /^\d+\.xml$/i,
            extensions: ['.xml'],
        });
        return files
            .map((f) => this.getByPath(f.path))
            .sort((a, b) => Number(a.id) - Number(b.id));
    }
    get(id) {
        if (!/^\d+$/.test(id))
            throw new common_1.BadRequestException('Invalid extension id');
        const filePath = `${EXT_DIR}/${id}.xml`;
        return this.getByPath(filePath);
    }
    getByPath(filePath) {
        const read = this.files.readFile(filePath);
        const obj = xml_1.xmlParser.parse(read.content);
        const include = obj?.include ?? obj?.['include'];
        const user = include?.user;
        const userNode = Array.isArray(user) ? user[0] : user;
        const id = String(userNode?.['@_id'] ?? '');
        if (!id)
            throw new common_1.BadRequestException(`Invalid extension file: ${filePath}`);
        const params = (0, xml_1.asArray)(userNode?.params?.param);
        const variables = (0, xml_1.asArray)(userNode?.variables?.variable);
        const getParam = (name) => params.find((p) => p?.['@_name'] === name)?.['@_value'] ?? '';
        const getVar = (name) => variables.find((v) => v?.['@_name'] === name)?.['@_value'] ?? '';
        return {
            id,
            filePath,
            password: String(getParam('password') ?? ''),
            userContext: String(getVar('user_context') ?? 'default'),
            callerIdName: String(getVar('effective_caller_id_name') ?? `Extension ${id}`),
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
            aiEnabled: String(getVar('adminpanel_ai_enabled') ?? 'false') === 'true'
                ? true
                : undefined,
            aiServiceId: getVar('adminpanel_ai_service_id')
                ? String(getVar('adminpanel_ai_service_id'))
                : undefined,
        };
    }
    upsert(input) {
        const id = input.id;
        if (!/^\d+$/.test(id))
            throw new common_1.BadRequestException('Invalid extension id');
        const filePath = `${EXT_DIR}/${id}.xml`;
        if (input.aiEnabled) {
            const m = this.meta.get().meta;
            const hasService = (m.aiServices ?? []).some((s) => s && s.enabled !== false && s.socketUrl);
            if (!hasService) {
                throw new common_1.BadRequestException('No AI services configured. Add at least one AI service first.');
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
            outboundTrunk: input.outboundTrunk,
            forwardMobile: input.forwardMobile,
            aiEnabled: input.aiEnabled,
            aiServiceId: input.aiServiceId,
        });
        const res = this.files.writeFile({
            path: filePath,
            content: xml,
            etag: input.etag,
        });
        try {
            const list = this.list();
            if (this.dialplan?.ensureDefaultIncludesDirEarly)
                this.dialplan.ensureDefaultIncludesDirEarly();
            if (this.dialplan?.writeExtensionsSpecial) {
                const m = this.meta.get().meta;
                const services = new Map();
                for (const s of m.aiServices ?? []) {
                    if (s?.enabled === false)
                        continue;
                    if (!s?.id || !s?.socketUrl)
                        continue;
                    services.set(String(s.id), String(s.socketUrl));
                }
                const defaultUrl = (m.defaultAiServiceId
                    ? (services.get(String(m.defaultAiServiceId)) ?? '')
                    : '') || (services.size ? [...services.values()][0] : '');
                this.dialplan.writeExtensionsSpecial(list, { services, defaultUrl });
            }
        }
        catch {
        }
        void this.reloadFsBestEffort();
        return res;
    }
    delete(id, etag) {
        if (!/^\d+$/.test(id))
            throw new common_1.BadRequestException('Invalid extension id');
        const filePath = `${EXT_DIR}/${id}.xml`;
        const res = this.files.deleteFile(filePath, etag);
        try {
            const list = this.list();
            if (this.dialplan?.ensureDefaultIncludesDirEarly)
                this.dialplan.ensureDefaultIncludesDirEarly();
            if (this.dialplan?.writeExtensionsSpecial) {
                const m = this.meta.get().meta;
                const services = new Map();
                for (const s of m.aiServices ?? []) {
                    if (s?.enabled === false)
                        continue;
                    if (!s?.id || !s?.socketUrl)
                        continue;
                    services.set(String(s.id), String(s.socketUrl));
                }
                const defaultUrl = (m.defaultAiServiceId
                    ? (services.get(String(m.defaultAiServiceId)) ?? '')
                    : '') || (services.size ? [...services.values()][0] : '');
                this.dialplan.writeExtensionsSpecial(list, { services, defaultUrl });
            }
        }
        catch {
        }
        void this.reloadFsBestEffort();
        return res;
    }
    async reloadFsBestEffort() {
        const cmds = [
            'reloadxml',
            'sofia profile internal rescan reloadxml',
            'sofia profile external rescan reloadxml',
        ];
        for (const c of cmds) {
            try {
                await this.esl.api(c);
            }
            catch {
            }
        }
    }
    render(e) {
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
        const aiEnabledLine = e.aiEnabled
            ? `      <variable name="adminpanel_ai_enabled" value="true"/>\n`
            : '';
        const aiServiceIdLine = e.aiServiceId
            ? `      <variable name="adminpanel_ai_service_id" value="${escapeXml(e.aiServiceId)}"/>\n`
            : '';
        return (`<include>\n` +
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
            aiEnabledLine +
            aiServiceIdLine +
            `    </variables>\n` +
            `  </user>\n` +
            `</include>\n`);
    }
};
exports.ExtensionsService = ExtensionsService;
exports.ExtensionsService = ExtensionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [files_service_1.FilesService,
        dialplan_service_1.DialplanService,
        pbx_meta_service_1.PbxMetaService,
        esl_service_1.EslService])
], ExtensionsService);
function escapeXml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
//# sourceMappingURL=extensions.service.js.map