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
exports.UpsertTrunkDto = void 0;
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
class OutgoingDto {
    type;
    sound;
    ivr;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OutgoingDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OutgoingDto.prototype, "sound", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OutgoingDto.prototype, "ivr", void 0);
class PrefixRuleDto {
    enabled;
    prefix;
    prepend;
    description;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PrefixRuleDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PrefixRuleDto.prototype, "prefix", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PrefixRuleDto.prototype, "prepend", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PrefixRuleDto.prototype, "description", void 0);
class UpsertTrunkDto {
    name;
    register;
    username;
    password;
    realm;
    proxy;
    fromUser;
    fromDomain;
    extension;
    transport;
    inboundDestination;
    outgoingDefault;
    prefixRules;
    etag;
}
exports.UpsertTrunkDto = UpsertTrunkDto;
__decorate([
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_-]+$/),
    __metadata("design:type", String)
], UpsertTrunkDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpsertTrunkDto.prototype, "register", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertTrunkDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertTrunkDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertTrunkDto.prototype, "realm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertTrunkDto.prototype, "proxy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertTrunkDto.prototype, "fromUser", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertTrunkDto.prototype, "fromDomain", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertTrunkDto.prototype, "extension", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertTrunkDto.prototype, "transport", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", DestDto)
], UpsertTrunkDto.prototype, "inboundDestination", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", OutgoingDto)
], UpsertTrunkDto.prototype, "outgoingDefault", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], UpsertTrunkDto.prototype, "prefixRules", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertTrunkDto.prototype, "etag", void 0);
//# sourceMappingURL=upsert-trunk.dto.js.map