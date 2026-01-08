export type TimeConditionDestination = {
    type: 'transfer';
    target: string;
} | {
    type: 'ivr';
    target: string;
} | {
    type: 'queue';
    target: string;
};
export type TimeCondition = {
    name: string;
    extensionNumber: string;
    days: number[];
    startHour: number;
    endHour: number;
    onMatch: TimeConditionDestination;
    onElse: TimeConditionDestination;
};
