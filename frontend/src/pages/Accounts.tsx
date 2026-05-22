import React, { useEffect, useState } from 'react';
import {
  RiDownloadCloud2Line,
  RiFingerprintLine,
  RiRefreshLine,
  RiShieldCheckLine,
} from '@remixicon/react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { StatusBadge } from '../components/os/StatusBadge';
import { WindowFrame } from '../components/os/WindowFrame';

const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/accounts');
      setAccounts(res.data);
    } catch (err) {
      toast.error('获取账号列表失败');
    } finally {
      setLoading(false);
    }
  };

  const exportAuth = (account: any) => {
    if (!account.refreshToken) {
      toast.warning('该账号暂无 Refresh Token');
      return;
    }
    const authData = { refresh_token: account.refreshToken };
    const blob = new Blob([JSON.stringify(authData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auth_${account.email.split('@')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('auth.json 下载成功');
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const statusTone = (status: string) => {
    if (status === 'success') return 'success';
    if (status === 'failed') return 'danger';
    if (status === 'pending') return 'warning';
    return 'violet';
  };

  return (
    <WindowFrame
      title="Account Vault"
      subtitle="以空间数据面板管理账号资产、Profile 指纹和 Refresh Token 导出。"
      status={`${accounts.length} Assets`}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-white/50">
          <RiShieldCheckLine className="size-5 text-emerald-200" />
          Vault is local-first. Refresh tokens only export on demand.
        </div>
        <Button variant="secondary" onClick={fetchAccounts} disabled={loading}>
          <RiRefreshLine className={loading ? 'size-5 animate-spin' : 'size-5'} />
          Refresh
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="hidden grid-cols-[1.2fr_1fr_0.7fr_1fr_0.8fr] gap-4 border-b border-white/[0.07] px-5 py-4 text-xs uppercase tracking-[0.18em] text-white/34 lg:grid">
            <span>Account</span>
            <span>Profile</span>
            <span>Status</span>
            <span>Created</span>
            <span className="text-right">Action</span>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {loading && (
              <div className="p-8 text-center text-sm text-white/48">Synchronizing vault...</div>
            )}
            {!loading && accounts.length === 0 && (
              <div className="p-10 text-center">
                <RiFingerprintLine className="mx-auto mb-4 size-10 text-white/28" />
                <div className="text-lg font-light text-white">暂无账号资产</div>
                <div className="mt-2 text-sm text-white/45">创建任务后，账号会出现在这个空间面板里。</div>
              </div>
            )}
            {!loading && accounts.map(account => (
              <div
                key={account.id}
                className="grid gap-4 px-5 py-4 transition-all hover:bg-white/[0.045] lg:grid-cols-[1.2fr_1fr_0.7fr_1fr_0.8fr] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{account.email}</div>
                  <div className="mt-1 truncate text-xs text-white/38">{account.proxy || 'No proxy attached'}</div>
                </div>
                <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-xs text-white/55">
                  <span className="block truncate">{account.profileId}</span>
                </div>
                <StatusBadge tone={statusTone(account.status) as any} pulse={account.status === 'success'}>
                  {account.status}
                </StatusBadge>
                <div className="text-xs text-white/45">{new Date(account.createdAt).toLocaleString()}</div>
                <div className="flex justify-start lg:justify-end">
                  <Button size="sm" variant="primary" onClick={() => exportAuth(account)}>
                    <RiDownloadCloud2Line className="size-4" />
                    导出 auth.json
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </WindowFrame>
  );
};

export default Accounts;
