export type PbxDestination =
  | { type: 'terminate' }
  | { type: 'extension'; target: string }
  | { type: 'queue'; target: string } // e.g. queue1@default
  | { type: 'ivr'; target: string } // menu name
  | { type: 'timeCondition'; target: string }; // extension number to transfer to

export type OutgoingMedia =
  | { type: 'none' }
  | { type: 'sound'; sound: string } // e.g. local_stream://moh or ivr/xxx.wav
  | { type: 'ivr'; ivr: string }; // ivr menu name

export type TrunkPrefixRule = {
  enabled?: boolean;
  prefix: string; // dialed prefix to match (e.g. 9, 00)
  prepend?: string; // digits to prepend after stripping prefix (e.g. +)
  description?: string;
};

export type PbxMetaV1 = {
  version: 1;
  /** Default outbound trunk (gateway name). Extensions may override per-extension. */
  defaultTrunkName?: string;
  queues: Record<
    string,
    {
      extensionNumber?: string;
      timeoutDestination?: PbxDestination;
    }
  >; // key: queue full name, e.g. queue1@default
  trunks: Record<
    string,
    {
      inboundDestination?: PbxDestination;
      outgoingDefault?: OutgoingMedia;
      prefixRules?: TrunkPrefixRule[];
    }
  >; // key: trunk (gateway) name
};
