import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * WebSocket echo server compatible with `mod_audio_stream` "play" feature from:
 * https://github.com/sptmru/freeswitch_mod_audio_stream
 *
 * FreeSWITCH streams L16 frames to WS. To play audio back into the call,
 * the server must send JSON messages of type "streamAudio" with base64 audio.
 */
@Injectable()
export class AudioStreamWsEchoService implements OnModuleInit {
    private wss: WebSocketServer | null = null;

    constructor(private readonly config: ConfigService) { }

    onModuleInit() {
        const enabled = String(this.config.get('AUDIO_STREAM_WS_ECHO_ENABLED') ?? 'false') === 'true';
        if (!enabled) return;

        const port = Number(this.config.get('AUDIO_STREAM_WS_ECHO_PORT') ?? 9096);

        // mod_audio_stream expects no WS compression negotiation (permessage-deflate can break some setups)
        this.wss = new WebSocketServer({ port, host: '0.0.0.0', perMessageDeflate: false });

        // eslint-disable-next-line no-console
        console.log(`🎧 mod_audio_stream WS echo listening: ws://0.0.0.0:${port}/echo`);

        this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
            const url = String(req.url ?? '/');
            if (!url.includes('echo')) {
                ws.close(1008, 'Only /echo supported');
                return;
            }

            // eslint-disable-next-line no-console
            console.log(`[ws-echo] Connected url=${url}`);

            let sampleRate = 8000;
            const delayMs = Number(process.env.AUDIO_STREAM_WS_ECHO_DELAY_MS ?? 1500);
            const audioDataType = String(process.env.AUDIO_STREAM_WS_ECHO_AUDIO_DATA_TYPE ?? 'wav').toLowerCase();
            const queue: Array<{ ts: number; buf: Buffer }> = [];

            // Queue-to-WAV mode: write wav chunks into shared FS sounds directory. Lua plays/deletes them.
            const fileQueueEnabled = String(process.env.AUDIO_STREAM_WS_ECHO_FILE_QUEUE_ENABLED ?? 'false') === 'true';
            const fileQueueDir = process.env.AUDIO_STREAM_WS_ECHO_FILE_QUEUE_DIR ?? '/usr/share/freeswitch/sounds/tmp/ws-echo-q';
            const chunkMs = Number(process.env.AUDIO_STREAM_WS_ECHO_FILE_QUEUE_CHUNK_MS ?? 100);
            const callId = (() => {
                // Expect ws://host:port/echo/<uuid> (or /echo?call=<uuid>)
                const m = url.match(/\/echo\/([^/?#]+)/);
                if (m && m[1]) return m[1];
                const q = url.match(/[?&]call=([^&]+)/);
                if (q && q[1]) return q[1];
                return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
            })();
            const callOutDir = path.join(fileQueueDir, callId);
            if (fileQueueEnabled) {
                fs.mkdirSync(callOutDir, { recursive: true });
                // eslint-disable-next-line no-console
                console.log(`[ws-echo] file-queue enabled dir=${callOutDir}`);
            }
            let outSeq = 0;
            let outBuf = Buffer.alloc(0);

            const pcmToWav = (pcm: Buffer, sr: number) => {
                const channels = 1;
                const bitsPerSample = 16;
                const byteRate = sr * channels * (bitsPerSample / 8);
                const blockAlign = channels * (bitsPerSample / 8);
                const header = Buffer.alloc(44);
                header.write('RIFF', 0);
                header.writeUInt32LE(36 + pcm.length, 4);
                header.write('WAVE', 8);
                header.write('fmt ', 12);
                header.writeUInt32LE(16, 16); // PCM
                header.writeUInt16LE(1, 20); // audio format PCM
                header.writeUInt16LE(channels, 22);
                header.writeUInt32LE(sr, 24);
                header.writeUInt32LE(byteRate, 28);
                header.writeUInt16LE(blockAlign, 32);
                header.writeUInt16LE(bitsPerSample, 34);
                header.write('data', 36);
                header.writeUInt32LE(pcm.length, 40);
                return Buffer.concat([header, pcm]);
            };

            ws.on('message', (data, isBinary) => {
                // First message can be metadata text. We optionally parse sampleRate from it.
                if (!isBinary) {
                    try {
                        const s = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
                        const j = JSON.parse(s);
                        const sr = Number(j?.sampleRate ?? j?.rate ?? j?.data?.sampleRate);
                        if (sr === 8000 || sr === 16000) sampleRate = sr;
                    } catch {
                        // ignore
                    }
                    return;
                }

                const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
                const now = Date.now();
                queue.push({ ts: now, buf });

                // Hold a little buffer before echoing back (helps audibility with some endpoints).
                while (queue.length && (now - queue[0].ts) >= delayMs) {
                    const out = queue.shift()!.buf;

                    // FILE QUEUE MODE (your requested approach): write WAV chunks for Lua to play/delete.
                    if (fileQueueEnabled) {
                        outBuf = Buffer.concat([outBuf, out]);
                        const bytesPerChunk = Math.max(1, Math.floor(sampleRate * (chunkMs / 1000) * 2)); // 16-bit mono
                        while (outBuf.length >= bytesPerChunk) {
                            const pcmChunk = outBuf.subarray(0, bytesPerChunk);
                            outBuf = outBuf.subarray(bytesPerChunk);
                            const wavChunk = pcmToWav(pcmChunk, sampleRate);
                            const fname = `chunk_${String(outSeq).padStart(6, '0')}.wav`;
                            const fpath = path.join(callOutDir, fname);
                            try {
                                fs.writeFileSync(fpath, wavChunk);
                                outSeq += 1;
                            } catch (e) {
                                // eslint-disable-next-line no-console
                                console.error('[ws-echo] failed to write wav chunk', e);
                            }
                        }
                        continue;
                    }

                }
            });
        });

    }
}


