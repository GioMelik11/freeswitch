declare class DestDto {
    type: 'transfer' | 'ivr' | 'queue';
    target: string;
}
export declare class UpsertTimeConditionDto {
    name: string;
    extensionNumber: string;
    days: number[];
    startHour: number;
    endHour: number;
    onMatch: DestDto;
    onElse: DestDto;
    etag: string;
}
export {};
