export declare class UpsertExtensionDto {
    id: string;
    password: string;
    userContext: string;
    callerIdName: string;
    callerIdNumber: string;
    callgroup?: string;
    outgoingSound?: string;
    outgoingIvr?: string;
    forwardMobile?: string;
    aiEnabled?: boolean;
    aiServiceId?: string;
    etag?: string;
}
