import { Body, Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Post } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UpsertIvrDto } from './dto/upsert-ivr.dto';
import { IvrService } from './ivr.service';

@UseGuards(JwtAuthGuard)
@Controller('pbx/ivrs')
export class IvrController {
  constructor(private readonly svc: IvrService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  upsert(@Body() dto: UpsertIvrDto) {
    return this.svc.upsert(dto);
  }

  @Delete(':name')
  delete(@Param('name') name: string, @Query('etag') etag?: string) {
    return this.svc.delete(name, etag);
  }
}


