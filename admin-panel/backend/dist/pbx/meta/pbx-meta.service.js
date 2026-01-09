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
exports.PbxMetaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("node:crypto"));
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
let PbxMetaService = class PbxMetaService {
    metaPath;
    constructor(config) {
        const dataDir = config.get('DATA_DIR') ?? '/data';
        const override = config.get('PBX_META_PATH');
        this.metaPath = override
            ? path.resolve(override)
            : path.resolve(dataDir, 'pbx-meta.json');
    }
    sha256(s) {
        return crypto.createHash('sha256').update(s).digest('hex');
    }
    defaultMeta() {
        return {
            version: 1,
            queues: {},
            trunks: {},
            aiServices: [],
            defaultAiServiceId: undefined,
            defaultTrunkName: undefined,
        };
    }
    get() {
        if (!fs.existsSync(this.metaPath)) {
            const meta = this.defaultMeta();
            const content = JSON.stringify(meta, null, 2) + '\n';
            fs.mkdirSync(path.dirname(this.metaPath), { recursive: true });
            fs.writeFileSync(this.metaPath, content, 'utf8');
            return { meta, etag: this.sha256(content) };
        }
        const content = fs.readFileSync(this.metaPath, 'utf8');
        const parsed = JSON.parse(content || '{}');
        const meta = parsed && parsed.version === 1
            ? parsed
            : { ...this.defaultMeta(), ...(parsed ?? {}) };
        meta.queues = meta.queues ?? {};
        meta.trunks = meta.trunks ?? {};
        meta.aiServices = meta.aiServices ?? [];
        meta.defaultTrunkName = meta.defaultTrunkName ?? undefined;
        return { meta, etag: this.sha256(content) };
    }
    write(meta, etag) {
        const current = this.get();
        if (etag && etag !== current.etag) {
            throw new common_1.ConflictException('PBX meta changed since last read (etag mismatch)');
        }
        const content = JSON.stringify(meta, null, 2) + '\n';
        fs.mkdirSync(path.dirname(this.metaPath), { recursive: true });
        const tmp = this.metaPath + '.tmp';
        fs.writeFileSync(tmp, content, 'utf8');
        fs.renameSync(tmp, this.metaPath);
        return { ok: true, etag: this.sha256(content) };
    }
    upsertQueueMeta(fullName, patch) {
        const cur = this.get();
        const meta = cur.meta;
        meta.queues[fullName] = {
            ...(meta.queues[fullName] ?? {}),
            ...patch,
        };
        return this.write(meta, cur.etag);
    }
    deleteQueueMeta(fullName) {
        const cur = this.get();
        const meta = cur.meta;
        if (meta.queues[fullName])
            delete meta.queues[fullName];
        return this.write(meta, cur.etag);
    }
    upsertTrunkMeta(name, patch) {
        const cur = this.get();
        const meta = cur.meta;
        meta.trunks[name] = {
            ...(meta.trunks[name] ?? {}),
            ...patch,
        };
        return this.write(meta, cur.etag);
    }
    deleteTrunkMeta(name) {
        const cur = this.get();
        const meta = cur.meta;
        if (meta.trunks[name])
            delete meta.trunks[name];
        if (meta.defaultTrunkName === name)
            meta.defaultTrunkName = undefined;
        return this.write(meta, cur.etag);
    }
    setDefaultTrunkName(name) {
        const cur = this.get();
        const meta = cur.meta;
        meta.defaultTrunkName = name ? String(name) : undefined;
        return this.write(meta, cur.etag);
    }
};
exports.PbxMetaService = PbxMetaService;
exports.PbxMetaService = PbxMetaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PbxMetaService);
//# sourceMappingURL=pbx-meta.service.js.map