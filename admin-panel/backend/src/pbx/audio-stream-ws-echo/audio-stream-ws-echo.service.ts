import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';

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

        this.wss = new WebSocketServer({ port });
        // eslint-disable-next-line no-console
        console.log(`🎧 mod_audio_stream WS echo listening: ws://0.0.0.0:${port}/echo`);

        this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
            const url = String(req.url ?? '/');
            if (!url.includes('echo')) {
                ws.close(1008, 'Only /echo supported');
                return;
            }

            // eslint-disable-next-line no-console
            console.log(
                `[ws-echo] connected url=${url} remote=${req.socket?.remoteAddress ?? 'unknown'}:${req.socket?.remotePort ?? 'unknown'}`,
            );

            let sampleRate = 8000;
            let binaryFrames = 0;

            ws.on('message', (data, isBinary) => {
                // First message can be metadata text. We optionally parse sampleRate from it.
                if (!isBinary) {
                    try {
                        const s = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
                        const j = JSON.parse(s);
                        const sr = Number(j?.sampleRate ?? j?.rate ?? j?.data?.sampleRate);
                        if (sr === 8000 || sr === 16000) sampleRate = sr;
                        // eslint-disable-next-line no-console
                        console.log(`[ws-echo] metadata sampleRate=${sampleRate}`);
                    } catch {
                        // ignore
                    }
                    return;
                }

                try {
                    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
                    binaryFrames += 1;
                    if (binaryFrames === 1 || binaryFrames % 100 === 0) {
                        // eslint-disable-next-line no-console
                        console.log(`[ws-echo] rx frame#${binaryFrames} bytes=${buf.length} sampleRate=${sampleRate}`);
                    }
                    const msg = {
                        type: 'streamAudio',
                        data: {
                            audioDataType: 'raw',
                            sampleRate,
                            audioData: buf.toString('base64'),
                        },
                    };
                    ws.send(JSON.stringify(msg));
                } catch {
                    // ignore
                }
            });

            ws.on('close', (code, reason) => {
                // eslint-disable-next-line no-console
                console.log(`[ws-echo] closed code=${code} reason=${String(reason)} frames=${binaryFrames}`);
            });
        });
    }
}


