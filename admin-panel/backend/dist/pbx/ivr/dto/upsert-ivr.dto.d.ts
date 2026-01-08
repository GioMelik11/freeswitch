declare class IvrEntryDto {
    digits: string;
    type: 'transfer' | 'queue' | 'ivr' | 'app';
    target: string;
}
export declare class UpsertIvrDto {
    name: string;
    greetLong?: string;
    greetShort?: string;
    invalidSound?: string;
    exitSound?: string;
    timeout?: string;
    interDigitTimeout?: string;
    maxFailures?: string;
    maxTimeouts?: string;
    digitLen?: string;
    entries: IvrEntryDto[];
    etag?: string;
}
export {};
