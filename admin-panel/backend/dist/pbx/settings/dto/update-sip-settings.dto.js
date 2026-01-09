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
exports.UpdateSipSettingsDto = void 0;
const class_validator_1 = require("class-validator");
class UpdateSipSettingsDto {
    internalSipPort;
    externalSipPort;
    internalTlsPort;
    externalTlsPort;
    internalSslEnable;
    externalSslEnable;
    internalAuthCalls;
    externalAuthCalls;
    etag;
}
exports.UpdateSipSettingsDto = UpdateSipSettingsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSipSettingsDto.prototype, "internalSipPort", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSipSettingsDto.prototype, "externalSipPort", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSipSettingsDto.prototype, "internalTlsPort", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSipSettingsDto.prototype, "externalTlsPort", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateSipSettingsDto.prototype, "internalSslEnable", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateSipSettingsDto.prototype, "externalSslEnable", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateSipSettingsDto.prototype, "internalAuthCalls", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateSipSettingsDto.prototype, "externalAuthCalls", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSipSettingsDto.prototype, "etag", void 0);
//# sourceMappingURL=update-sip-settings.dto.js.map