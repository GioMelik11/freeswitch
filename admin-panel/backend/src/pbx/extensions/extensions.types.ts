export type Extension = {
  id: string;
  filePath: string;
  password: string; // can be literal or $${var}
  userContext: string;
  callerIdName: string;
  callerIdNumber: string;
  callgroup?: string;
  outgoingSound?: string;
  outgoingIvr?: string;
  outboundTrunk?: string; // gateway name; if empty -> use PBX default trunk
  forwardMobile?: string; // if not answered, forward to this external number
};
