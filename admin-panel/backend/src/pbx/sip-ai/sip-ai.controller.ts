import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UpdateSipAiDto } from './dto/update-sip-ai.dto';
import { SipAiService } from './sip-ai.service';

@UseGuards(JwtAuthGuard)
@Controller('pbx/sip-ai')
export class SipAiController {
  constructor(private readonly svc: SipAiService) {}

  @Get()
  get() {
    return this.svc.get();
  }

  @Post()
  update(@Body() dto: UpdateSipAiDto) {
    return this.svc.update(dto);
  }
}


