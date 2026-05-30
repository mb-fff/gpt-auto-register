// 📁 frontend/src/lib/accountTypes.ts

export interface DeviceFingerprint {
  os: string;
  platform: string;
  screenSize: string;
  userAgent: string;
  timezone: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  impersonate: string;
}

export interface Account {
  id: string;
  email: string;
  profileId: string;
  proxy?: string | null;
  status: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  rtExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  fingerprint?: DeviceFingerprint | null;
}

export function getAccountStatusTone(status: string) {
  if (status === 'success') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'pending') return 'warning';
  return 'violet';
}