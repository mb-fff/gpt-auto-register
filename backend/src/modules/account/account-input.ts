export interface AccountCreateInput {
  email: string;
  password?: string | null;
  proxy?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
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
  };
}
