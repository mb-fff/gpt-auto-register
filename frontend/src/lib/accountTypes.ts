export interface Account {
  id: string;
  email: string;
  profileId: string;
  proxy?: string | null;
  status: string;
  refreshToken?: string | null;
  accessToken?: string | null;
  rtExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getAccountStatusTone(status: string) {
  if (status === 'success') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'pending') return 'warning';
  return 'violet';
}

export function exportAuthFile(account: Account) {
  if (!account.refreshToken) {
    return false;
  }

  const authData = { refresh_token: account.refreshToken };
  const blob = new Blob([JSON.stringify(authData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auth_${account.email.split('@')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  return true;
}
