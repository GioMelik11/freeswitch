"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NatService = void 0;
const common_1 = require("@nestjs/common");
const files_service_1 = require("../../files/files.service");
const node_net_1 = require("node:net");
const os = __importStar(require("node:os"));
const VARS_PATH = 'vars.xml';
const ACL_PATH = 'autoload_configs/acl.conf.xml';
const ACL_LIST_NAME = 'adminpanel_localnet';
let NatService = class NatService {
    files;
    constructor(files) {
        this.files = files;
    }
    getSettings() {
        const read = this.files.readFile(VARS_PATH);
        const externalRtpIp = getPreProcessVar(read.content, 'external_rtp_ip') ?? '';
        const externalSipIp = getPreProcessVar(read.content, 'external_sip_ip') ?? '';
        const acl = this.ensureAclList();
        return {
            etag: read.etag,
            aclEtag: acl.etag,
            externalRtpIp,
            externalSipIp,
            localNetworks: acl.localNetworks,
        };
    }
    updateSettings(input) {
        const externalRtpIp = String(input.externalRtpIp ?? '').trim();
        const externalSipIp = String(input.externalSipIp ?? '').trim();
        if (!externalRtpIp)
            throw new common_1.BadRequestException('externalRtpIp is required');
        if (!externalSipIp)
            throw new common_1.BadRequestException('externalSipIp is required');
        if (!isValidNatValue(externalRtpIp)) {
            throw new common_1.BadRequestException('externalRtpIp must be an IP (v4/v6) or one of: auto, auto-nat');
        }
        if (!isValidNatValue(externalSipIp)) {
            throw new common_1.BadRequestException('externalSipIp must be an IP (v4/v6) or one of: auto, auto-nat');
        }
        const read = this.files.readFile(VARS_PATH);
        let next = read.content;
        next = setPreProcessVar(next, 'external_rtp_ip', externalRtpIp);
        next = setPreProcessVar(next, 'external_sip_ip', externalSipIp);
        const writeVars = this.files.writeFile({
            path: VARS_PATH,
            content: next,
            etag: input.etag ?? read.etag,
        });
        if (input.localNetworks) {
            this.writeAclList(input.localNetworks, input.aclEtag);
        }
        return writeVars;
    }
    async detect() {
        const externalAddress = await detectPublicIp();
        const localNetworks = detectLocalCidrs();
        return { externalAddress, localNetworks };
    }
    ensureAclList() {
        let read;
        try {
            read = this.files.readFile(ACL_PATH);
        }
        catch {
            throw new common_1.BadRequestException('acl.conf.xml not found');
        }
        const found = extractAclList(read.content, ACL_LIST_NAME);
        if (found) {
            return { etag: read.etag, localNetworks: found.cidrs };
        }
        const inserted = upsertAclList(read.content, ACL_LIST_NAME, [], { allowAll: true });
        this.files.writeFile({ path: ACL_PATH, content: inserted, etag: read.etag });
        const reread = this.files.readFile(ACL_PATH);
        return { etag: reread.etag, localNetworks: [] };
    }
    writeAclList(cidrs, aclEtag) {
        const normalized = normalizeCidrs(cidrs);
        const read = this.files.readFile(ACL_PATH);
        const patched = upsertAclList(read.content, ACL_LIST_NAME, normalized, {
            allowAll: normalized.length === 0,
        });
        this.files.writeFile({ path: ACL_PATH, content: patched, etag: aclEtag ?? read.etag });
    }
};
exports.NatService = NatService;
exports.NatService = NatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [files_service_1.FilesService])
], NatService);
function isValidNatValue(v) {
    const val = String(v ?? '').trim();
    if (!val)
        return false;
    const lower = val.toLowerCase();
    if (lower === 'auto' || lower === 'auto-nat')
        return true;
    return (0, node_net_1.isIP)(val) === 4 || (0, node_net_1.isIP)(val) === 6;
}
function normalizeCidrs(cidrs) {
    const out = [];
    const seen = new Set();
    for (const raw of cidrs ?? []) {
        const s = String(raw ?? '').trim();
        if (!s)
            continue;
        const parsed = parseCidrOrIp(s);
        const key = `${parsed.ip}/${parsed.mask}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(key);
    }
    return out;
}
function parseCidrOrIp(input) {
    const s = String(input ?? '').trim();
    if (!s)
        throw new common_1.BadRequestException('Invalid local network (empty)');
    const parts = s.split('/');
    const ip = parts[0]?.trim() ?? '';
    const ipVer = (0, node_net_1.isIP)(ip);
    if (ipVer !== 4 && ipVer !== 6)
        throw new common_1.BadRequestException(`Invalid local network IP: ${s}`);
    const max = ipVer === 4 ? 32 : 128;
    let mask = max;
    if (parts.length > 1) {
        const m = Number(parts[1]);
        if (!Number.isFinite(m) || m < 0 || m > max) {
            throw new common_1.BadRequestException(`Invalid local network mask: ${s}`);
        }
        mask = Math.trunc(m);
    }
    return { ip, mask };
}
function extractAclList(xml, listName) {
    const re = new RegExp(`<list\\s+name="${escapeRegExp(listName)}"\\s+default="([^"]+)"\\s*>\\s*([\\s\\S]*?)\\s*<\\/list>`, 'i');
    const m = xml.match(re);
    if (!m)
        return null;
    const def = (m[1] ?? '').trim();
    const body = m[2] ?? '';
    const cidrRe = /<node\s+[^>]*cidr="([^"]+)"[^>]*>/gi;
    const cidrs = [];
    for (;;) {
        const mm = cidrRe.exec(body);
        if (!mm)
            break;
        const v = String(mm[1] ?? '').trim();
        if (v)
            cidrs.push(v);
    }
    const normalized = cidrs.map((c) => {
        try {
            const p = parseCidrOrIp(c);
            return `${p.ip}/${p.mask}`;
        }
        catch {
            return '';
        }
    }).filter(Boolean);
    return { defaultMode: def, cidrs: normalized };
}
function upsertAclList(xml, listName, cidrs, opts) {
    const def = opts.allowAll ? 'allow' : 'deny';
    const nodes = opts.allowAll
        ? ''
        : cidrs
            .map((c) => `      <node type="allow" cidr="${escapeXmlAttr(c)}"/>`)
            .join('\n') + (cidrs.length ? '\n' : '');
    const block = `    <!-- Admin Panel: Local Networks (FreePBX-like). Empty list = allow all. -->\n` +
        `    <list name="${listName}" default="${def}">\n` +
        nodes +
        `    </list>\n`;
    const re = new RegExp(`\\s*<!--\\s*Admin Panel: Local Networks[\\s\\S]*?-->\\s*<list\\s+name="${escapeRegExp(listName)}"[\\s\\S]*?<\\/list>\\s*\\n?`, 'i');
    if (re.test(xml)) {
        return xml.replace(re, `\n${block}`);
    }
    const listRe = new RegExp(`<list\\s+name="${escapeRegExp(listName)}"[\\s\\S]*?<\\/list>\\s*\\n?`, 'i');
    if (listRe.test(xml)) {
        return xml.replace(listRe, block);
    }
    const idx = xml.lastIndexOf('</network-lists>');
    if (idx === -1)
        throw new common_1.BadRequestException('Invalid acl.conf.xml');
    return xml.slice(0, idx) + block + xml.slice(idx);
}
async function detectPublicIp() {
    try {
        const res = await fetch('https://api.ipify.org?format=text', { method: 'GET' });
        const txt = (await res.text()).trim();
        if ((0, node_net_1.isIP)(txt) === 4 || (0, node_net_1.isIP)(txt) === 6)
            return txt;
    }
    catch {
    }
    return '';
}
function detectLocalCidrs() {
    const nets = os.networkInterfaces();
    const out = [];
    const seen = new Set();
    for (const list of Object.values(nets)) {
        for (const n of list ?? []) {
            if (!n || n.internal)
                continue;
            const ip = String(n.address ?? '').trim();
            const netmask = String(n.netmask ?? '').trim();
            const ver = (0, node_net_1.isIP)(ip);
            if (ver !== 4)
                continue;
            const mask = ipv4NetmaskToBits(netmask);
            if (mask == null)
                continue;
            const cidr = `${ip}/${mask}`;
            if (seen.has(cidr))
                continue;
            seen.add(cidr);
            out.push(cidr);
        }
    }
    return out;
}
function ipv4NetmaskToBits(netmask) {
    const parts = netmask.split('.').map((x) => Number(x));
    if (parts.length !== 4 || parts.some((x) => !Number.isFinite(x) || x < 0 || x > 255))
        return null;
    let bits = 0;
    let zeroSeen = false;
    for (const p of parts) {
        for (let i = 7; i >= 0; i--) {
            const b = (p >> i) & 1;
            if (b === 1) {
                if (zeroSeen)
                    return null;
                bits++;
            }
            else {
                zeroSeen = true;
            }
        }
    }
    return bits;
}
function getPreProcessVar(xml, name) {
    const re = new RegExp(`<X-PRE-PROCESS\\s+cmd="set"\\s+data="${escapeRegExp(name)}=([^"]*)"\\s*/?>`, 'i');
    const m = xml.match(re);
    if (!m)
        return null;
    return m[1] ?? null;
}
function setPreProcessVar(xml, name, value) {
    const re = new RegExp(`(<X-PRE-PROCESS\\s+cmd="set"\\s+data="${escapeRegExp(name)}=)([^"]*)(".*?/?>)`, 'i');
    if (re.test(xml)) {
        return xml.replace(re, `$1${escapeXmlAttr(value)}$3`);
    }
    const insert = `  <X-PRE-PROCESS cmd="set" data="${name}=${escapeXmlAttr(value)}"/>\n`;
    const idx = xml.lastIndexOf('</include>');
    if (idx === -1)
        throw new common_1.BadRequestException('Invalid vars.xml');
    return xml.slice(0, idx) + insert + xml.slice(idx);
}
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function escapeXmlAttr(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
//# sourceMappingURL=nat.service.js.map