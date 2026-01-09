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
exports.ConsoleController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const esl_service_1 = require("../../freeswitch/esl/esl.service");
const run_console_command_dto_1 = require("./dto/run-console-command.dto");
const console_service_1 = require("./console.service");
let ConsoleController = class ConsoleController {
    esl;
    consoleSvc;
    constructor(esl, consoleSvc) {
        this.esl = esl;
        this.consoleSvc = consoleSvc;
    }
    async run(dto) {
        const cmd = String(dto.command ?? '').trim();
        if (!cmd)
            return { ok: false, output: '' };
        if (cmd.includes('\n') || cmd.includes('\r')) {
            return { ok: false, output: 'Invalid command: newlines are not allowed.' };
        }
        const res = await this.esl.api(cmd);
        return { ok: true, output: res.body ?? '' };
    }
    tail(since, limit) {
        const sinceTs = Number(since ?? '0') || 0;
        const lim = Number(limit ?? '200') || 200;
        return this.consoleSvc.tail(sinceTs, lim);
    }
};
exports.ConsoleController = ConsoleController;
__decorate([
    (0, common_1.Post)('run'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [run_console_command_dto_1.RunConsoleCommandDto]),
    __metadata("design:returntype", Promise)
], ConsoleController.prototype, "run", null);
__decorate([
    (0, common_1.Get)('tail'),
    __param(0, (0, common_1.Query)('since')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ConsoleController.prototype, "tail", null);
exports.ConsoleController = ConsoleController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('pbx/console'),
    __metadata("design:paramtypes", [esl_service_1.EslService,
        console_service_1.ConsoleService])
], ConsoleController);
//# sourceMappingURL=console.controller.js.map