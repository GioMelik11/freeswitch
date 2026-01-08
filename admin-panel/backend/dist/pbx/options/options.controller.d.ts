import { ExtensionsService } from '../extensions/extensions.service';
import { QueuesService } from '../queues/queues.service';
import { IvrService } from '../ivr/ivr.service';
import { SoundsService } from '../sounds/sounds.service';
import { FilesService } from '../../files/files.service';
import { TimeConditionsService } from '../time-conditions/time-conditions.service';
import { PbxMetaService } from '../meta/pbx-meta.service';
export declare class OptionsController {
    private readonly extensions;
    private readonly queues;
    private readonly ivrs;
    private readonly timeConditions;
    private readonly sounds;
    private readonly files;
    private readonly meta;
    constructor(extensions: ExtensionsService, queues: QueuesService, ivrs: IvrService, timeConditions: TimeConditionsService, sounds: SoundsService, files: FilesService, meta: PbxMetaService);
    get(): {
        extensions: {
            id: string;
            label: string;
        }[];
        queues: {
            name: string;
        }[];
        ivrs: {
            name: any;
        }[];
        timeConditions: {
            name: any;
            extensionNumber: any;
        }[];
        sounds: {
            all: import("../sounds/sounds.service").SoundItem[];
            music: import("../sounds/sounds.service").SoundItem[];
            ivr: import("../sounds/sounds.service").SoundItem[];
        };
        mohClasses: string[];
        strategies: string[];
        domains: string[];
        aiServices: {
            id: string;
            name: string;
            socketUrl: string;
        }[];
        defaultAiServiceId: string | null;
    };
    private getMohClasses;
}
