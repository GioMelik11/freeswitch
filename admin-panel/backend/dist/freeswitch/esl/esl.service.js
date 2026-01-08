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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EslService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const net = __importStar(require("node:net"));
let EslService = class EslService {
    host;
    port;
    password;
    timeoutMs;
    constructor(config) {
        this.host = config.get('ESL_HOST') ?? 'host.docker.internal';
        this.port = Number(config.get('ESL_PORT') ?? '8021');
        this.password = config.get('ESL_PASSWORD') ?? 'ClueCon';
        this.timeoutMs = Number(config.get('ESL_TIMEOUT_MS') ?? '2500');
    }
    async api(command) {
        const socket = new net.Socket();
        socket.setNoDelay(true);
        try {
            await new Promise((resolve, reject) => {
                let done = false;
                const t = setTimeout(() => {
                    if (done)
                        return;
                    done = true;
                    socket.destroy(new Error('ESL connect timeout'));
                    reject(new Error('ESL connect timeout'));
                }, this.timeoutMs);
                socket.once('error', (err) => {
                    if (done)
                        return;
                    done = true;
                    clearTimeout(t);
                    reject(err);
                });
                socket.connect(this.port, this.host, () => {
                    if (done)
                        return;
                    done = true;
                    clearTimeout(t);
                    resolve();
                });
            });
            await this.readFrame(socket);
            socket.write(`auth ${this.password}\n\n`);
            const auth = await this.readFrame(socket);
            const authText = (auth.body || '').trim() || (auth.headers['reply-text'] ?? '');
            if (!authText.startsWith('+OK')) {
                throw new Error(`ESL auth failed: ${authText}`);
            }
            socket.write(`api ${command}\n\n`);
            const res = await this.readFrame(socket);
            if (!res.body && res.headers['reply-text']) {
                return { ...res, body: res.headers['reply-text'] };
            }
            return res;
        }
        catch (e) {
            throw new common_1.InternalServerErrorException(e?.message ?? 'ESL error');
        }
        finally {
            socket.destroy();
        }
    }
    readFrame(socket) {
        return new Promise((resolve, reject) => {
            let buf = Buffer.alloc(0);
            let headerDone = false;
            let headers = {};
            let contentLength = 0;
            const cleanup = () => {
                socket.removeListener('data', onData);
                socket.removeListener('error', onError);
                socket.removeListener('timeout', onTimeout);
            };
            const onTimeout = () => {
                cleanup();
                reject(new Error('ESL read timeout'));
            };
            const onError = (err) => {
                cleanup();
                reject(err);
            };
            const tryParse = () => {
                if (!headerDone) {
                    const idxRN = buf.indexOf('\r\n\r\n');
                    const idxNN = buf.indexOf('\n\n');
                    const idx = idxRN !== -1 ? idxRN : idxNN;
                    const sepLen = idxRN !== -1 ? 4 : 2;
                    if (idx === -1)
                        return;
                    const headerRaw = buf.slice(0, idx).toString('utf8');
                    const lines = headerRaw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                    headers = {};
                    for (const line of lines) {
                        const s = line.indexOf(':');
                        if (s === -1)
                            continue;
                        const k = line.slice(0, s).trim().toLowerCase();
                        const v = line.slice(s + 1).trim();
                        headers[k] = v;
                    }
                    contentLength = Number(headers['content-length'] ?? '0');
                    headerDone = true;
                    buf = buf.slice(idx + sepLen);
                }
                if (headerDone) {
                    if (contentLength > 0) {
                        if (buf.length < contentLength)
                            return;
                        const body = buf.slice(0, contentLength).toString('utf8');
                        cleanup();
                        resolve({ headers, body });
                        return;
                    }
                    const body = buf.toString('utf8');
                    cleanup();
                    resolve({ headers, body });
                }
            };
            const onData = (chunk) => {
                buf = Buffer.concat([buf, chunk]);
                tryParse();
            };
            socket.setTimeout(this.timeoutMs, onTimeout);
            socket.on('data', onData);
            socket.once('error', onError);
        });
    }
};
exports.EslService = EslService;
exports.EslService = EslService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EslService);
//# sourceMappingURL=esl.service.js.map