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
            // eslint-disable-next-line no-console
            console.log(`🧪 test WS connected from ${remote} path=${req.url ?? '/'}`);
            try {
                const wav = fs.readFileSync(wavPath);
                // If it's a WAV file, mirror its declared sample rate to avoid mismatches.
                let sr = 8000;
                try {
                    if (wav.length >= 28 && wav.toString('ascii', 0, 4) === 'RIFF') {
                        sr = wav.readUInt32LE(24) || sr;
                    }
                } catch {
                    // ignore
                }
                const payload = {
                    type: 'streamAudio',
                    data: {
                        audioDataType: 'wav',
                        sampleRate: sr,
                        audioData: wav.toString('base64'),
                    },
                };
                ws.send(JSON.stringify(payload));
                // Send twice to make it obvious even if first chunk is missed.
                setTimeout(() => {
                    try {
                        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
                    } catch {
                        // ignore
                    }
                }, 700);
            } catch (e: any) {
                // eslint-disable-next-line no-console
                console.error(`🧪 test WS failed to read/send wav: ${e?.message ?? e}`);
            }
        });
    }
}


