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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const settings_service_1 = require("./settings.service");
const update_advanced_settings_dto_1 = require("./dto/update-advanced-settings.dto");
const update_sip_settings_dto_1 = require("./dto/update-sip-settings.dto");
let SettingsController = class SettingsController {
    settings;
    constructor(settings) {
        this.settings = settings;
    }
    advanced() {
        return this.settings.getAdvanced();
    }
    updateAdvanced(dto) {
        return this.settings.updateAdvanced(dto);
    }
    sip() {
        return this.settings.getSip();
    }
    updateSip(dto) {
        return this.settings.updateSip(dto);
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)('advanced'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "advanced", null);
__decorate([
    (0, common_1.Post)('advanced'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_advanced_settings_dto_1.UpdateAdvancedSettingsDto]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "updateAdvanced", null);
__decorate([
    (0, common_1.Get)('sip'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "sip", null);
__decorate([
    (0, common_1.Post)('sip'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_sip_settings_dto_1.UpdateSipSettingsDto]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "updateSip", null);
exports.SettingsController = SettingsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('pbx/settings'),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map