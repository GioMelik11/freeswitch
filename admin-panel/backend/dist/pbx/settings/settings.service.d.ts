import { FilesService } from '../../files/files.service';
export declare class SettingsService {
    private readonly files;
    constructor(files: FilesService);
    getAdvanced(): {
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
    updateAdvanced(input: {
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
        sipTlsVersion?: string;
        sipTlsCiphers?: string;
        recordingsDir?: string;
        presencePrivacy?: string;
        etag?: string;
    }): {
        ok: boolean;
        etag: string;
    };
    getSip(): {
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
    updateSip(input: {
        internalSipPort: string;
        externalSipPort: string;
        internalTlsPort: string;
        externalTlsPort: string;
        internalSslEnable: boolean;
        externalSslEnable: boolean;
        internalAuthCalls: boolean;
        externalAuthCalls: boolean;
        etag?: string;
    }): {
        ok: boolean;
        etag: string;
    };
}
