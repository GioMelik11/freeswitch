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
import { UpsertQueueDto } from './dto/upsert-queue.dto';
import { QueuesService } from './queues.service';

@UseGuards(JwtAuthGuard)
@Controller('pbx/queues')
export class QueuesController {
  constructor(private readonly svc: QueuesService) {}

  @Get()
  getConfig() {
    return this.svc.getConfig();
  }

  @Post()
  upsert(@Body() dto: UpsertQueueDto) {
    return this.svc.upsertQueue(dto);
  }

  @Delete(':name')
  delete(
    @Param('name') name: string,
    @Query('domain') domain?: string,
    @Query('etag') etag?: string,
  ) {
    return this.svc.deleteQueue(name, domain, etag);
  }
}
