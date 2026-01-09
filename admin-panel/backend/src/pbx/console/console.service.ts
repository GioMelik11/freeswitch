import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'node:net';

export type ConsoleLine = { ts: number; text: string };

@Injectable()
export class ConsoleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConsoleService.name);
  private readonly host: string;
  private readonly port: number;
  private readonly password: string;

  private stop = false;
  private socket: net.Socket | null = null;
  private lines: ConsoleLine[] = [];
  private maxLines = 2500;

  constructor(config: ConfigService) {
    this.host = config.get<string>('ESL_HOST') ?? '127.0.0.1';
    this.port = Number(config.get<string>('ESL_PORT') ?? '8021');
    this.password = config.get<string>('ESL_PASSWORD') ?? 'ClueCon';
  }

  onModuleInit() {
    // fire-and-forget background stream
    void this.runLoop();
  }

  onModuleDestroy() {
    this.stop = true;
    try {
      this.socket?.destroy();
    } catch {
      // ignore
    }
    this.socket = null;
  }

  tail(sinceTs: number, limit: number) {
    const since = Number.isFinite(sinceTs) ? sinceTs : 0;
    const lim = Math.min(500, Math.max(1, Number.isFinite(limit) ? limit : 200));
    const out = this.lines.filter((x) => x.ts > since);
    return {
      now: Date.now(),
      items: out.slice(-lim),
    };
  }

  private push(text: string) {
    const ts = Date.now();
    this.lines.push({ ts, text });
    if (this.lines.length > this.maxLines) {
      this.lines.splice(0, this.lines.length - this.maxLines);
    }
  }

  private async runLoop() {
    let backoffMs = 500;
    while (!this.stop) {
      try {
        await this.connectAndStream();
        backoffMs = 500;
      } catch (e: any) {
        this.push(`[console] ESL disconnected: ${e?.message ?? String(e)}`);
        this.logger.warn(`ESL disconnected: ${e?.message ?? e}`);
        try {
          this.socket?.destroy();
        } catch {
          // ignore
        }
        this.socket = null;
        await new Promise((r) => setTimeout(r, backoffMs));
        backoffMs = Math.min(8000, Math.floor(backoffMs * 1.5));
      }
    }
  }

  private async connectAndStream() {
    const socket = new net.Socket();
    socket.setNoDelay(true);
    socket.setTimeout(0);
    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      socket.once('error', reject);
      socket.connect(this.port, this.host, () => resolve());
    });

    // wait for auth/request
    await this.readFrame(socket);
    socket.write(`auth ${this.password}\n\n`);
    const auth = await this.readFrame(socket);
    const authText = (auth.body || '').trim() || (auth.headers['reply-text'] ?? '');
    if (!authText.startsWith('+OK')) throw new Error(`ESL auth failed: ${authText}`);

    // Subscribe to events. "plain ALL" is closest to fs_cli live view.
    socket.write('event plain ALL\n\n');
    this.push('[console] connected (event plain ALL)');

    // stream loop
    while (!this.stop) {
      const frame = await this.readFrame(socket);
      const eventName = frame.headers['event-name'] ?? frame.headers['content-type'] ?? '';
      const body = (frame.body ?? '').trim();
      const text = body
        ? `${eventName}\n${body}`
        : `${eventName} ${frame.headers['reply-text'] ?? ''}`.trim();
      if (text) this.push(text);
    }
  }

  private readFrame(socket: net.Socket): Promise<{ headers: Record<string, string>; body: string }> {
    return new Promise((resolve, reject) => {
      let buf = Buffer.alloc(0);
      let headerDone = false;
      let headers: Record<string, string> = {};
      let contentLength = 0;

      const cleanup = () => {
        socket.removeListener('data', onData);
        socket.removeListener('error', onError);
        socket.removeListener('close', onClose);
      };

      const onError = (err: any) => {
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
          if (idx === -1) return;
          const headerRaw = buf.slice(0, idx).toString('utf8');
          const lines = headerRaw
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
          headers = {};
          for (const line of lines) {
            const s = line.indexOf(':');
            if (s === -1) continue;
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
            if (buf.length < contentLength) return;
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

      const onData = (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk]);
        tryParse();
      };

      socket.on('data', onData);
      socket.once('error', onError);
      socket.once('close', onClose);
    });
  }
}


