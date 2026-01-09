import { ExtensionsService } from '../extensions/extensions.service';
import { AiService } from './ai.service';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { DialplanService } from '../dialplan/dialplan.service';
import { PbxMetaService } from '../meta/pbx-meta.service';
import { EslService } from '../../freeswitch/esl/esl.service';
export declare class AiController {
    private readonly ai;
    private readonly extensions;
    private readonly dialplan;
    private readonly meta;
    private readonly esl;
    constructor(ai: AiService, extensions: ExtensionsService, dialplan: DialplanService, meta: PbxMetaService, esl: EslService);
    settings(): {
        etag: string;
        audioStreamUrl: string;
    };
    update(dto: UpdateAiSettingsDto): Promise<{
        ok: boolean;
        etag: string;
    }>;
    listAiExtensions(): {
        id: any;
        callerIdName: any;
        aiServiceId: any;
    }[];
    listServices(): {
        etag: string;
        services: {
            id: string;
            name: string;
            socketUrl: string;
            enabled: boolean;
        }[];
        defaultAiServiceId: string | null;
    };
    upsertService(body: {
        id?: string;
        name: string;
        socketUrl?: string;
        audioStreamUrl?: string;
        enabled?: boolean;
    }): {
        ok: true;
        etag: string;
    };
    deleteService(id: string): {
        ok: true;
        etag: string;
    };
    setDefault(id: string): {
        ok: true;
        etag: string;
    };
    private regenExtensionsDialplan;
    private reloadFsBestEffort;
}
