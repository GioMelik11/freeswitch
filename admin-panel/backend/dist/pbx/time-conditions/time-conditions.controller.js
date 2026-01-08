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
exports.TimeConditionsController = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const upsert_time_condition_dto_1 = require("./dto/upsert-time-condition.dto");
const time_conditions_service_1 = require("./time-conditions.service");
let TimeConditionsController = class TimeConditionsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    list() {
        return this.svc.list();
    }
    upsert(dto) {
        return this.svc.upsert(dto);
    }
    delete(name, etag) {
        return this.svc.delete(name, etag);
    }
};
exports.TimeConditionsController = TimeConditionsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TimeConditionsController.prototype, "list", null);
__decorate([
    (0, common_2.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [upsert_time_condition_dto_1.UpsertTimeConditionDto]),
    __metadata("design:returntype", void 0)
], TimeConditionsController.prototype, "upsert", null);
__decorate([
    (0, common_1.Delete)(':name'),
    __param(0, (0, common_1.Param)('name')),
    __param(1, (0, common_1.Query)('etag')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TimeConditionsController.prototype, "delete", null);
exports.TimeConditionsController = TimeConditionsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('pbx/time-conditions'),
    __metadata("design:paramtypes", [time_conditions_service_1.TimeConditionsService])
], TimeConditionsController);
//# sourceMappingURL=time-conditions.controller.js.map