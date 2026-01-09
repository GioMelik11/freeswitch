import { BadRequestException, Injectable } from '@nestjs/common';
import { FilesService } from '../../files/files.service';

const VARS_PATH = 'vars.xml';

@Injectable()
export class SettingsService {
  constructor(private readonly files: FilesService) {}

  getAdvanced() {
    const read = this.files.readFile(VARS_PATH);
    return {
      etag: read.etag,
      defaultPassword: getPreProcessVar(read.content, 'default_password') ?? '',
      holdMusic: getPreProcessVar(read.content, 'hold_music') ?? '',
      globalCodecPrefs: getPreProcessVar(read.content, 'global_codec_prefs') ?? '',
      outboundCodecPrefs:
        getPreProcessVar(read.content, 'outbound_codec_prefs') ?? '',
      rtpStartPort: getPreProcessVar(read.content, 'rtp_start_port') ?? '',
      rtpEndPort: getPreProcessVar(read.content, 'rtp_end_port') ?? '',
      consoleLoglevel: getPreProcessVar(read.content, 'console_loglevel') ?? '',
      callDebug: parseBool(getPreProcessVar(read.content, 'call_debug')),
      rtpDebug: parseBool(getPreProcessVar(read.content, 'rtp_debug')),
      mediaDebug: parseBool(getPreProcessVar(read.content, 'media_debug')),
      // Optional vars referenced by sip profiles in this repo
      sipTlsVersion: getPreProcessVar(read.content, 'sip_tls_version') ?? '',
      sipTlsCiphers: getPreProcessVar(read.content, 'sip_tls_ciphers') ?? '',
      recordingsDir: getPreProcessVar(read.content, 'recordings_dir') ?? '',
      presencePrivacy: getPreProcessVar(read.content, 'presence_privacy') ?? '',
    };
  }

  updateAdvanced(input: {
    defaultPassword: string;
    holdMusic: string;
    globalCodecPrefs: string;
    outboundCodecPrefs: string;
    rtpStartPort: string;
    rtpEndPort: string;
    consoleLoglevel: string;
    callDebug: boolean;
    rtpDebug: boolean;
    mediaDebug: boolean;
    sipTlsVersion?: string;
    sipTlsCiphers?: string;
    recordingsDir?: string;
    presencePrivacy?: string;
    etag?: string;
  }) {
    const read = this.files.readFile(VARS_PATH);

    const rtpStart = parsePortLike(input.rtpStartPort, 'rtpStartPort');
    const rtpEnd = parsePortLike(input.rtpEndPort, 'rtpEndPort');
    if (rtpStart >= rtpEnd) {
      throw new BadRequestException('rtpStartPort must be < rtpEndPort');
    }

    let next = read.content;
    next = setPreProcessVar(next, 'default_password', reqStr(input.defaultPassword, 'defaultPassword'));
    next = setPreProcessVar(next, 'hold_music', reqStr(input.holdMusic, 'holdMusic'));
    next = setPreProcessVar(next, 'global_codec_prefs', reqStr(input.globalCodecPrefs, 'globalCodecPrefs'));
    next = setPreProcessVar(next, 'outbound_codec_prefs', reqStr(input.outboundCodecPrefs, 'outboundCodecPrefs'));
    next = setPreProcessVar(next, 'rtp_start_port', String(rtpStart));
    next = setPreProcessVar(next, 'rtp_end_port', String(rtpEnd));
    next = setPreProcessVar(next, 'console_loglevel', reqStr(input.consoleLoglevel, 'consoleLoglevel'));
    next = setPreProcessVar(next, 'call_debug', input.callDebug ? 'true' : 'false');
    next = setPreProcessVar(next, 'rtp_debug', input.rtpDebug ? 'true' : 'false');
    next = setPreProcessVar(next, 'media_debug', input.mediaDebug ? 'true' : 'false');

    // Optional vars: write only if provided (or if already exists in file)
    next = maybeSetPreProcessVar(next, read.content, 'sip_tls_version', input.sipTlsVersion);
    next = maybeSetPreProcessVar(next, read.content, 'sip_tls_ciphers', input.sipTlsCiphers);
    next = maybeSetPreProcessVar(next, read.content, 'recordings_dir', input.recordingsDir);
    next = maybeSetPreProcessVar(next, read.content, 'presence_privacy', input.presencePrivacy);

    return this.files.writeFile({
      path: VARS_PATH,
      content: next,
      etag: input.etag ?? read.etag,
    });
  }

