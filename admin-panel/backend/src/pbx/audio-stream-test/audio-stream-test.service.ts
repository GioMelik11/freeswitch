import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';

/**
 * Minimal mod_audio_stream test server.
 *
 * FreeSWITCH connects via uuid_audio_stream. On connect we immediately send a
 * streamAudio message containing a WAV file (defaults to ivr/incoming.wav).
 *
 * This is for debugging playback WITHOUT involving Gemini/AI.
 */
@Injectable()
export class AudioStreamTestService implements OnModuleInit {
    private wss: WebSocketServer | null = null;
    private loggedIn = 0;

    constructor(private readonly config: ConfigService) { }

    onModuleInit() {
        const enabled =
            String(this.config.get('AUDIO_STREAM_TEST_ENABLED') ?? 'true') !== 'false';
        if (!enabled) return;

        const port = Number(this.config.get('AUDIO_STREAM_TEST_PORT') ?? 9096);
        const soundDir =
            String(this.config.get('FS_SOUND_DIR') ?? '/usr/share/freeswitch/sounds') ||
            '/usr/share/freeswitch/sounds';

        const rel = String(this.config.get('AUDIO_STREAM_TEST_WAV') ?? 'ivr/incoming.wav');
        // Some deployments mount a directory that itself contains a "sounds/" subdir.
        // Try both to be resilient:
        const wavCandidates = [
            path.resolve(soundDir, rel),
            path.resolve(soundDir, 'sounds', rel),
        ];
        const wavPath = wavCandidates.find((p) => fs.existsSync(p)) ?? wavCandidates[0];

        this.wss = new WebSocketServer({ port });
        // eslint-disable-next-line no-console
        console.log(
            `🧪 mod_audio_stream test WS server listening: ws://0.0.0.0:${port} (file=${wavPath})`,
        );

        this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
            const remote = req.socket.remoteAddress || '';
            const url = String(req.url ?? '/');
            const mode: 'wav' | 'echo' = url.includes('echo') ? 'echo' : 'wav';
            // eslint-disable-next-line no-console
            console.log(`🧪 test WS connected from ${remote} path=${url} mode=${mode}`);

            ws.on('message', (data, isBinary) => {
                if (this.loggedIn >= 5) return;
                this.loggedIn++;
                try {
                    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
                    const s = buf.toString();
                    // eslint-disable-next-line no-console
                    console.log(
                        `🧪 FS->WS msg#${this.loggedIn} bytes=${buf.length} bin=${isBinary} ${s.slice(0, 400)}`,
                    );
                } catch (e: any) {
                    // eslint-disable-next-line no-console
                    console.log(
                        `🧪 FS->WS msg#${this.loggedIn} (unprintable) err=${e?.message ?? e}`,
                    );
                }
            });

            if (mode === 'echo') {
                ws.on('message', (data, isBinary) => {
                    if (!isBinary) return;
                    try {
                        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
                        if (ws.readyState !== ws.OPEN) return;
                        // Echo back whatever FreeSWITCH sends (raw PCM16 frames).
                        ws.send(buf);
                    } catch {
                        // ignore
                    }
                });
                return;
            }
            try {
                const wav = fs.readFileSync(wavPath);
                const { pcm, sampleRate } = this.extractWavPcm16Mono(wav);
                const pcm16k =
                    sampleRate === 16000 ? pcm : this.resamplePcm16(pcm, sampleRate, 16000);

                // Stream raw PCM16 frames back to FreeSWITCH as *binary websocket frames*.
                // FreeSWITCH sends us 640-byte frames when started at 16k (20ms @ 16k mono PCM16).
                const frameBytes = 640;
                let offset = 0;

                // eslint-disable-next-line no-console
                console.log(
                    `🧪 WS->FS streaming raw pcm16: in_sr=${sampleRate} out_sr=16000 bytes=${pcm16k.length} frameBytes=${frameBytes}`,
                );

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
                    } catch {
                        clearInterval(iv);
                    }
                }, 20);

                ws.on('close', () => clearInterval(iv));
            } catch (e: any) {
                // eslint-disable-next-line no-console
                console.error(`🧪 test WS failed to read/send wav: ${e?.message ?? e}`);
            }
        });
    }

    private extractWavPcm16Mono(wav: Buffer): { pcm: Buffer; sampleRate: number } {
        // Minimal WAV parser (PCM16 mono). incoming.wav is standard RIFF/WAVE.
        if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF') {
            // assume raw PCM16 @ 16k
            return { pcm: wav, sampleRate: 16000 };
        }
        const sampleRate = wav.readUInt32LE(24) || 16000;
        const channels = wav.readUInt16LE(22) || 1;
        const bits = wav.readUInt16LE(34) || 16;
        if (channels !== 1 || bits !== 16) {
            // Best-effort: still return data chunk area.
        }
        // For standard 44-byte header, data begins at 44
        const pcm = wav.subarray(44);
        return { pcm, sampleRate };
    }

    private resamplePcm16(pcm: Buffer, fromRate: number, toRate: number): Buffer {
        if (fromRate === toRate) return pcm;
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
}


