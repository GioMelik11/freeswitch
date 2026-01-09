export type Extension = {
    id: string;
    filePath: string;
    password: string;
    userContext: string;
    callerIdName: string;
    callerIdNumber: string;
    callgroup?: string;
    outgoingSound?: string;
    outgoingIvr?: string;
    outboundTrunk?: string;
    forwardMobile?: string;
    aiEnabled?: boolean;
    aiServiceId?: string;
};
