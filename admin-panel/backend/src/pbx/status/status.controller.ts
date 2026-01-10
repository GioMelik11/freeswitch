import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EslService } from '../../freeswitch/esl/esl.service';

@UseGuards(JwtAuthGuard)
@Controller('pbx/status')
export class StatusController {
  constructor(private readonly esl: EslService) {}

  @Get('gateways')
  async gateways() {
    // Example line contains: "sip_trunk_provider   ...   REGED"
    const res = await this.esl.api('sofia status gateways');
    const lines = res.body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const out: Record<string, { status: string; raw: string }> = {};
    for (const line of lines) {
      // first token is gateway name
      const parts = line.split(/\s+/);
      const name0 = parts[0];
      if (!name0) continue;
      if (name0 === 'Name' || name0 === 'Gateway' || name0 === 'Profile::Gateway-Name') continue;

      // FreeSWITCH often prints name as "profile::gateway" (e.g. external::sip_trunk_provider)
      const name = name0.includes('::') ? name0.split('::').pop()! : name0;
      const status =
        parts.find((p) =>
          [
            'REGED',
            'NOREG',
            'UNREGED',
            'TRYING',
            'FAIL_WAIT',
            'DOWN',
            'UP',
          ].includes(p),
        ) ?? 'UNKNOWN';
      out[name] = { status, raw: line };
    }
    return out;
  }

  @Get('gateways/:name')
  async gateway(@Param('name') name: string) {
    const res = await this.esl.api(`sofia status gateway ${name}`);
    return { name, raw: res.body };
  }

  @Get('extensions')
  async extensions() {
    // "sofia status profile internal reg" output differs by version:
    // - sometimes it's a single-line table
    // - often it's a multi-line block per registration (Call-ID/User/Contact/Status/etc.)
    const res = await this.esl.api('sofia status profile internal reg');
    const lines = res.body.split(/\r?\n/);
    const out: Record<
      string,
      { contact?: string; expires?: string; raw: string }
    > = {};

    // First try: parse block format
    let curUser = '';
    let curContact = '';
    let curExpires = '';
    let curRaw: string[] = [];
    const flush = () => {
      if (curUser) {
        out[curUser] = {
          raw: curRaw.join('\n'),
          contact: curContact || undefined,
          expires: curExpires || undefined,
        };
      }
      curUser = '';
      curContact = '';
      curExpires = '';
      curRaw = [];
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (lower.includes('registrations')) continue;

      // new block marker
      if (lower.startsWith('call-id:')) flush();
      curRaw.push(trimmed);

      const mUser = trimmed.match(/^User:\s+(\d+)(?:@|\s|$)/i);
      if (mUser) curUser = mUser[1];

      const mContact = trimmed.match(/^Contact:\s+(.+)$/i);
      if (mContact) curContact = mContact[1].trim();

      const mExp = trimmed.match(/^Status:.*\bEXP\(([^)]+)\)/i);
      if (mExp) curExpires = mExp[1].trim();
    }
    flush();

    // Fallback: table format (user is first token)
    if (Object.keys(out).length === 0) {
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const lower = trimmed.toLowerCase();
        if (lower.startsWith('call-id')) continue;
        if (lower.includes('registrations')) continue;
        const parts = trimmed.split(/\s+/);
        const user = parts[0];
        if (!/^\d+$/.test(user)) continue;
        out[user] = { raw: trimmed };
      }
    }
    return out;
  }
}
