import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PbxMetaV1 } from './pbx-meta.types';

@Injectable()
export class PbxMetaService {
  private readonly metaPath: string;

  constructor(config: ConfigService) {
    const dataDir = config.get<string>('DATA_DIR') ?? '/data';
    const override = config.get<string>('PBX_META_PATH');
    this.metaPath = override
      ? path.resolve(override)
      : path.resolve(dataDir, 'pbx-meta.json');
  }

  private sha256(s: string) {
    return crypto.createHash('sha256').update(s).digest('hex');
  }

  private defaultMeta(): PbxMetaV1 {
    return {
      version: 1,
      queues: {},
      trunks: {},
      aiServices: [],
      defaultAiServiceId: undefined,
      defaultTrunkName: undefined,
    };
  }

  get(): { meta: PbxMetaV1; etag: string } {
    if (!fs.existsSync(this.metaPath)) {
      const meta = this.defaultMeta();
      const content = JSON.stringify(meta, null, 2) + '\n';
      fs.mkdirSync(path.dirname(this.metaPath), { recursive: true });
      fs.writeFileSync(this.metaPath, content, 'utf8');
      return { meta, etag: this.sha256(content) };
    }

    const content = fs.readFileSync(this.metaPath, 'utf8');
    const parsed = JSON.parse(content || '{}');
    const meta: PbxMetaV1 =
      parsed && parsed.version === 1
        ? parsed
        : { ...this.defaultMeta(), ...(parsed ?? {}) };
    meta.queues = meta.queues ?? {};
    meta.trunks = meta.trunks ?? {};
    meta.aiServices = meta.aiServices ?? [];
    meta.defaultTrunkName = meta.defaultTrunkName ?? undefined;
    return { meta, etag: this.sha256(content) };
  }

  write(meta: PbxMetaV1, etag?: string) {
    const current = this.get();
    if (etag && etag !== current.etag) {
      throw new ConflictException(
        'PBX meta changed since last read (etag mismatch)',
      );
    }
    const content = JSON.stringify(meta, null, 2) + '\n';
    fs.mkdirSync(path.dirname(this.metaPath), { recursive: true });
    const tmp = this.metaPath + '.tmp';
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, this.metaPath);
    return { ok: true as const, etag: this.sha256(content) };
  }

  upsertQueueMeta(
    fullName: string,
    patch: { extensionNumber?: string; timeoutDestination?: any },
  ) {
    const cur = this.get();
    const meta = cur.meta;
    meta.queues[fullName] = {
      ...(meta.queues[fullName] ?? {}),
      ...patch,
    };
    return this.write(meta, cur.etag);
  }

  deleteQueueMeta(fullName: string) {
    const cur = this.get();
    const meta = cur.meta;
    if (meta.queues[fullName]) delete meta.queues[fullName];
    return this.write(meta, cur.etag);
  }

  upsertTrunkMeta(
    name: string,
    patch: {
      inboundDestination?: any;
      outgoingDefault?: any;
      prefixRules?: any[];
    },
  ) {
    const cur = this.get();
    const meta = cur.meta;
    meta.trunks[name] = {
      ...(meta.trunks[name] ?? {}),
      ...patch,
    };
    return this.write(meta, cur.etag);
  }

  deleteTrunkMeta(name: string) {
    const cur = this.get();
    const meta = cur.meta;
    if (meta.trunks[name]) delete meta.trunks[name];
    if (meta.defaultTrunkName === name) meta.defaultTrunkName = undefined;
    return this.write(meta, cur.etag);
  }

  setDefaultTrunkName(name: string | undefined) {
    const cur = this.get();
    const meta = cur.meta;
    meta.defaultTrunkName = name ? String(name) : undefined;
    return this.write(meta, cur.etag);
  }
}
