import { ConfigService } from '@nestjs/config';
import { PbxMetaV1 } from './pbx-meta.types';
export declare class PbxMetaService {
    private readonly metaPath;
    constructor(config: ConfigService);
    private sha256;
    private defaultMeta;
    get(): {
        meta: PbxMetaV1;
        etag: string;
    };
    write(meta: PbxMetaV1, etag?: string): {
        ok: true;
        etag: string;
    };
    upsertQueueMeta(fullName: string, patch: {
        extensionNumber?: string;
        timeoutDestination?: any;
    }): {
        ok: true;
        etag: string;
    };
    deleteQueueMeta(fullName: string): {
        ok: true;
        etag: string;
    };
    upsertTrunkMeta(name: string, patch: {
        inboundDestination?: any;
        outgoingDefault?: any;
        prefixRules?: any[];
    }): {
        ok: true;
        etag: string;
    };
    deleteTrunkMeta(name: string): {
        ok: true;
        etag: string;
    };
}
