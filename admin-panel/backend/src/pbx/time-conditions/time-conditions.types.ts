export type TimeConditionDestination =
    | { type: 'transfer'; target: string } // e.g. "5000 XML default"
    | { type: 'ivr'; target: string } // menu name
    | { type: 'queue'; target: string }; // e.g. "queue1@default"

export type TimeCondition = {
    name: string;
    extensionNumber: string; // number to dial to trigger this routing
    days: number[]; // 1-7 (Mon=1)
    startHour: number; // 0-23
    endHour: number; // 0-23
    onMatch: TimeConditionDestination;
    onElse: TimeConditionDestination;
};


