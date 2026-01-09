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

        const wss = new WebSocketServer({ port });

        wss.on('connection', (ws) => {
            console.log('Connected');
            ws.on('message', (data) => {
                if (Buffer.isBuffer(data)) {
                    ws.send(data);  // Echo raw audio back (assumes L16)
                } else {
                    console.log('Text:', data.toString());
                }
            });
        });

    }
}


