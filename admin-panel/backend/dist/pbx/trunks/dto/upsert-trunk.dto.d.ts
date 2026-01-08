declare class DestDto {
    type: string;
    target?: string;
}
declare class OutgoingDto {
    type: string;
    sound?: string;
    ivr?: string;
}
declare class PrefixRuleDto {
    enabled?: boolean;
    prefix: string;
    prepend?: string;
    description?: string;
}
export declare class UpsertTrunkDto {
    name: string;
    register: boolean;
    username?: string;
    password?: string;
    realm?: string;
    proxy?: string;
    fromUser?: string;
    fromDomain?: string;
    extension?: string;
    transport?: string;
    inboundDestination?: DestDto;
    outgoingDefault?: OutgoingDto;
    prefixRules?: PrefixRuleDto[];
    etag?: string;
}
export {};
