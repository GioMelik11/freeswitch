export type CallcenterQueue = {
    name: string; // full name, e.g. queue1@default
    strategy?: string;
    mohSound?: string;
    maxWaitTime?: string;
    discardAbandonedAfter?: string;
    extensionNumber?: string; // dialplan number for this queue (admin panel meta)
    timeoutDestination?: any; // admin panel meta
};

export type CallcenterAgent = {
    name: string; // e.g. 1001@default
    contact: string; // e.g. user/1001@$${domain}
    type?: string;
    status?: string;
};

export type CallcenterTier = {
    queue: string;
    agent: string;
    level?: string;
    position?: string;
};


