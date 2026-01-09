import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { ExtensionsController } from './extensions/extensions.controller';
import { ExtensionsService } from './extensions/extensions.service';
import { TrunksController } from './trunks/trunks.controller';
import { TrunksService } from './trunks/trunks.service';
import { QueuesController } from './queues/queues.controller';
import { QueuesService } from './queues/queues.service';
import { IvrController } from './ivr/ivr.controller';
import { IvrService } from './ivr/ivr.service';
import { TimeConditionsController } from './time-conditions/time-conditions.controller';
import { TimeConditionsService } from './time-conditions/time-conditions.service';
import { SoundsController } from './sounds/sounds.controller';
import { SoundsService } from './sounds/sounds.service';
import { OptionsController } from './options/options.controller';
import { StatusController } from './status/status.controller';
import { EslService } from '../freeswitch/esl/esl.service';
import { PbxMetaModule } from './meta/pbx-meta.module';
import { DialplanModule } from './dialplan/dialplan.module';
import { AiController } from './ai/ai.controller';
import { AiService } from './ai/ai.service';
import { FreeswitchController } from './freeswitch/freeswitch.controller';
import { ConsoleController } from './console/console.controller';
import { ConsoleService } from './console/console.service';
import { NatController } from './nat/nat.controller';
import { NatService } from './nat/nat.service';
import { SettingsController } from './settings/settings.controller';
import { SettingsService } from './settings/settings.service';

@Module({
  imports: [FilesModule, PbxMetaModule, DialplanModule],
  controllers: [
    ExtensionsController,
    TrunksController,
    QueuesController,
    IvrController,
    TimeConditionsController,
    SoundsController,
    OptionsController,
    StatusController,
    AiController,
    FreeswitchController,
    ConsoleController,
    NatController,
    SettingsController,
  ],
  providers: [
    ExtensionsService,
    TrunksService,
    QueuesService,
    IvrService,
    TimeConditionsService,
    SoundsService,
    EslService,
    AiService,
    ConsoleService,
    NatService,
    SettingsService,
  ],
})
export class PbxModule {}
