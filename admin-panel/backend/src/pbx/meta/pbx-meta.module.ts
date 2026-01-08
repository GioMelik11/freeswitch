import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PbxMetaService } from './pbx-meta.service';

@Module({
  imports: [ConfigModule],
  providers: [PbxMetaService],
  exports: [PbxMetaService],
})
export class PbxMetaModule {}


