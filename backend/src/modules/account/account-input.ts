// 📁 backend/src/modules/account/account-input.ts

export interface AccountCreateInput {
  email: string;
  password?: string | null;
  proxy?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  fingerprint?: any; // 👈 增加指纹类型定义
}

export function normalizeAccountInput(input: string | AccountCreateInput, proxy?: string | null) {
  const accountInput = typeof input === 'string'
    ? { email: input, proxy }
    : input;

  return {
    email: accountInput.email,
    profileId: `local-${Date.now()}`,
    proxy: accountInput.proxy || undefined,
    accessToken: accountInput.accessToken || undefined,
    refreshToken: accountInput.refreshToken || undefined,
    status: accountInput.accessToken || accountInput.refreshToken ? 'success' : 'pending',
    fingerprint: accountInput.fingerprint || undefined, // 👈 放行指纹数据
  };
}