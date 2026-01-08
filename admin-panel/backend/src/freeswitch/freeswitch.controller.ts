import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SetModuleDto } from './dto/set-module.dto';
import { FreeswitchService } from './freeswitch.service';

@UseGuards(JwtAuthGuard)
@Controller('freeswitch')
export class FreeswitchController {
    constructor(private readonly fs: FreeswitchService) { }

    @Get('modules')
    listModules() {
        return this.fs.listModules();
    }

    @Post('modules/set')
    setModule(@Body() dto: SetModuleDto) {
        return this.fs.setModule(dto);
    }
}


