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
exports.NatController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const nat_service_1 = require("./nat.service");
const update_nat_settings_dto_1 = require("./dto/update-nat-settings.dto");
let NatController = class NatController {
    nat;
    constructor(nat) {
        this.nat = nat;
    }
    get() {
        return this.nat.getSettings();
    }
    detect() {
        return this.nat.detect();
    }
    update(dto) {
        return this.nat.updateSettings(dto);
    }
};
exports.NatController = NatController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NatController.prototype, "get", null);
__decorate([
    (0, common_1.Get)('detect'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NatController.prototype, "detect", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_nat_settings_dto_1.UpdateNatSettingsDto]),
    __metadata("design:returntype", void 0)
], NatController.prototype, "update", null);
exports.NatController = NatController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('pbx/nat'),
    __metadata("design:paramtypes", [nat_service_1.NatService])
], NatController);
//# sourceMappingURL=nat.controller.js.map