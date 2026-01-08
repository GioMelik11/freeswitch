import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EslService } from '../../freeswitch/esl/esl.service';

@UseGuards(JwtAuthGuard)
@Controller('pbx/freeswitch')
export class FreeswitchController {
  constructor(private readonly esl: EslService) {}

  @Post('reload')
  async reload() {
    // Best-effort reload sequence (safe defaults).
    const cmds = [
      'reloadxml',
      'sofia profile internal rescan reloadxml',
      'sofia profile external rescan reloadxml',
    ];

    const results: Array<{ command: string; ok: boolean; body: string }> = [];
    for (const c of cmds) {
      try {
        const res = await this.esl.api(c);
        results.push({ command: c, ok: true, body: res.body });
      } catch (e: any) {
        results.push({ command: c, ok: false, body: e?.message ?? String(e) });
      }
    }

    return { ok: results.every((r) => r.ok), results };
  }
}


