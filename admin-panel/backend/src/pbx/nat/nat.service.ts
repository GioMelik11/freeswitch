import { BadRequestException, Injectable } from '@nestjs/common';
import { FilesService } from '../../files/files.service';
import { isIP } from 'node:net';
import * as os from 'node:os';

const VARS_PATH = 'vars.xml';
const ACL_PATH = 'autoload_configs/acl.conf.xml';
const ACL_LIST_NAME = 'adminpanel_localnet';

@Injectable()
export class NatService {
  constructor(private readonly files: FilesService) {}

  getSettings() {
    const read = this.files.readFile(VARS_PATH);
    const externalRtpIp = getPreProcessVar(read.content, 'external_rtp_ip') ?? '';
    const externalSipIp = getPreProcessVar(read.content, 'external_sip_ip') ?? '';
    const acl = this.ensureAclList();
    return {
      etag: read.etag,
      aclEtag: acl.etag,
      externalRtpIp,
      externalSipIp,
      localNetworks: acl.localNetworks,
    };
  }

  updateSettings(input: {
    externalRtpIp: string;
    externalSipIp: string;
    localNetworks?: string[];
    etag?: string;
    aclEtag?: string;
  }) {
    const externalRtpIp = String(input.externalRtpIp ?? '').trim();
    const externalSipIp = String(input.externalSipIp ?? '').trim();

    if (!externalRtpIp) throw new BadRequestException('externalRtpIp is required');
    if (!externalSipIp) throw new BadRequestException('externalSipIp is required');

    if (!isValidNatValue(externalRtpIp)) {
      throw new BadRequestException(
        'externalRtpIp must be an IP (v4/v6) or one of: auto, auto-nat',
      );
    }
    if (!isValidNatValue(externalSipIp)) {
      throw new BadRequestException(
        'externalSipIp must be an IP (v4/v6) or one of: auto, auto-nat',
      );
    }

    const read = this.files.readFile(VARS_PATH);
    let next = read.content;
    next = setPreProcessVar(next, 'external_rtp_ip', externalRtpIp);
    next = setPreProcessVar(next, 'external_sip_ip', externalSipIp);

    const writeVars = this.files.writeFile({
      path: VARS_PATH,
      content: next,
      etag: input.etag ?? read.etag,
    });

    // Update local networks ACL (separate file)
    if (input.localNetworks) {
      this.writeAclList(input.localNetworks, input.aclEtag);
    }

    return writeVars;
  }

  async detect() {
    const externalAddress = await detectPublicIp();
    const localNetworks = detectLocalCidrs();
    return { externalAddress, localNetworks };
  }

  private ensureAclList(): { etag: string; localNetworks: string[] } {
    let read: { content: string; etag: string };
    try {
      read = this.files.readFile(ACL_PATH);
    } catch {
      // If ACL file isn't present in tree, that's unexpected in this repo. Fail clearly.
      throw new BadRequestException('acl.conf.xml not found');
    }

    const found = extractAclList(read.content, ACL_LIST_NAME);
    if (found) {
      return { etag: read.etag, localNetworks: found.cidrs };
    }

    // Insert list with allow-all default (empty allowlist => allow all)
    const inserted = upsertAclList(read.content, ACL_LIST_NAME, [], { allowAll: true });
    this.files.writeFile({ path: ACL_PATH, content: inserted, etag: read.etag });
    const reread = this.files.readFile(ACL_PATH);
    return { etag: reread.etag, localNetworks: [] };
  }

  private writeAclList(cidrs: string[], aclEtag?: string) {
    const normalized = normalizeCidrs(cidrs);
    const read = this.files.readFile(ACL_PATH);
    const patched = upsertAclList(read.content, ACL_LIST_NAME, normalized, {
      allowAll: normalized.length === 0,
    });
    this.files.writeFile({ path: ACL_PATH, content: patched, etag: aclEtag ?? read.etag });
  }
}

function isValidNatValue(v: string) {
  const val = String(v ?? '').trim();
  if (!val) return false;
  const lower = val.toLowerCase();
  if (lower === 'auto' || lower === 'auto-nat') return true;
  return isIP(val) === 4 || isIP(val) === 6;
}

