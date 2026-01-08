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
exports.FilesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("node:crypto"));
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
let FilesService = class FilesService {
    baseDir;
    backupsDir;
    constructor(config) {
        this.baseDir = path.resolve(process.cwd(), config.get('FS_CONF_DIR') ?? '../../freeswitch');
        this.backupsDir = path.resolve(process.cwd(), config.get('BACKUPS_DIR') ?? 'data/backups');
        fs.mkdirSync(this.backupsDir, { recursive: true });
    }
    isAllowedTextFile(p) {
        const ext = path.extname(p).toLowerCase();
        return ['.xml', '.conf', '.lua', '.tpl', '.ttml', '.txt', '.md'].includes(ext);
    }
    resolveSafe(relPath) {
        if (!relPath || typeof relPath !== 'string')
            throw new common_1.BadRequestException('Invalid path');
        if (path.isAbsolute(relPath))
            throw new common_1.BadRequestException('Absolute paths are not allowed');
        const normalized = relPath.replace(/\\/g, '/');
        const resolved = path.resolve(this.baseDir, normalized);
        if (!resolved.startsWith(this.baseDir + path.sep) && resolved !== this.baseDir) {
            throw new common_1.BadRequestException('Path escapes base directory');
        }
        return { normalized, resolved };
    }
    listFiles(relDir, opts) {
        const { resolved } = this.resolveSafe(relDir);
        if (!fs.existsSync(resolved))
            return [];
        const stat = fs.statSync(resolved);
        if (!stat.isDirectory())
            throw new common_1.BadRequestException('Not a directory');
        const regex = opts?.regex;
        const exts = opts?.extensions?.map((e) => e.toLowerCase());
        const entries = fs.readdirSync(resolved, { withFileTypes: true });
        return entries
            .filter((e) => e.isFile())
            .map((e) => e.name)
            .filter((name) => !name.startsWith('.'))
            .filter((name) => (regex ? regex.test(name) : true))
            .filter((name) => exts ? exts.includes(path.extname(name).toLowerCase()) : true)
            .map((name) => ({
            name,
            path: path.posix.join(relDir.replace(/\\/g, '/'), name),
        }));
    }
    sha256(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    listRootTree() {
        const roots = [
            'autoload_configs',
            'dialplan',
            'directory',
            'ivr_menus',
            'sip_profiles',
            'scripts',
            'vars.xml',
            'freeswitch.xml',
        ];
        const nodes = [];
        for (const rel of roots) {
            const { resolved } = this.resolveSafe(rel);
            if (!fs.existsSync(resolved))
                continue;
            const stat = fs.statSync(resolved);
            if (stat.isDirectory())
                nodes.push(this.walkDir(rel));
            else
                nodes.push({ type: 'file', name: path.basename(rel), path: rel.replace(/\\/g, '/') });
        }
        return nodes;
    }
    walkDir(relDir) {
        const { resolved } = this.resolveSafe(relDir);
        const entries = fs.readdirSync(resolved, { withFileTypes: true });
        const children = [];
        for (const ent of entries) {
            const name = ent.name;
            if (name.startsWith('.'))
                continue;
            const childRel = path.posix.join(relDir.replace(/\\/g, '/'), name);
            const { resolved: childAbs } = this.resolveSafe(childRel);
            if (ent.isDirectory()) {
                children.push(this.walkDir(childRel));
                continue;
            }
            if (!ent.isFile())
                continue;
            if (!this.isAllowedTextFile(childAbs))
                continue;
            children.push({ type: 'file', name, path: childRel });
        }
        children.sort((a, b) => {
            if (a.type !== b.type)
                return a.type === 'dir' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        return { type: 'dir', name: path.basename(relDir), path: relDir.replace(/\\/g, '/'), children };
    }
    readFile(relPath) {
        const { resolved } = this.resolveSafe(relPath);
        if (!fs.existsSync(resolved))
            throw new common_1.BadRequestException('File not found');
        const stat = fs.statSync(resolved);
        if (!stat.isFile())
            throw new common_1.BadRequestException('Not a file');
        if (!this.isAllowedTextFile(resolved))
            throw new common_1.BadRequestException('File type not allowed');
        const content = fs.readFileSync(resolved, 'utf8');
        return { path: relPath.replace(/\\/g, '/'), content, etag: this.sha256(content), mtimeMs: stat.mtimeMs };
    }
    writeFile(params) {
        const { path: relPath, content, etag } = params;
        const { resolved } = this.resolveSafe(relPath);
        if (!this.isAllowedTextFile(resolved))
            throw new common_1.BadRequestException('File type not allowed');
        const exists = fs.existsSync(resolved);
        if (exists) {
            const current = fs.readFileSync(resolved, 'utf8');
            const currentEtag = this.sha256(current);
            if (etag && etag !== currentEtag) {
                throw new common_1.ConflictException('File changed since last read (etag mismatch)');
            }
            this.backupFile(relPath, current);
        }
        else {
            const dir = path.dirname(resolved);
            fs.mkdirSync(dir, { recursive: true });
        }
        const tmp = resolved + '.tmp';
        fs.writeFileSync(tmp, content, 'utf8');
        fs.renameSync(tmp, resolved);
        return { ok: true, etag: this.sha256(content) };
    }
    deleteFile(relPath, etag) {
        const { resolved } = this.resolveSafe(relPath);
        if (!fs.existsSync(resolved))
            throw new common_1.BadRequestException('File not found');
        const stat = fs.statSync(resolved);
        if (!stat.isFile())
            throw new common_1.BadRequestException('Not a file');
        if (!this.isAllowedTextFile(resolved))
            throw new common_1.BadRequestException('File type not allowed');
        const current = fs.readFileSync(resolved, 'utf8');
        const currentEtag = this.sha256(current);
        if (etag && etag !== currentEtag) {
            throw new common_1.ConflictException('File changed since last read (etag mismatch)');
        }
        this.backupFile(relPath, current);
        fs.unlinkSync(resolved);
        return { ok: true };
    }
    backupFile(relPath, content) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeRel = relPath.replace(/\\/g, '/');
        const out = path.resolve(this.backupsDir, stamp, safeRel);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, content, 'utf8');
    }
};
exports.FilesService = FilesService;
exports.FilesService = FilesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FilesService);
//# sourceMappingURL=files.service.js.map