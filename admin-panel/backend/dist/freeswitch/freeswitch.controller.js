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
exports.FreeswitchController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const set_module_dto_1 = require("./dto/set-module.dto");
const freeswitch_service_1 = require("./freeswitch.service");
let FreeswitchController = class FreeswitchController {
    fs;
    constructor(fs) {
        this.fs = fs;
    }
    listModules() {
        return this.fs.listModules();
    }
    setModule(dto) {
        return this.fs.setModule(dto);
    }
};
exports.FreeswitchController = FreeswitchController;
__decorate([
    (0, common_1.Get)('modules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FreeswitchController.prototype, "listModules", null);
__decorate([
    (0, common_1.Post)('modules/set'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [set_module_dto_1.SetModuleDto]),
    __metadata("design:returntype", void 0)
], FreeswitchController.prototype, "setModule", null);
exports.FreeswitchController = FreeswitchController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('freeswitch'),
    __metadata("design:paramtypes", [freeswitch_service_1.FreeswitchService])
], FreeswitchController);
//# sourceMappingURL=freeswitch.controller.js.map