function normalizeCidrs(cidrs: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of cidrs ?? []) {
    const s = String(raw ?? '').trim();
    if (!s) continue;
    const parsed = parseCidrOrIp(s);
    const key = `${parsed.ip}/${parsed.mask}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function parseCidrOrIp(input: string): { ip: string; mask: number } {
  const s = String(input ?? '').trim();
  if (!s) throw new BadRequestException('Invalid local network (empty)');
  const parts = s.split('/');
  const ip = parts[0]?.trim() ?? '';
  const ipVer = isIP(ip);
  if (ipVer !== 4 && ipVer !== 6) throw new BadRequestException(`Invalid local network IP: ${s}`);
  const max = ipVer === 4 ? 32 : 128;
  let mask = max;
  if (parts.length > 1) {
    const m = Number(parts[1]);
    if (!Number.isFinite(m) || m < 0 || m > max) {
      throw new BadRequestException(`Invalid local network mask: ${s}`);
    }
    mask = Math.trunc(m);
  }
  return { ip, mask };
}

function extractAclList(xml: string, listName: string): { defaultMode: string; cidrs: string[] } | null {
  const re = new RegExp(
    `<list\\s+name="${escapeRegExp(listName)}"\\s+default="([^"]+)"\\s*>\\s*([\\s\\S]*?)\\s*<\\/list>`,
    'i',
  );
  const m = xml.match(re);
  if (!m) return null;
  const def = (m[1] ?? '').trim();
  const body = m[2] ?? '';
  const cidrRe = /<node\s+[^>]*cidr="([^"]+)"[^>]*>/gi;
  const cidrs: string[] = [];
  for (;;) {
    const mm = cidrRe.exec(body);
    if (!mm) break;
    const v = String(mm[1] ?? '').trim();
    if (v) cidrs.push(v);
  }
  // Only return allow nodes from our list (we write them)
  const normalized = cidrs.map((c) => {
    try {
      const p = parseCidrOrIp(c);
      return `${p.ip}/${p.mask}`;
    } catch {
      return '';
    }
  }).filter(Boolean);
  return { defaultMode: def, cidrs: normalized };
}

function upsertAclList(
  xml: string,
  listName: string,
  cidrs: string[],
  opts: { allowAll: boolean },
) {
  const def = opts.allowAll ? 'allow' : 'deny';
  const nodes = opts.allowAll
    ? ''
    : cidrs
        .map((c) => `      <node type="allow" cidr="${escapeXmlAttr(c)}"/>`)
        .join('\n') + (cidrs.length ? '\n' : '');

  const block =
    `    <!-- Admin Panel: Local Networks (FreePBX-like). Empty list = allow all. -->\n` +
    `    <list name="${listName}" default="${def}">\n` +
    nodes +
    `    </list>\n`;

  const re = new RegExp(
    `\\s*<!--\\s*Admin Panel: Local Networks[\\s\\S]*?-->\\s*<list\\s+name="${escapeRegExp(
      listName,
    )}"[\\s\\S]*?<\\/list>\\s*\\n?`,
    'i',
  );
  if (re.test(xml)) {
    return xml.replace(re, `\n${block}`);
  }

  const listRe = new RegExp(
    `<list\\s+name="${escapeRegExp(listName)}"[\\s\\S]*?<\\/list>\\s*\\n?`,
    'i',
  );
  if (listRe.test(xml)) {
    return xml.replace(listRe, block);
  }

  const idx = xml.lastIndexOf('</network-lists>');
  if (idx === -1) throw new BadRequestException('Invalid acl.conf.xml');
  return xml.slice(0, idx) + block + xml.slice(idx);
}

async function detectPublicIp(): Promise<string> {
  try {
    // Prefer plain text response
    const res = await fetch('https://api.ipify.org?format=text', { method: 'GET' });
    const txt = (await res.text()).trim();
    if (isIP(txt) === 4 || isIP(txt) === 6) return txt;
  } catch {
    // ignore
  }
  return '';
}

function detectLocalCidrs(): string[] {
  const nets = os.networkInterfaces();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of Object.values(nets)) {
    for (const n of list ?? []) {
      if (!n || n.internal) continue;
      const ip = String((n as any).address ?? '').trim();
      const netmask = String((n as any).netmask ?? '').trim();
      const ver = isIP(ip);
      if (ver !== 4) continue; // keep it simple; user can add ipv6 manually
      const mask = ipv4NetmaskToBits(netmask);
      if (mask == null) continue;
      const cidr = `${ip}/${mask}`;
      if (seen.has(cidr)) continue;
      seen.add(cidr);
      out.push(cidr);
    }
  }
  return out;
}

function ipv4NetmaskToBits(netmask: string): number | null {
  const parts = netmask.split('.').map((x) => Number(x));
  if (parts.length !== 4 || parts.some((x) => !Number.isFinite(x) || x < 0 || x > 255)) return null;
  let bits = 0;
  let zeroSeen = false;
  for (const p of parts) {
    for (let i = 7; i >= 0; i--) {
      const b = (p >> i) & 1;
      if (b === 1) {
        if (zeroSeen) return null; // non-contiguous
        bits++;
      } else {
        zeroSeen = true;
      }
    }
  }
  return bits;
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


