"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PbxModule = void 0;
const common_1 = require("@nestjs/common");
const files_module_1 = require("../files/files.module");
const extensions_controller_1 = require("./extensions/extensions.controller");
const extensions_service_1 = require("./extensions/extensions.service");
const trunks_controller_1 = require("./trunks/trunks.controller");
const trunks_service_1 = require("./trunks/trunks.service");
const queues_controller_1 = require("./queues/queues.controller");
const queues_service_1 = require("./queues/queues.service");
const ivr_controller_1 = require("./ivr/ivr.controller");
const ivr_service_1 = require("./ivr/ivr.service");
const time_conditions_controller_1 = require("./time-conditions/time-conditions.controller");
const time_conditions_service_1 = require("./time-conditions/time-conditions.service");
const sounds_controller_1 = require("./sounds/sounds.controller");
const sounds_service_1 = require("./sounds/sounds.service");
const options_controller_1 = require("./options/options.controller");
const status_controller_1 = require("./status/status.controller");
const esl_service_1 = require("../freeswitch/esl/esl.service");
const pbx_meta_module_1 = require("./meta/pbx-meta.module");
const dialplan_module_1 = require("./dialplan/dialplan.module");
const ai_controller_1 = require("./ai/ai.controller");
const ai_service_1 = require("./ai/ai.service");
const freeswitch_controller_1 = require("./freeswitch/freeswitch.controller");
const console_controller_1 = require("./console/console.controller");
const console_service_1 = require("./console/console.service");
const nat_controller_1 = require("./nat/nat.controller");
const nat_service_1 = require("./nat/nat.service");
const settings_controller_1 = require("./settings/settings.controller");
const settings_service_1 = require("./settings/settings.service");
const pbx_bootstrap_service_1 = require("./pbx-bootstrap.service");
const audio_stream_test_service_1 = require("./audio-stream-test/audio-stream-test.service");
let PbxModule = class PbxModule {
};
exports.PbxModule = PbxModule;
exports.PbxModule = PbxModule = __decorate([
    (0, common_1.Module)({
        imports: [files_module_1.FilesModule, pbx_meta_module_1.PbxMetaModule, dialplan_module_1.DialplanModule],
        controllers: [
            extensions_controller_1.ExtensionsController,
            trunks_controller_1.TrunksController,
            queues_controller_1.QueuesController,
            ivr_controller_1.IvrController,
            time_conditions_controller_1.TimeConditionsController,
            sounds_controller_1.SoundsController,
            options_controller_1.OptionsController,
            status_controller_1.StatusController,
            ai_controller_1.AiController,
            freeswitch_controller_1.FreeswitchController,
            console_controller_1.ConsoleController,
            nat_controller_1.NatController,
            settings_controller_1.SettingsController,
        ],
        providers: [
            extensions_service_1.ExtensionsService,
            trunks_service_1.TrunksService,
            queues_service_1.QueuesService,
            ivr_service_1.IvrService,
            time_conditions_service_1.TimeConditionsService,
            sounds_service_1.SoundsService,
            esl_service_1.EslService,
            ai_service_1.AiService,
            console_service_1.ConsoleService,
            nat_service_1.NatService,
            settings_service_1.SettingsService,
            pbx_bootstrap_service_1.PbxBootstrapService,
            audio_stream_test_service_1.AudioStreamTestService,
        ],
    })
], PbxModule);
//# sourceMappingURL=pbx.module.js.map