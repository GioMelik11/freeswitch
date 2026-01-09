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
exports.FreeswitchService = void 0;
const common_1 = require("@nestjs/common");
const files_service_1 = require("../files/files.service");
const MODULES_CONF_PATH = 'autoload_configs/modules.conf.xml';
let FreeswitchService = class FreeswitchService {
    files;
    constructor(files) {
        this.files = files;
    }
    listModules() {
        const { content, etag, path } = this.files.readFile(MODULES_CONF_PATH);
        const modules = new Map();
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
            const enabledMatch = line.match(/<\s*load\s+module\s*=\s*"([^"]+)"\s*\/\s*>/i);
            if (enabledMatch) {
                const module = enabledMatch[1];
                modules.set(module, { module, enabled: true });
                continue;
            }
            const disabledMatch = line.match(/<!--\s*<\s*load\s+module\s*=\s*"([^"]+)"\s*\/\s*>\s*-->/i);
            if (disabledMatch) {
                const module = disabledMatch[1];
                if (!modules.has(module))
                    modules.set(module, { module, enabled: false });
            }
        }
        return {
            path,
            etag,
            modules: [...modules.values()].sort((a, b) => a.module.localeCompare(b.module)),
        };
    }
    setModule(params) {
        const { module, enabled, etag } = params;
        if (!/^mod_[a-z0-9_]+$/i.test(module))
            throw new common_1.BadRequestException('Invalid module name');
        const read = this.files.readFile(MODULES_CONF_PATH);
        const current = read.content;
        const enableRe = new RegExp(String.raw `(^[ \t]*)<!--\s*(<\s*load\s+module\s*=\s*"${module}"\s*\/\s*>\s*)-->`, 'gim');
        const disableRe = new RegExp(String.raw `(^[ \t]*)(<\s*load\s+module\s*=\s*"${module}"\s*\/\s*>)`, 'gim');
        let updated = current;
        if (enabled) {
            updated = updated.replace(enableRe, '$1$2');
            if (!updated.match(new RegExp(String.raw `<\s*load\s+module\s*=\s*"${module}"\s*\/\s*>`, 'i'))) {
                updated = this.appendModule(updated, module);
            }
        }
        else {
            updated = updated.replace(disableRe, '$1<!-- $2 -->');
        }
        return this.files.writeFile({
            path: MODULES_CONF_PATH,
            content: updated,
            etag: etag ?? read.etag,
        });
    }
    appendModule(content, module) {
        const lines = content.split(/\r?\n/);
        const out = [];
        let inserted = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            out.push(line);
            if (!inserted && line.match(/<\s*modules\s*>/i)) {
                out.push(`    <load module="${module}"/>`);
                inserted = true;
            }
        }
        return inserted
            ? out.join('\n')
            : content + `\n<load module="${module}"/>\n`;
    }
};
exports.FreeswitchService = FreeswitchService;
exports.FreeswitchService = FreeswitchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [files_service_1.FilesService])
], FreeswitchService);
//# sourceMappingURL=freeswitch.service.js.map