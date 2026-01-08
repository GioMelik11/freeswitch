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
exports.FreeswitchController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const esl_service_1 = require("../../freeswitch/esl/esl.service");
let FreeswitchController = class FreeswitchController {
    esl;
    constructor(esl) {
        this.esl = esl;
    }
    async reload() {
        const cmds = [
            'reloadxml',
            'sofia profile internal rescan reloadxml',
            'sofia profile external rescan reloadxml',
        ];
        const results = [];
        for (const c of cmds) {
            try {
                const res = await this.esl.api(c);
                results.push({ command: c, ok: true, body: res.body });
            }
            catch (e) {
                results.push({ command: c, ok: false, body: e?.message ?? String(e) });
            }
        }
        return { ok: results.every((r) => r.ok), results };
    }
};
exports.FreeswitchController = FreeswitchController;
__decorate([
    (0, common_1.Post)('reload'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FreeswitchController.prototype, "reload", null);
exports.FreeswitchController = FreeswitchController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('pbx/freeswitch'),
    __metadata("design:paramtypes", [esl_service_1.EslService])
], FreeswitchController);
//# sourceMappingURL=freeswitch.controller.js.map