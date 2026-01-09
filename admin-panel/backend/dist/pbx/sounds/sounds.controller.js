"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoundsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const sounds_service_1 = require("./sounds.service");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
let SoundsController = class SoundsController {
    sounds;
    constructor(sounds) {
        this.sounds = sounds;
    }
    index() {
        return this.sounds.getIndex();
    }
    list(category) {
        return this.sounds.list(category);
    }
    mkdir(dir) {
        this.sounds.ensureDir(dir);
        return { ok: true };
    }
    upload(file, category, dir) {
        if (!file)
            return { ok: false, message: 'No file' };
        const filename = this.sounds.sanitizeFilename(file.originalname);
        const targetDir = dir
            ? this.sounds.ensureDir(dir)
            : this.sounds.ensureCategoryDir(category);
        const dst = path.join(targetDir, filename);
        fs.writeFileSync(dst, file.buffer);
        const all = this.sounds.getIndex().all;
        const rel = this.sounds.toRelPath(dst);
        const item = all.find((x) => x.relPath === rel) ??
            all.find((x) => x.file === filename);
        return { ok: true, item };
    }
};
exports.SoundsController = SoundsController;
__decorate([
    (0, common_1.Get)('index'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoundsController.prototype, "index", null);
__decorate([
    (0, common_1.Get)('list'),
    __param(0, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoundsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('mkdir'),
    __param(0, (0, common_1.Query)('dir')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoundsController.prototype, "mkdir", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('dir')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], SoundsController.prototype, "upload", null);
exports.SoundsController = SoundsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('pbx/sounds'),
    __metadata("design:paramtypes", [sounds_service_1.SoundsService])
], SoundsController);
//# sourceMappingURL=sounds.controller.js.map