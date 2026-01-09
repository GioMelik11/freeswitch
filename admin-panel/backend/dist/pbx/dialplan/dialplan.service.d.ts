import { FilesService } from '../../files/files.service';
import { PbxMetaV1 } from '../meta/pbx-meta.types';
export declare class DialplanService {
    private readonly files;
    constructor(files: FilesService);
    private buildAiCtx;
    ensurePublicIncludesDir(): void;
    ensureDefaultIncludesDirEarly(): void;
    writeTrunkInbound(meta: PbxMetaV1): void;
    writeOutboundDefaults(meta: PbxMetaV1): void;
    writeQueues(meta: PbxMetaV1): void;
    private ensureQueuePostLua;
    writeExtensionsSpecial(exts: Array<{
        id: string;
        forwardMobile?: string;
        aiEnabled?: boolean;
        aiServiceId?: string;
    }>, ai?: {
        services: Map<string, string>;
        defaultUrl?: string;
    }): void;
    writeOutboundPrefixRoutes(meta: PbxMetaV1): void;
}
