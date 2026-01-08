import { Module } from '@nestjs/common';
import { FilesModule } from '../../files/files.module';
import { DialplanService } from './dialplan.service';

@Module({
  imports: [FilesModule],
  providers: [DialplanService],
  exports: [DialplanService],
})
export class DialplanModule {}


