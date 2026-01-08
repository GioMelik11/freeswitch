export type Trunk = {
  name: string;
  filePath: string;
  register: boolean;
  username?: string;
  password?: string;
  realm?: string;
  proxy?: string;
  fromUser?: string;
  fromDomain?: string;
  extension?: string;
  transport?: string;
  inboundDestination?: any;
  outgoingDefault?: any;
  prefixRules?: any[];
};


