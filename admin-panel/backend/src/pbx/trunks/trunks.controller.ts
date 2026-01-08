import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UpsertTrunkDto } from './dto/upsert-trunk.dto';
import { TrunksService } from './trunks.service';

@UseGuards(JwtAuthGuard)
@Controller('pbx/trunks')
export class TrunksController {
  constructor(private readonly svc: TrunksService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Get(':name')
  get(@Param('name') name: string) {
    return this.svc.get(name);
  }

  @Post()
  upsert(@Body() dto: UpsertTrunkDto) {
    return this.svc.upsert(dto);
  }

  @Delete(':name')
  delete(@Param('name') name: string, @Query('etag') etag?: string) {
    return this.svc.delete(name, etag);
  }
}


