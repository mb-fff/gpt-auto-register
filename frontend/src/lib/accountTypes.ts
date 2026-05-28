export interface Account {
  id: string;
  email: string;
  profileId: string;
  proxy?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function getAccountStatusTone(status: string) {
  if (status === 'success') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'pending') return 'warning';
  return 'violet';
}
