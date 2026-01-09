export type PbxDestination = {
    type: 'terminate';
} | {
    type: 'extension';
    target: string;
} | {
    type: 'queue';
    target: string;
} | {
    type: 'ivr';
    target: string;
} | {
    type: 'ai';
    target?: string;
} | {
    type: 'timeCondition';
    target: string;
};
export type OutgoingMedia = {
    type: 'none';
} | {
    type: 'sound';
    sound: string;
} | {
    type: 'ivr';
    ivr: string;
};
export type TrunkPrefixRule = {
    enabled?: boolean;
    prefix: string;
    prepend?: string;
    description?: string;
};
export type AiServiceDef = {
    id: string;
    name: string;
    socketUrl: string;
    enabled?: boolean;
};
export type PbxMetaV1 = {
    version: 1;
    aiServices?: AiServiceDef[];
    defaultAiServiceId?: string;
    queues: Record<string, {
        extensionNumber?: string;
        timeoutDestination?: PbxDestination;
    }>;
    trunks: Record<string, {
        inboundDestination?: PbxDestination;
        outgoingDefault?: OutgoingMedia;
        prefixRules?: TrunkPrefixRule[];
    }>;
};