  getSip() {
    const read = this.files.readFile(VARS_PATH);
    return {
      etag: read.etag,
      internalSipPort: getPreProcessVar(read.content, 'internal_sip_port') ?? '',
      externalSipPort: getPreProcessVar(read.content, 'external_sip_port') ?? '',
      internalTlsPort: getPreProcessVar(read.content, 'internal_tls_port') ?? '',
      externalTlsPort: getPreProcessVar(read.content, 'external_tls_port') ?? '',
      internalSslEnable: parseBool(getPreProcessVar(read.content, 'internal_ssl_enable')),
      externalSslEnable: parseBool(getPreProcessVar(read.content, 'external_ssl_enable')),
      internalAuthCalls: parseBool(getPreProcessVar(read.content, 'internal_auth_calls')),
      externalAuthCalls: parseBool(getPreProcessVar(read.content, 'external_auth_calls')),
    };
  }

  updateSip(input: {
    internalSipPort: string;
    externalSipPort: string;
    internalTlsPort: string;
    externalTlsPort: string;
    internalSslEnable: boolean;
    externalSslEnable: boolean;
    internalAuthCalls: boolean;
    externalAuthCalls: boolean;
    etag?: string;
  }) {
    const read = this.files.readFile(VARS_PATH);
    const internalSipPort = parsePortLike(input.internalSipPort, 'internalSipPort');
    const externalSipPort = parsePortLike(input.externalSipPort, 'externalSipPort');
    const internalTlsPort = parsePortLike(input.internalTlsPort, 'internalTlsPort');
    const externalTlsPort = parsePortLike(input.externalTlsPort, 'externalTlsPort');

    let next = read.content;
    next = setPreProcessVar(next, 'internal_sip_port', String(internalSipPort));
    next = setPreProcessVar(next, 'external_sip_port', String(externalSipPort));
    next = setPreProcessVar(next, 'internal_tls_port', String(internalTlsPort));
    next = setPreProcessVar(next, 'external_tls_port', String(externalTlsPort));
    next = setPreProcessVar(next, 'internal_ssl_enable', input.internalSslEnable ? 'true' : 'false');
    next = setPreProcessVar(next, 'external_ssl_enable', input.externalSslEnable ? 'true' : 'false');
    next = setPreProcessVar(next, 'internal_auth_calls', input.internalAuthCalls ? 'true' : 'false');
    next = setPreProcessVar(next, 'external_auth_calls', input.externalAuthCalls ? 'true' : 'false');

    return this.files.writeFile({
      path: VARS_PATH,
      content: next,
      etag: input.etag ?? read.etag,
    });
  }
}

function reqStr(v: any, name: string) {
  const s = String(v ?? '').trim();
  if (!s) throw new BadRequestException(`${name} is required`);
  return s;
}

function parsePortLike(v: any, name: string) {
  const s = String(v ?? '').trim();
  if (!/^\d+$/.test(s)) throw new BadRequestException(`${name} must be a number`);
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    throw new BadRequestException(`${name} must be in range 1-65535`);
  }
  return n;
}

function parseBool(v: string | null) {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
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

  const insert = `  <X-PRE-PROCESS cmd="set" data="${name}=${escapeXmlAttr(value)}"/>\n`;
  const idx = xml.lastIndexOf('</include>');
  if (idx === -1) throw new BadRequestException('Invalid vars.xml');
  return xml.slice(0, idx) + insert + xml.slice(idx);
}

function maybeSetPreProcessVar(xml: string, originalXml: string, name: string, value?: string) {
  const v = value == null ? undefined : String(value).trim();
  const existed = getPreProcessVar(originalXml, name) != null;
  if (!existed && (v == null || v === '')) return xml; // don't add new var unless user provided a value
  return setPreProcessVar(xml, name, v ?? '');
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


