import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EslService } from '../../freeswitch/esl/esl.service';
import { RunConsoleCommandDto } from './dto/run-console-command.dto';
import { ConsoleService } from './console.service';

@UseGuards(JwtAuthGuard)
@Controller('pbx/console')
export class ConsoleController {
  constructor(
    private readonly esl: EslService,
    private readonly consoleSvc: ConsoleService,
  ) {}

  @Post('run')
  async run(@Body() dto: RunConsoleCommandDto) {
    const cmd = String(dto.command ?? '').trim();
    if (!cmd) return { ok: false, output: '' };
    if (cmd.includes('\n') || cmd.includes('\r')) {
      return { ok: false, output: 'Invalid command: newlines are not allowed.' };
    }
    const res = await this.esl.api(cmd);
    return { ok: true, output: res.body ?? '' };
  }

  @Get('tail')
  tail(
    @Query('since') since?: string,
    @Query('limit') limit?: string,
  ) {
    const sinceTs = Number(since ?? '0') || 0;
    const lim = Number(limit ?? '200') || 200;
    return this.consoleSvc.tail(sinceTs, lim);
  }
}


