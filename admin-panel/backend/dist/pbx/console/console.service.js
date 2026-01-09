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
var ConsoleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const net = __importStar(require("node:net"));
let ConsoleService = ConsoleService_1 = class ConsoleService {
    logger = new common_1.Logger(ConsoleService_1.name);
    host;
    port;
    password;
    stop = false;
    socket = null;
    lines = [];
    maxLines = 2500;
    constructor(config) {
        this.host = config.get('ESL_HOST') ?? '127.0.0.1';
        this.port = Number(config.get('ESL_PORT') ?? '8021');
        this.password = config.get('ESL_PASSWORD') ?? 'ClueCon';
    }
    onModuleInit() {
        void this.runLoop();
    }
    onModuleDestroy() {
        this.stop = true;
        try {
            this.socket?.destroy();
        }
        catch {
        }
        this.socket = null;
    }
    tail(sinceTs, limit) {
        const since = Number.isFinite(sinceTs) ? sinceTs : 0;
        const lim = Math.min(500, Math.max(1, Number.isFinite(limit) ? limit : 200));
        const out = this.lines.filter((x) => x.ts > since);
        return {
            now: Date.now(),
            items: out.slice(-lim),
        };
    }
    push(text) {
        const ts = Date.now();
        this.lines.push({ ts, text });
        if (this.lines.length > this.maxLines) {
            this.lines.splice(0, this.lines.length - this.maxLines);
        }
    }
    async runLoop() {
        let backoffMs = 500;
        while (!this.stop) {
            try {
                await this.connectAndStream();
                backoffMs = 500;
            }
            catch (e) {
                this.push(`[console] ESL disconnected: ${e?.message ?? String(e)}`);
                this.logger.warn(`ESL disconnected: ${e?.message ?? e}`);
                try {
                    this.socket?.destroy();
                }
                catch {
                }
                this.socket = null;
                await new Promise((r) => setTimeout(r, backoffMs));
                backoffMs = Math.min(8000, Math.floor(backoffMs * 1.5));
            }
        }
    }
    async connectAndStream() {
        const socket = new net.Socket();
        socket.setNoDelay(true);
        socket.setTimeout(0);
        this.socket = socket;
        await new Promise((resolve, reject) => {
            socket.once('error', reject);
            socket.connect(this.port, this.host, () => resolve());
        });
        await this.readFrame(socket);
        socket.write(`auth ${this.password}\n\n`);
        const auth = await this.readFrame(socket);
        const authText = (auth.body || '').trim() || (auth.headers['reply-text'] ?? '');
        if (!authText.startsWith('+OK'))
            throw new Error(`ESL auth failed: ${authText}`);
        socket.write('log 7\n\n');
        this.push('[console] connected (log 7)');
        while (!this.stop) {
            const frame = await this.readFrame(socket);
            const body = (frame.body ?? '').trim();
            const text = body || String(frame.headers['reply-text'] ?? '').trim();
            if (text)
                this.push(text);
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
                socket.removeListener('close', onClose);
            };
            const onError = (err) => {
                cleanup();
                reject(err);
            };
            const onClose = () => {
                cleanup();
                reject(new Error('ESL socket closed'));
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
                    const lines = headerRaw
                        .split(/\r?\n/)
                        .map((l) => l.trim())
                        .filter(Boolean);
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
            socket.on('data', onData);
            socket.once('error', onError);
            socket.once('close', onClose);
        });
    }
};
exports.ConsoleService = ConsoleService;
exports.ConsoleService = ConsoleService = ConsoleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ConsoleService);
//# sourceMappingURL=console.service.js.map