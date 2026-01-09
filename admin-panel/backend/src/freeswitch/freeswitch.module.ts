import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { FreeswitchController } from './freeswitch.controller';
import { FreeswitchService } from './freeswitch.service';

@Module({
  imports: [FilesModule],
  controllers: [FreeswitchController],
  providers: [FreeswitchService],
})
export class FreeswitchModule {}
