import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { NatService } from './nat.service';
import { UpdateNatSettingsDto } from './dto/update-nat-settings.dto';

@UseGuards(JwtAuthGuard)
@Controller('pbx/nat')
export class NatController {
  constructor(private readonly nat: NatService) {}

  @Get()
  get() {
    return this.nat.getSettings();
  }

  @Get('detect')
  detect() {
    return this.nat.detect();
  }

  @Post()
  update(@Body() dto: UpdateNatSettingsDto) {
    return this.nat.updateSettings(dto);
  }
}


