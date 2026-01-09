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
exports.StatusController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const esl_service_1 = require("../../freeswitch/esl/esl.service");
let StatusController = class StatusController {
    esl;
    constructor(esl) {
        this.esl = esl;
    }
    async gateways() {
        const res = await this.esl.api('sofia status gateways');
        const lines = res.body
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
        const out = {};
        for (const line of lines) {
            const parts = line.split(/\s+/);
            const name = parts[0];
            if (!name || name === 'Name' || name === 'Gateway')
                continue;
            const status = parts.find((p) => [
                'REGED',
                'NOREG',
                'UNREGED',
                'TRYING',
                'FAIL_WAIT',
                'DOWN',
                'UP',
            ].includes(p)) ?? 'UNKNOWN';
            out[name] = { status, raw: line };
        }
        return out;
    }
    async gateway(name) {
        const res = await this.esl.api(`sofia status gateway ${name}`);
        return { name, raw: res.body };
    }
    async extensions() {
        const res = await this.esl.api('sofia status profile internal reg');
        const lines = res.body.split(/\r?\n/);
        const out = {};
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            if (trimmed.toLowerCase().startsWith('call-id'))
                continue;
            if (trimmed.toLowerCase().includes('registrations'))
                continue;
            const parts = trimmed.split(/\s+/);
            const user = parts[0];
            if (!/^\d+$/.test(user))
                continue;
            out[user] = { raw: trimmed };
        }
        return out;
    }
};
exports.StatusController = StatusController;
__decorate([
    (0, common_1.Get)('gateways'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatusController.prototype, "gateways", null);
__decorate([
    (0, common_1.Get)('gateways/:name'),
    __param(0, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StatusController.prototype, "gateway", null);
__decorate([
    (0, common_1.Get)('extensions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatusController.prototype, "extensions", null);
exports.StatusController = StatusController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('pbx/status'),
    __metadata("design:paramtypes", [esl_service_1.EslService])
], StatusController);
//# sourceMappingURL=status.controller.js.map