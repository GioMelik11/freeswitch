import { SettingsService } from './settings.service';
import { UpdateAdvancedSettingsDto } from './dto/update-advanced-settings.dto';
import { UpdateSipSettingsDto } from './dto/update-sip-settings.dto';
export declare class SettingsController {
    private readonly settings;
    constructor(settings: SettingsService);
    advanced(): {
        etag: string;
        defaultPassword: string;
        holdMusic: string;
        globalCodecPrefs: string;
        outboundCodecPrefs: string;
        rtpStartPort: string;
        rtpEndPort: string;
        consoleLoglevel: string;
        callDebug: boolean;
        rtpDebug: boolean;
        mediaDebug: boolean;
        sipTlsVersion: string;
        sipTlsCiphers: string;
        recordingsDir: string;
        presencePrivacy: string;
    };
    updateAdvanced(dto: UpdateAdvancedSettingsDto): {
        ok: boolean;
        etag: string;
    };
    sip(): {
        etag: string;
        internalSipPort: string;
        externalSipPort: string;
        internalTlsPort: string;
        externalTlsPort: string;
        internalSslEnable: boolean;
        externalSslEnable: boolean;
        internalAuthCalls: boolean;
        externalAuthCalls: boolean;
    };
    updateSip(dto: UpdateSipSettingsDto): {
        ok: boolean;
        etag: string;
    };
}
