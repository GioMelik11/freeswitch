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
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const files_service_1 = require("../../files/files.service");
const pbx_meta_service_1 = require("../meta/pbx-meta.service");
const crypto = __importStar(require("node:crypto"));
const VARS_PATH = 'vars.xml';
let AiService = class AiService {
    files;
    meta;
    constructor(files, meta) {
        this.files = files;
        this.meta = meta;
    }
    getSettings() {
        const read = this.files.readFile(VARS_PATH);
        const audioStreamUrl = getPreProcessVar(read.content, 'audio_stream_url') ?? '';
        return { etag: read.etag, audioStreamUrl };
    }
    updateSettings(input) {
        const url = String(input.audioStreamUrl ?? '').trim();
        if (!url)
            throw new common_1.BadRequestException('audioStreamUrl is required');
        const read = this.files.readFile(VARS_PATH);
        const next = setPreProcessVar(read.content, 'audio_stream_url', url);
        return this.files.writeFile({
            path: VARS_PATH,
            content: next,
            etag: input.etag ?? read.etag,
        });
    }
    listServices() {
        const cur = this.meta.get();
        const services = (cur.meta.aiServices ?? []).map((s) => ({
            id: String(s.id ?? ''),
            name: String(s.name ?? ''),
            socketUrl: String(s.socketUrl ?? ''),
            enabled: s.enabled !== false,
        }));
        return {
            etag: cur.etag,
            services,
            defaultAiServiceId: cur.meta.defaultAiServiceId ?? null,
        };
    }
    upsertService(input) {
        const cur = this.meta.get();
        const meta = cur.meta;
        const id = (input.id && String(input.id)) || crypto.randomUUID();
        const name = String(input.name ?? '').trim();
        const socketUrl = String(input.socketUrl ?? input.audioStreamUrl ?? '').trim();
        if (!name)
            throw new common_1.BadRequestException('name is required');
        if (!socketUrl)
            throw new common_1.BadRequestException('audio_stream_url is required');
        if (!/^wss?:\/\//i.test(socketUrl))
            throw new common_1.BadRequestException('audio_stream_url must start with ws:// or wss://');
        const list = meta.aiServices ?? [];
        const idx = list.findIndex((x) => String(x.id) === id);
        const next = {
            id,
            name,
            socketUrl,
            enabled: input.enabled !== false,
        };
        if (idx >= 0)
            list[idx] = next;
        else
            list.push(next);
        meta.aiServices = list;
        if (!meta.defaultAiServiceId)
            meta.defaultAiServiceId = id;
        return this.meta.write(meta, cur.etag);
    }
    deleteService(id) {
        const cur = this.meta.get();
        const meta = cur.meta;
        meta.aiServices = (meta.aiServices ?? []).filter((s) => String(s.id) !== String(id));
        if (meta.defaultAiServiceId === id)
            meta.defaultAiServiceId = meta.aiServices[0]?.id;
        return this.meta.write(meta, cur.etag);
    }
    setDefaultService(id) {
        const cur = this.meta.get();
        const meta = cur.meta;
        const exists = (meta.aiServices ?? []).some((s) => String(s.id) === String(id));
        if (!exists)
            throw new common_1.BadRequestException('Unknown service id');
        meta.defaultAiServiceId = id;
        return this.meta.write(meta, cur.etag);
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [files_service_1.FilesService,
        pbx_meta_service_1.PbxMetaService])
], AiService);
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
//# sourceMappingURL=ai.service.js.map