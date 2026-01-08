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
exports.OptionsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const extensions_service_1 = require("../extensions/extensions.service");
const queues_service_1 = require("../queues/queues.service");
const ivr_service_1 = require("../ivr/ivr.service");
const sounds_service_1 = require("../sounds/sounds.service");
const files_service_1 = require("../../files/files.service");
const xml_1 = require("../xml");
const time_conditions_service_1 = require("../time-conditions/time-conditions.service");
const pbx_meta_service_1 = require("../meta/pbx-meta.service");
let OptionsController = class OptionsController {
    extensions;
    queues;
    ivrs;
    timeConditions;
    sounds;
    files;
    meta;
    constructor(extensions, queues, ivrs, timeConditions, sounds, files, meta) {
        this.extensions = extensions;
        this.queues = queues;
        this.ivrs = ivrs;
        this.timeConditions = timeConditions;
        this.sounds = sounds;
        this.files = files;
        this.meta = meta;
    }
    get() {
        const ext = this.extensions.list().map((e) => ({
            id: e.id,
            label: `${e.id} - ${e.callerIdName}`,
        }));
        const q = this.queues.getConfig().queues.map((x) => ({ name: x.name }));
        const ivr = this.ivrs.list().menus.map((m) => ({ name: m.name }));
        const tc = this.timeConditions.list().items.map((t) => ({
            name: t.name,
            extensionNumber: t.extensionNumber,
        }));
        const soundIndex = this.sounds.getIndex();
        const mohClasses = this.getMohClasses();
        const strategies = [
            'ring-all',
            'round-robin',
            'top-down',
            'agent-with-least-talk-time',
            'agent-with-least-calls',
            'sequentially-by-agent-order',
            'random',
            'longest-idle-agent',
        ];
        const domains = ['default'];
        const m = this.meta.get().meta;
        const aiServices = (m.aiServices ?? [])
            .filter((s) => s && s.enabled !== false && s.id && s.socketUrl)
            .map((s) => ({ id: String(s.id), name: String(s.name ?? s.id), socketUrl: String(s.socketUrl) }));
        return {
            extensions: ext,
            queues: q,
            ivrs: ivr,
            timeConditions: tc,
            sounds: soundIndex,
            mohClasses,
            strategies,
            domains,
            aiServices,
            defaultAiServiceId: m.defaultAiServiceId ?? null,
        };
    }
    getMohClasses() {
        try {
            const read = this.files.readFile('autoload_configs/local_stream.conf.xml');
            const obj = xml_1.xmlParser.parse(read.content);
            const cfg = obj?.configuration;
            const dirs = cfg?.directory;
            const arr = Array.isArray(dirs) ? dirs : dirs ? [dirs] : [];
            const names = arr.map((d) => String(d?.['@_name'] ?? '')).filter(Boolean);
            const out = new Set();
            out.add('local_stream://moh');
            for (const n of names)
                out.add(`local_stream://${n}`);
            return [...out].sort();
        }
        catch {
            return ['local_stream://moh'];
        }
    }
};
exports.OptionsController = OptionsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OptionsController.prototype, "get", null);
exports.OptionsController = OptionsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('pbx/options'),
    __metadata("design:paramtypes", [extensions_service_1.ExtensionsService,
        queues_service_1.QueuesService,
        ivr_service_1.IvrService,
        time_conditions_service_1.TimeConditionsService,
        sounds_service_1.SoundsService,
        files_service_1.FilesService,
        pbx_meta_service_1.PbxMetaService])
], OptionsController);
//# sourceMappingURL=options.controller.js.map