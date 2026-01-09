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
exports.UpdateAdvancedSettingsDto = void 0;
const class_validator_1 = require("class-validator");
class UpdateAdvancedSettingsDto {
    defaultPassword;
    holdMusic;
    globalCodecPrefs;
    outboundCodecPrefs;
    rtpStartPort;
    rtpEndPort;
    consoleLoglevel;
    callDebug;
    rtpDebug;
    mediaDebug;
    sipTlsVersion;
    sipTlsCiphers;
    recordingsDir;
    presencePrivacy;
    etag;
}
exports.UpdateAdvancedSettingsDto = UpdateAdvancedSettingsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAdvancedSettingsDto.prototype, "defaultPassword", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAdvancedSettingsDto.prototype, "holdMusic", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAdvancedSettingsDto.prototype, "globalCodecPrefs", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAdvancedSettingsDto.prototype, "outboundCodecPrefs", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAdvancedSettingsDto.prototype, "rtpStartPort", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAdvancedSettingsDto.prototype, "rtpEndPort", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAdvancedSettingsDto.prototype, "consoleLoglevel", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateAdvancedSettingsDto.prototype, "callDebug", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateAdvancedSettingsDto.prototype, "rtpDebug", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateAdvancedSettingsDto.prototype, "mediaDebug", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAdvancedSettingsDto.prototype, "sipTlsVersion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAdvancedSettingsDto.prototype, "sipTlsCiphers", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAdvancedSettingsDto.prototype, "recordingsDir", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAdvancedSettingsDto.prototype, "presencePrivacy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAdvancedSettingsDto.prototype, "etag", void 0);
//# sourceMappingURL=update-advanced-settings.dto.js.map