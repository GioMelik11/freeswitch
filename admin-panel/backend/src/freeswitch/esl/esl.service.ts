import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'node:net';

type EslResponse = {
  headers: Record<string, string>;
  body: string;
};

@Injectable()
export class EslService {
  private readonly host: string;
  private readonly port: number;
  private readonly password: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.host = config.get<string>('ESL_HOST') ?? 'host.docker.internal';
    this.port = Number(config.get<string>('ESL_PORT') ?? '8021');
    this.password = config.get<string>('ESL_PASSWORD') ?? 'ClueCon';
    this.timeoutMs = Number(config.get<string>('ESL_TIMEOUT_MS') ?? '2500');
  }

  async api(command: string): Promise<EslResponse> {
    const socket = new net.Socket();
    socket.setNoDelay(true);

    try {
      // IMPORTANT: socket.setTimeout() does NOT reliably timeout TCP connect attempts.
      // Use an explicit timer so we never hang for minutes when ESL is unreachable.
      await new Promise<void>((resolve, reject) => {
        let done = false;
        const t = setTimeout(() => {
          if (done) return;
          done = true;
          socket.destroy(new Error('ESL connect timeout'));
          reject(new Error('ESL connect timeout'));
        }, this.timeoutMs);

        socket.once('error', (err) => {
          if (done) return;
          done = true;
          clearTimeout(t);
          reject(err);
        });

        socket.connect(this.port, this.host, () => {
          if (done) return;
          done = true;
          clearTimeout(t);
          resolve();
        });
      });

      // wait for auth/request
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
    } catch (e: any) {
      throw new InternalServerErrorException(e?.message ?? 'ESL error');
    } finally {
      socket.destroy();
    }
  }

  private readFrame(socket: net.Socket): Promise<EslResponse> {
    return new Promise((resolve, reject) => {
      let buf = Buffer.alloc(0);
      let headerDone = false;
      let headers: Record<string, string> = {};
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

      const onError = (err: any) => {
        cleanup();
        reject(err);
      };

      const tryParse = () => {
        if (!headerDone) {
          const idxRN = buf.indexOf('\r\n\r\n');
          const idxNN = buf.indexOf('\n\n');
          const idx = idxRN !== -1 ? idxRN : idxNN;
          const sepLen = idxRN !== -1 ? 4 : 2;
          if (idx === -1) return;
          const headerRaw = buf.slice(0, idx).toString('utf8');
          const lines = headerRaw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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
          // no content-length: use whatever we have
          const body = buf.toString('utf8');
          cleanup();
          resolve({ headers, body });
        }
      };

      const onData = (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk]);
        tryParse();
      };

      socket.setTimeout(this.timeoutMs, onTimeout);
      socket.on('data', onData);
      socket.once('error', onError);
    });
  }
}


