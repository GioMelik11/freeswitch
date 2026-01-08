import { FilesService } from '../../files/files.service';
import { PbxMetaService } from '../meta/pbx-meta.service';
export declare class AiService {
    private readonly files;
    private readonly meta;
    constructor(files: FilesService, meta: PbxMetaService);
    getSettings(): {
        etag: string;
        audioStreamUrl: string;
    };
    updateSettings(input: {
        audioStreamUrl: string;
        etag?: string;
    }): {
        ok: boolean;
        etag: string;
    };
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
    upsertService(input: {
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
    setDefaultService(id: string): {
        ok: true;
        etag: string;
    };
}
