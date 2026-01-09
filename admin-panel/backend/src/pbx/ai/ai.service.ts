import { BadRequestException, Injectable } from '@nestjs/common';
import { FilesService } from '../../files/files.service';
import { PbxMetaService } from '../meta/pbx-meta.service';
import * as crypto from 'node:crypto';

const VARS_PATH = 'vars.xml';

@Injectable()
export class AiService {
  constructor(
    private readonly files: FilesService,
    private readonly meta: PbxMetaService,
  ) {}

  getSettings() {
    const read = this.files.readFile(VARS_PATH);
    const audioStreamUrl =
      getPreProcessVar(read.content, 'audio_stream_url') ?? '';
    return { etag: read.etag, audioStreamUrl };
  }

  updateSettings(input: { audioStreamUrl: string; etag?: string }) {
    const url = String(input.audioStreamUrl ?? '').trim();
    if (!url) throw new BadRequestException('audioStreamUrl is required');
    const read = this.files.readFile(VARS_PATH);
    const next = setPreProcessVar(read.content, 'audio_stream_url', url);
    return this.files.writeFile({
      path: VARS_PATH,
      content: next,
      etag: input.etag ?? read.etag,
    });
  }

  listServices() {
    const cur = this.meta.get();
    const services = (cur.meta.aiServices ?? []).map((s: any) => ({
      id: String(s.id ?? ''),
      name: String(s.name ?? ''),
      socketUrl: String(s.socketUrl ?? ''),
      enabled: s.enabled !== false,
    }));
    return {
      etag: cur.etag,
      services,
      defaultAiServiceId: cur.meta.defaultAiServiceId ?? null,
    };
  }

  upsertService(input: {
    id?: string;
    name: string;
    socketUrl?: string;
    audioStreamUrl?: string;
    enabled?: boolean;
  }) {
    const cur = this.meta.get();
    const meta = cur.meta;
    const id = (input.id && String(input.id)) || crypto.randomUUID();
    const name = String(input.name ?? '').trim();
    const socketUrl = String(
      input.socketUrl ?? input.audioStreamUrl ?? '',
    ).trim();
    if (!name) throw new BadRequestException('name is required');
    if (!socketUrl)
      throw new BadRequestException('audio_stream_url is required');
    if (!/^wss?:\/\//i.test(socketUrl))
      throw new BadRequestException(
        'audio_stream_url must start with ws:// or wss://',
      );

    const list = meta.aiServices ?? [];
    const idx = list.findIndex((x: any) => String(x.id) === id);
    const next = {
      id,
      name,
      socketUrl,
      enabled: input.enabled !== false,
    };
    if (idx >= 0) list[idx] = next as any;
    else list.push(next as any);
    meta.aiServices = list;
    if (!meta.defaultAiServiceId) meta.defaultAiServiceId = id;
    return this.meta.write(meta, cur.etag);
  }

  deleteService(id: string) {
    const cur = this.meta.get();
    const meta = cur.meta;
    meta.aiServices = (meta.aiServices ?? []).filter(
      (s: any) => String(s.id) !== String(id),
    );
    if (meta.defaultAiServiceId === id)
      meta.defaultAiServiceId = meta.aiServices[0]?.id;
    return this.meta.write(meta, cur.etag);
  }

  setDefaultService(id: string) {
    const cur = this.meta.get();
    const meta = cur.meta;
    const exists = (meta.aiServices ?? []).some(
      (s: any) => String(s.id) === String(id),
    );
    if (!exists) throw new BadRequestException('Unknown service id');
    meta.defaultAiServiceId = id;
    return this.meta.write(meta, cur.etag);
  }
}

function getPreProcessVar(xml: string, name: string): string | null {
  const re = new RegExp(
    `<X-PRE-PROCESS\\s+cmd="set"\\s+data="${escapeRegExp(name)}=([^"]*)"\\s*/?>`,
    'i',
  );
  const m = xml.match(re);
  if (!m) return null;
  return m[1] ?? null;
}

function setPreProcessVar(xml: string, name: string, value: string): string {
  const re = new RegExp(
    `(<X-PRE-PROCESS\\s+cmd="set"\\s+data="${escapeRegExp(name)}=)([^"]*)(".*?/?>)`,
    'i',
  );
  if (re.test(xml)) {
    return xml.replace(re, `$1${escapeXmlAttr(value)}$3`);
  }

  // Insert before closing </include>
  const insert = `  <X-PRE-PROCESS cmd="set" data="${name}=${escapeXmlAttr(value)}"/>\n`;
  const idx = xml.lastIndexOf('</include>');
  if (idx === -1) throw new BadRequestException('Invalid vars.xml');
  return xml.slice(0, idx) + insert + xml.slice(idx);
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeXmlAttr(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
