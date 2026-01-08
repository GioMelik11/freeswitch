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
exports.UpsertIvrDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class IvrEntryDto {
    digits;
    type;
    target;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], IvrEntryDto.prototype, "digits", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['transfer', 'queue', 'ivr', 'app']),
    __metadata("design:type", String)
], IvrEntryDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], IvrEntryDto.prototype, "target", void 0);
class UpsertIvrDto {
    name;
    greetLong;
    greetShort;
    invalidSound;
    exitSound;
    timeout;
    interDigitTimeout;
    maxFailures;
    maxTimeouts;
    digitLen;
    entries;
    etag;
}
exports.UpsertIvrDto = UpsertIvrDto;
__decorate([
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_-]+$/),
    __metadata("design:type", String)
], UpsertIvrDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertIvrDto.prototype, "greetLong", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertIvrDto.prototype, "greetShort", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertIvrDto.prototype, "invalidSound", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertIvrDto.prototype, "exitSound", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertIvrDto.prototype, "timeout", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertIvrDto.prototype, "interDigitTimeout", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertIvrDto.prototype, "maxFailures", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertIvrDto.prototype, "maxTimeouts", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertIvrDto.prototype, "digitLen", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => IvrEntryDto),
    __metadata("design:type", Array)
], UpsertIvrDto.prototype, "entries", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertIvrDto.prototype, "etag", void 0);
//# sourceMappingURL=upsert-ivr.dto.js.map