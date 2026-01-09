import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Post } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UpsertTimeConditionDto } from './dto/upsert-time-condition.dto';
import { TimeConditionsService } from './time-conditions.service';

@UseGuards(JwtAuthGuard)
@Controller('pbx/time-conditions')
export class TimeConditionsController {
  constructor(private readonly svc: TimeConditionsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  upsert(@Body() dto: UpsertTimeConditionDto) {
    return this.svc.upsert(dto as any);
  }

  @Delete(':name')
  delete(@Param('name') name: string, @Query('etag') etag: string) {
    return this.svc.delete(name, etag);
  }
}
