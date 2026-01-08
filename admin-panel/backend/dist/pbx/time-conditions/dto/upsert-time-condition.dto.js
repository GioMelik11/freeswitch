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
exports.UpsertTimeConditionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class DestDto {
    type;
    target;
}
__decorate([
    (0, class_validator_1.IsIn)(['transfer', 'ivr', 'queue']),
    __metadata("design:type", String)
], DestDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DestDto.prototype, "target", void 0);
class UpsertTimeConditionDto {
    name;
    extensionNumber;
    days;
    startHour;
    endHour;
    onMatch;
    onElse;
    etag;
}
exports.UpsertTimeConditionDto = UpsertTimeConditionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertTimeConditionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertTimeConditionDto.prototype, "extensionNumber", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], UpsertTimeConditionDto.prototype, "days", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(23),
    __metadata("design:type", Number)
], UpsertTimeConditionDto.prototype, "startHour", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(23),
    __metadata("design:type", Number)
], UpsertTimeConditionDto.prototype, "endHour", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => DestDto),
    __metadata("design:type", DestDto)
], UpsertTimeConditionDto.prototype, "onMatch", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => DestDto),
    __metadata("design:type", DestDto)
], UpsertTimeConditionDto.prototype, "onElse", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertTimeConditionDto.prototype, "etag", void 0);
//# sourceMappingURL=upsert-time-condition.dto.js.map