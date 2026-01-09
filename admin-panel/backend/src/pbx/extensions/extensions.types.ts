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
  forwardMobile?: string; // if not answered, forward to this external number
  aiEnabled?: boolean; // if true, calls to this extension go to AI service
  aiServiceId?: string; // which AI service/socket to use (from PBX meta)
};
