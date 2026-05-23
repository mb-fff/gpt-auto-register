import React, { useEffect, useState } from 'react';
import {
  RiDownloadCloud2Line,
  RiFingerprintLine,
  RiSearch2Line,
  RiRefreshLine,
  RiShieldCheckLine,
} from '@remixicon/react';
import axios from 'axios';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { StatusBadge } from '../components/os/StatusBadge';
import { WindowFrame } from '../components/os/WindowFrame';
import { Account, exportAuthFile, getAccountStatusTone } from '../lib/accountTypes';

const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

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

  const exportAuth = (account: Account) => {
    if (!exportAuthFile(account)) {
      toast.warning('该账号暂无 Refresh Token');
      return;
    }
    toast.success('auth.json 下载成功');
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const filteredAccounts = accounts.filter(account => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return true;
    return [account.email, account.profileId, account.status, account.proxy || '']
      .some(value => value.toLowerCase().includes(keyword));
  });

  return (
    <WindowFrame
      title="账号资产库"
      subtitle="以空间数据面板管理账号资产、Profile 指纹和 Refresh Token 导出。"
      status={`${accounts.length} 个账号`}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-white/50">
          <RiShieldCheckLine className="size-5 text-emerald-200" />
          账号资产仅在本地查看，Refresh Token 只在手动导出时生成文件。
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <RiSearch2Line className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜索邮箱、状态、Profile..."
              className="pl-10 sm:w-72"
            />
          </div>
          <Button variant="secondary" onClick={fetchAccounts} disabled={loading}>
            <RiRefreshLine className={loading ? 'size-5 animate-spin' : 'size-5'} />
            刷新
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="hidden grid-cols-[1.2fr_1fr_0.7fr_1fr_0.8fr] gap-4 border-b border-white/[0.07] px-5 py-4 text-xs font-medium tracking-normal text-white/38 lg:grid">
            <span>账号</span>
            <span>Profile</span>
            <span>状态</span>
            <span>创建时间</span>
            <span className="text-right">操作</span>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {loading && (
              <div className="p-8 text-center text-sm text-white/48">Synchronizing vault...</div>
            )}
            {!loading && filteredAccounts.length === 0 && (
              <div className="p-10 text-center">
                <RiFingerprintLine className="mx-auto mb-4 size-10 text-white/28" />
                <div className="text-lg font-normal text-white">{accounts.length ? '没有匹配账号' : '暂无账号资产'}</div>
                <div className="mt-2 text-sm text-white/45">{accounts.length ? '换个关键词试试。' : '创建任务后，账号会出现在这个空间面板里。'}</div>
              </div>
            )}
            {!loading && filteredAccounts.map(account => (
              <div
                key={account.id}
                className="grid gap-4 px-5 py-4 transition-all hover:bg-white/[0.045] lg:grid-cols-[1.2fr_1fr_0.7fr_1fr_0.8fr] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{account.email}</div>
                  <div className="mt-1 truncate text-xs text-white/38">{account.proxy || '未绑定代理'}</div>
                </div>
                <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-xs text-white/55">
                  <span className="block truncate">{account.profileId}</span>
                </div>
                <StatusBadge tone={getAccountStatusTone(account.status) as any} pulse={account.status === 'success'}>
                  {account.status}
                </StatusBadge>
                <div className="text-xs text-white/45">{new Date(account.createdAt).toLocaleString()}</div>
                <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                  <Link to={`/accounts/${account.id}`}>
                    <Button size="sm" variant="secondary">
                      查看详情
                    </Button>
                  </Link>
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
