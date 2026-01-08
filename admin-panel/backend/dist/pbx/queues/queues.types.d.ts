export type CallcenterQueue = {
    name: string;
    strategy?: string;
    mohSound?: string;
    maxWaitTime?: string;
    discardAbandonedAfter?: string;
    extensionNumber?: string;
    timeoutDestination?: any;
};
export type CallcenterAgent = {
    name: string;
    contact: string;
    type?: string;
    status?: string;
};
export type CallcenterTier = {
    queue: string;
    agent: string;
    level?: string;
    position?: string;
};
