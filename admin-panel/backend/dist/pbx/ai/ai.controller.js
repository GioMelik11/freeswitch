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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const extensions_service_1 = require("../extensions/extensions.service");
const ai_service_1 = require("./ai.service");
const update_ai_settings_dto_1 = require("./dto/update-ai-settings.dto");
const dialplan_service_1 = require("../dialplan/dialplan.service");
const pbx_meta_service_1 = require("../meta/pbx-meta.service");
const esl_service_1 = require("../../freeswitch/esl/esl.service");
let AiController = class AiController {
    ai;
    extensions;
    dialplan;
    meta;
    esl;
    constructor(ai, extensions, dialplan, meta, esl) {
        this.ai = ai;
        this.extensions = extensions;
        this.dialplan = dialplan;
        this.meta = meta;
        this.esl = esl;
    }
    settings() {
        return this.ai.getSettings();
    }
    async update(dto) {
        const res = this.ai.updateSettings(dto);
        await this.reloadFsBestEffort();
        return res;
    }
    listAiExtensions() {
        const list = this.extensions.list();
        return list
            .filter((e) => Boolean(e.aiEnabled))
            .map((e) => ({
                id: e.id,
                callerIdName: e.callerIdName,
                aiServiceId: e.aiServiceId ?? null,
            }));
    }
    listServices() {
        return this.ai.listServices();
    }
    upsertService(body) {
        // Enforce: if ANY extension has AI enabled, there must remain at least one enabled AI service with a URL.
        const aiExtCount = this.extensions
            .list()
            .filter((e) => Boolean(e.aiEnabled)).length;
        if (aiExtCount > 0) {
            const cur = this.meta.get().meta;
            const list = Array.isArray(cur.aiServices) ? [...cur.aiServices] : [];
            const incomingId = body.id ? String(body.id) : undefined;
            const name = String(body.name ?? '').trim();
            const socketUrl = String(body.socketUrl ?? body.audioStreamUrl ?? '').trim();
            const enabled = body.enabled !== false;
            if (!name)
                throw new common_1.BadRequestException('name is required');
            if (!socketUrl)
                throw new common_1.BadRequestException('audio_stream_url is required');
            const idx = incomingId
                ? list.findIndex((s) => String(s?.id) === incomingId)
                : -1;
            const nextId = incomingId || '__new__';
            const next = { id: nextId, name, socketUrl, enabled };
            if (idx >= 0)
                list[idx] = next;
            else
                list.push(next);
            const enabledCount = list.filter((s) => s && s.enabled !== false && s.socketUrl).length;
            if (enabledCount === 0) {
                throw new common_1.BadRequestException('You have AI-enabled extensions. At least one AI service must remain enabled with a valid WS URL.');
            }
        }
        const res = this.ai.upsertService(body);
        this.regenExtensionsDialplan();
        void this.reloadFsBestEffort();
        return res;
    }
    deleteService(id) {
        const aiExtCount = this.extensions
            .list()
            .filter((e) => Boolean(e.aiEnabled)).length;
        if (aiExtCount > 0) {
            const cur = this.meta.get().meta;
            const list = (cur.aiServices ?? []).filter((s) => String(s?.id) !== String(id));
            const enabledCount = list.filter((s) => s && s.enabled !== false && s.socketUrl).length;
            if (enabledCount === 0) {
                throw new common_1.BadRequestException('You have AI-enabled extensions. You cannot delete the last enabled AI service.');
            }
        }
        const res = this.ai.deleteService(id);
        this.regenExtensionsDialplan();
        void this.reloadFsBestEffort();
        return res;
    }
    setDefault(id) {
        const res = this.ai.setDefaultService(id);
        this.regenExtensionsDialplan();
        void this.reloadFsBestEffort();
        return res;
    }
    regenExtensionsDialplan() {
        try {
            const list = this.extensions.list();
            this.dialplan.ensureDefaultIncludesDirEarly();
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
        catch {
        }
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
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "settings", null);
__decorate([
    (0, common_1.Post)('settings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_ai_settings_dto_1.UpdateAiSettingsDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('extensions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "listAiExtensions", null);
__decorate([
    (0, common_1.Get)('services'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "listServices", null);
__decorate([
    (0, common_1.Post)('services'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "upsertService", null);
__decorate([
    (0, common_1.Delete)('services/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "deleteService", null);
__decorate([
    (0, common_1.Post)('services/:id/default'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "setDefault", null);
exports.AiController = AiController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('pbx/ai'),
    __metadata("design:paramtypes", [ai_service_1.AiService,
    extensions_service_1.ExtensionsService,
    dialplan_service_1.DialplanService,
    pbx_meta_service_1.PbxMetaService,
    esl_service_1.EslService])
], AiController);
//# sourceMappingURL=ai.controller.js.map