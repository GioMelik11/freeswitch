import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { UpdateAdvancedSettingsDto } from './dto/update-advanced-settings.dto';
import { UpdateSipSettingsDto } from './dto/update-sip-settings.dto';

@UseGuards(JwtAuthGuard)
@Controller('pbx/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('advanced')
  advanced() {
    return this.settings.getAdvanced();
  }

  @Post('advanced')
  updateAdvanced(@Body() dto: UpdateAdvancedSettingsDto) {
    return this.settings.updateAdvanced(dto);
  }

  @Get('sip')
  sip() {
    return this.settings.getSip();
  }

  @Post('sip')
  updateSip(@Body() dto: UpdateSipSettingsDto) {
    return this.settings.updateSip(dto);
  }
}


