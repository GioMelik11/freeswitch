export declare class UpdateAdvancedSettingsDto {
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
}
