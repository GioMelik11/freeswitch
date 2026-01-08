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
exports.UpsertQueueDto = void 0;
const class_validator_1 = require("class-validator");
class DestDto {
    type;
    target;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DestDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DestDto.prototype, "target", void 0);
class UpsertQueueDto {
    name;
    domain;
    strategy;
    mohSound;
    maxWaitTime;
    discardAbandonedAfter;
    extensionNumber;
    timeoutDestination;
    agentExtensions;
    etag;
}
exports.UpsertQueueDto = UpsertQueueDto;
__decorate([
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_-]+$/),
    __metadata("design:type", String)
], UpsertQueueDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertQueueDto.prototype, "domain", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertQueueDto.prototype, "strategy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertQueueDto.prototype, "mohSound", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertQueueDto.prototype, "maxWaitTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertQueueDto.prototype, "discardAbandonedAfter", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertQueueDto.prototype, "extensionNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", DestDto)
], UpsertQueueDto.prototype, "timeoutDestination", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], UpsertQueueDto.prototype, "agentExtensions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertQueueDto.prototype, "etag", void 0);
//# sourceMappingURL=upsert-queue.dto.js.map