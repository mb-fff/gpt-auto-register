export interface RegisterTaskData {
  count: number;
  country?: string;
  proxy?: string;
  usePhoneVerify?: boolean;
}

export interface DolphinProfile {
  id: string;
  name: string;
  status: string;
}
