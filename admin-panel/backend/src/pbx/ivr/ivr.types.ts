export type IvrEntry = {
  digits: string;
  type: 'transfer' | 'queue' | 'ivr' | 'app';
  target: string; // number/context/menu/app param
};

export type IvrMenu = {
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
  entries: IvrEntry[];
};


