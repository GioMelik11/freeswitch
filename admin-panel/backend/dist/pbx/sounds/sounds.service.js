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
exports.SoundsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
let SoundsService = class SoundsService {
    baseDir;
    fsSoundDir;
    constructor(config) {
        const configuredFsSounds = config.get('FS_SOUND_DIR') ??
            config.get('FS_SOUNDS_DIR') ??
            undefined;
        const configuredRepoSounds = config.get('SOUNDS_DIR') ?? undefined;
        const preferFs = configuredFsSounds ?? '/usr/share/freeswitch/sounds';
        const preferRepo = configuredRepoSounds ??
            path.resolve(process.cwd(), '../../freeswitch-sounds');
        this.fsSoundDir = configuredFsSounds ?? '/usr/share/freeswitch/sounds';
        this.baseDir = fs.existsSync(preferFs) ? preferFs : preferRepo;
    }
    getIndex() {
        const all = this.listAll();
        return {
            all,
            music: all.filter((x) => x.category === 'music'),
            ivr: all.filter((x) => x.category === 'ivr'),
        };
    }
    list(category) {
        return this.getIndex()[category];
    }
    listAll() {
        const root = this.baseDir;
        if (!fs.existsSync(root))
            return [];
        const out = [];
        const walk = (d) => {
            for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
                if (ent.name.startsWith('.'))
                    continue;
                const abs = path.join(d, ent.name);
                if (ent.isDirectory()) {
                    walk(abs);
                    continue;
                }
                if (!ent.isFile())
                    continue;
                const lower = ent.name.toLowerCase();
                if (!lower.endsWith('.wav') && !lower.endsWith('.mp3'))
                    continue;
                const rel = path.relative(root, abs).replace(/\\/g, '/');
                const top = rel.split('/')[0] ?? '';
                const category = top === 'music' ? 'music' : top === 'ivr' ? 'ivr' : 'other';
                out.push({
                    category,
                    file: ent.name,
                    relPath: rel,
                    fsPath: `${this.fsSoundDir.replace(/\/+$/, '')}/${rel}`,
                    playPath: rel,
                });
            }
        };
        walk(root);
        return out.sort((a, b) => a.relPath.localeCompare(b.relPath));
    }
    ensureCategoryDir(category) {
        const dir = path.join(this.baseDir, category);
        fs.mkdirSync(dir, { recursive: true });
        return dir;
    }
    ensureDir(relDir) {
        const clean = String(relDir ?? '')
            .trim()
            .replace(/\\/g, '/')
            .replace(/^\/+/, '');
        if (!clean)
            throw new common_1.BadRequestException('Invalid dir');
        if (clean.includes('..'))
            throw new common_1.BadRequestException('Invalid dir');
        if (!/^[a-zA-Z0-9_./-]+$/.test(clean))
            throw new common_1.BadRequestException('Invalid dir');
        const abs = path.resolve(this.baseDir, clean);
        const base = path.resolve(this.baseDir);
        if (!abs.startsWith(base + path.sep) && abs !== base)
            throw new common_1.BadRequestException('Invalid dir');
        fs.mkdirSync(abs, { recursive: true });
        return abs;
    }
    sanitizeFilename(name) {
        const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
        if (!base.toLowerCase().endsWith('.wav'))
            throw new common_1.BadRequestException('Only .wav files are allowed');
        return base;
    }
    toRelPath(absPath) {
        const base = path.resolve(this.baseDir);
        const abs = path.resolve(absPath);
        if (!abs.startsWith(base + path.sep) && abs !== base) {
            throw new common_1.BadRequestException('Path escapes sounds directory');
        }
        return path.relative(base, abs).replace(/\\/g, '/');
    }
};
exports.SoundsService = SoundsService;
exports.SoundsService = SoundsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SoundsService);
//# sourceMappingURL=sounds.service.js.map