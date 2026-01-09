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
exports.AudioStreamTestService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const ws_1 = require("ws");
let AudioStreamTestService = class AudioStreamTestService {
    config;
    wss = null;
    loggedIn = 0;
    constructor(config) {
        this.config = config;
    }
    onModuleInit() {
        const enabled = String(this.config.get('AUDIO_STREAM_TEST_ENABLED') ?? 'true') !== 'false';
        if (!enabled)
            return;
        const port = Number(this.config.get('AUDIO_STREAM_TEST_PORT') ?? 9096);
        const soundDir = String(this.config.get('FS_SOUND_DIR') ?? '/usr/share/freeswitch/sounds') ||
            '/usr/share/freeswitch/sounds';
        const rel = String(this.config.get('AUDIO_STREAM_TEST_WAV') ?? 'ivr/incoming.wav');
        const wavCandidates = [
            path.resolve(soundDir, rel),
            path.resolve(soundDir, 'sounds', rel),
        ];
        const wavPath = wavCandidates.find((p) => fs.existsSync(p)) ?? wavCandidates[0];
        this.wss = new ws_1.WebSocketServer({ port });
        console.log(`🧪 mod_audio_stream test WS server listening: ws://0.0.0.0:${port} (file=${wavPath})`);
        this.wss.on('connection', (ws, req) => {
            const remote = req.socket.remoteAddress || '';
            const url = String(req.url ?? '/');
            const mode = url.includes('echo') ? 'echo' : 'wav';
            console.log(`🧪 test WS connected from ${remote} path=${url} mode=${mode}`);
            ws.on('message', (data, isBinary) => {
                if (this.loggedIn >= 5)
                    return;
                this.loggedIn++;
                try {
                    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
                    const s = buf.toString();
                    console.log(`🧪 FS->WS msg#${this.loggedIn} bytes=${buf.length} bin=${isBinary} ${s.slice(0, 400)}`);
                }
                catch (e) {
                    console.log(`🧪 FS->WS msg#${this.loggedIn} (unprintable) err=${e?.message ?? e}`);
                }
            });
            if (mode === 'echo') {
                ws.on('message', (data, isBinary) => {
                    if (!isBinary)
                        return;
                    try {
                        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
                        if (ws.readyState !== ws.OPEN)
                            return;
                        ws.send(buf);
                    }
                    catch {
                    }
                });
                return;
            }
            try {
                const wav = fs.readFileSync(wavPath);
                const { pcm, sampleRate } = this.extractWavPcm16Mono(wav);
                const pcm16k = sampleRate === 16000 ? pcm : this.resamplePcm16(pcm, sampleRate, 16000);
                const frameBytes = 640;
                let offset = 0;
                console.log(`🧪 WS->FS streaming raw pcm16: in_sr=${sampleRate} out_sr=16000 bytes=${pcm16k.length} frameBytes=${frameBytes}`);
                const iv = setInterval(() => {
                    try {
                        if (ws.readyState !== ws.OPEN) {
                            clearInterval(iv);
                            return;
                        }
                        if (offset >= pcm16k.length) {
                            clearInterval(iv);
                            return;
                        }
                        const chunk = pcm16k.subarray(offset, offset + frameBytes);
                        offset += frameBytes;
                        ws.send(chunk);
                    }
                    catch {
                        clearInterval(iv);
                    }
                }, 20);
                ws.on('close', () => clearInterval(iv));
            }
            catch (e) {
                console.error(`🧪 test WS failed to read/send wav: ${e?.message ?? e}`);
            }
        });
    }
    extractWavPcm16Mono(wav) {
        if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF') {
            return { pcm: wav, sampleRate: 16000 };
        }
        const sampleRate = wav.readUInt32LE(24) || 16000;
        const channels = wav.readUInt16LE(22) || 1;
        const bits = wav.readUInt16LE(34) || 16;
        if (channels !== 1 || bits !== 16) {
        }
        const pcm = wav.subarray(44);
        return { pcm, sampleRate };
    }
    resamplePcm16(pcm, fromRate, toRate) {
        if (fromRate === toRate)
            return pcm;
        const inSamples = pcm.length / 2;
        const outSamples = Math.max(1, Math.floor(inSamples * (toRate / fromRate)));
        const out = Buffer.alloc(outSamples * 2);
        for (let i = 0; i < outSamples; i++) {
            const t = i * (fromRate / toRate);
            const i0 = Math.floor(t);
            const i1 = Math.min(inSamples - 1, i0 + 1);
            const frac = t - i0;
            const s0 = pcm.readInt16LE(i0 * 2);
            const s1 = pcm.readInt16LE(i1 * 2);
            const v = Math.round(s0 + (s1 - s0) * frac);
            out.writeInt16LE(Math.max(-32768, Math.min(32767, v)), i * 2);
        }
        return out;
    }
};
exports.AudioStreamTestService = AudioStreamTestService;
exports.AudioStreamTestService = AudioStreamTestService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AudioStreamTestService);
//# sourceMappingURL=audio-stream-test.service.js.map