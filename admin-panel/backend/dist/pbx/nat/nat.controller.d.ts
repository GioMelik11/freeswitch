import { NatService } from './nat.service';
import { UpdateNatSettingsDto } from './dto/update-nat-settings.dto';
export declare class NatController {
    private readonly nat;
    constructor(nat: NatService);
    get(): {
        etag: string;
        aclEtag: string;
        externalRtpIp: string;
        externalSipIp: string;
        localNetworks: string[];
    };
    detect(): Promise<{
        externalAddress: string;
        localNetworks: string[];
    }>;
    update(dto: UpdateNatSettingsDto): {
        ok: boolean;
        etag: string;
    };
}
