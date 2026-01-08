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
exports.TrunksController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const upsert_trunk_dto_1 = require("./dto/upsert-trunk.dto");
const trunks_service_1 = require("./trunks.service");
let TrunksController = class TrunksController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    list() {
        return this.svc.list();
    }
    get(name) {
        return this.svc.get(name);
    }
    upsert(dto) {
        return this.svc.upsert(dto);
    }
    delete(name, etag) {
        return this.svc.delete(name, etag);
    }
};
exports.TrunksController = TrunksController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TrunksController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':name'),
    __param(0, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TrunksController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [upsert_trunk_dto_1.UpsertTrunkDto]),
    __metadata("design:returntype", void 0)
], TrunksController.prototype, "upsert", null);
__decorate([
    (0, common_1.Delete)(':name'),
    __param(0, (0, common_1.Param)('name')),
    __param(1, (0, common_1.Query)('etag')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TrunksController.prototype, "delete", null);
exports.TrunksController = TrunksController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('pbx/trunks'),
    __metadata("design:paramtypes", [trunks_service_1.TrunksService])
], TrunksController);
//# sourceMappingURL=trunks.controller.js.map