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
exports.TrunksService = void 0;
const common_1 = require("@nestjs/common");
const files_service_1 = require("../../files/files.service");
const xml_1 = require("../xml");
const pbx_meta_service_1 = require("../meta/pbx-meta.service");
const dialplan_service_1 = require("../dialplan/dialplan.service");
const TRUNK_DIR = 'sip_profiles/external';
let TrunksService = class TrunksService {
    files;
    meta;
    dialplan;
    constructor(files, meta, dialplan) {
        this.files = files;
        this.meta = meta;
        this.dialplan = dialplan;
    }
    list() {
        const m = this.meta.get().meta;
        const files = this.files.listFiles(TRUNK_DIR, { extensions: ['.xml'] });
        return files
            .map((f) => this.tryGetByPath(f.path, m))
            .filter((t) => Boolean(t))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
    get(name) {
        this.assertName(name);
        const m = this.meta.get().meta;
        return this.getByPath(`${TRUNK_DIR}/${name}.xml`, m);
    }
    upsert(input) {
        this.assertName(input.name);
        const filePath = `${TRUNK_DIR}/${input.name}.xml`;
        const xml = this.render(input);
        const res = this.files.writeFile({ path: filePath, content: xml, etag: input.etag });
        if (input.inboundDestination || input.outgoingDefault || input.prefixRules) {
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
    delete(name, etag) {
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
    getByPath(filePath, meta) {
        const read = this.files.readFile(filePath);
        const obj = xml_1.xmlParser.parse(read.content);
        const include = obj?.include ?? obj?.['include'];
        const gw = include?.gateway;
        const gateway = Array.isArray(gw) ? gw[0] : gw;
        const name = String(gateway?.['@_name'] ?? '');
        if (!name)
            throw new common_1.BadRequestException(`Invalid trunk file: ${filePath}`);
        const params = (0, xml_1.asArray)(gateway?.param);
        const get = (paramName) => params.find((p) => p?.['@_name'] === paramName)?.['@_value'];
        const trunk = {
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
            trunk.inboundDestination = m.inboundDestination;
            trunk.outgoingDefault = m.outgoingDefault;
            trunk.prefixRules = m.prefixRules ?? [];
        }
        return trunk;
    }
    tryGetByPath(filePath, meta) {
        try {
            return this.getByPath(filePath, meta);
        }
        catch {
            return null;
        }
    }
    assertName(name) {
        if (!/^[a-zA-Z0-9_-]+$/.test(name))
            throw new common_1.BadRequestException('Invalid trunk name');
    }
    render(t) {
        const lines = [];
        const push = (n, v) => {
            if (v == null || v === '')
                return;
            lines.push(`        <param name="${escapeXml(n)}" value="${escapeXml(v)}"/>`);
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
};
exports.TrunksService = TrunksService;
exports.TrunksService = TrunksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [files_service_1.FilesService,
        pbx_meta_service_1.PbxMetaService,
        dialplan_service_1.DialplanService])
], TrunksService);
function escapeXml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
//# sourceMappingURL=trunks.service.js.map