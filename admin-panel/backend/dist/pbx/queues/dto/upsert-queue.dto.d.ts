declare class DestDto {
    type: string;
    target?: string;
}
export declare class UpsertQueueDto {
    name: string;
    domain?: string;
    strategy?: string;
    mohSound?: string;
    maxWaitTime?: string;
    discardAbandonedAfter?: string;
    extensionNumber?: string;
    timeoutDestination?: DestDto;
    agentExtensions?: string[];
    etag?: string;
}
export {};
