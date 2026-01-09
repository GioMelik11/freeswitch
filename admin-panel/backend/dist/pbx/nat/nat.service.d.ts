import { FilesService } from '../../files/files.service';
export declare class NatService {
    private readonly files;
    constructor(files: FilesService);
    getSettings(): {
        etag: string;
        aclEtag: string;
        externalRtpIp: string;
        externalSipIp: string;
        localNetworks: string[];
    };
    updateSettings(input: {
        externalRtpIp: string;
        externalSipIp: string;
        localNetworks?: string[];
        etag?: string;
        aclEtag?: string;
    }): {
        ok: boolean;
        etag: string;
    };
    detect(): Promise<{
        externalAddress: string;
        localNetworks: string[];
    }>;
    private ensureAclList;
    private writeAclList;
}
