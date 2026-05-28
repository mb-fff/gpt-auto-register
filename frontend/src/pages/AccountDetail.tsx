import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  RiArrowLeftLine,
  RiCalendarLine,
  RiErrorWarningLine,
  RiLinksLine,
  RiRefreshLine,
  RiShieldCheckLine,
} from '@remixicon/react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { MetricOrb } from '../components/os/MetricOrb';
import { StatusBadge } from '../components/os/StatusBadge';
import { WindowFrame } from '../components/os/WindowFrame';
import { Account, getAccountStatusTone } from '../lib/accountTypes';

const AccountDetail: React.FC = () => {
  const { id } = useParams();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAccount = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const res = await axios.get<Account>(`/api/accounts/${id}`);
      setAccount(res.data);
    } catch (error) {
      toast.error('获取账号详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccount();
  }, [id]);

  const detailItems = account ? [
    ['邮箱', account.email],
    ['账号 ID', account.id],
    ['本地任务 ID', account.profileId],
    ['代理', account.proxy || '未绑定代理'],
    ['创建时间', new Date(account.createdAt).toLocaleString()],
    ['更新时间', new Date(account.updatedAt).toLocaleString()],
  ] : [];

  return (
    <WindowFrame
      title="账号详情"
      subtitle="从任务结果进入账号资产，查看代理绑定和注册状态。"
      status={account ? account.status : loading ? '加载中' : '未找到'}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/accounts">
          <Button variant="secondary">
            <RiArrowLeftLine className="size-5" />
            返回账号库
          </Button>
        </Link>
        <Button variant="secondary" onClick={fetchAccount} disabled={loading}>
          <RiRefreshLine className={loading ? 'size-5 animate-spin' : 'size-5'} />
          刷新详情
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-10 text-center text-sm text-white/48">正在同步账号详情...</CardContent>
        </Card>
      )}

      {!loading && !account && (
        <Card>
          <CardContent className="p-10 text-center">
            <RiErrorWarningLine className="mx-auto mb-4 size-10 text-amber-200" />
            <div className="text-lg font-normal text-white">账号不存在</div>
            <div className="mt-2 text-sm text-white/45">可能已被删除，或任务结果中的账号 ID 已过期。</div>
          </CardContent>
        </Card>
      )}

      {account && (
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricOrb label="账号状态" value={account.status} icon={<RiShieldCheckLine />} tone={account.status === 'success' ? 'green' : account.status === 'failed' ? 'amber' : 'blue'} />
            <MetricOrb label="代理绑定" value={account.proxy ? '已绑定' : '未绑定'} icon={<RiLinksLine />} tone={account.proxy ? 'blue' : 'amber'} />
            <MetricOrb label="创建日期" value={new Date(account.createdAt).toLocaleDateString()} icon={<RiCalendarLine />} tone="green" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{account.email}</CardTitle>
                    <CardDescription>账号资产详情和本地状态。</CardDescription>
                  </div>
                  <StatusBadge tone={getAccountStatusTone(account.status) as any} pulse={account.status === 'success'}>
                    {account.status}
                  </StatusBadge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                {detailItems.map(([label, value]) => (
                  <div key={label} className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4">
                    <div className="text-xs text-white/38">{label}</div>
                    <div className="mt-2 break-all text-sm text-white/78">{value}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-5">
              <Card>
                <CardHeader>
                  <CardTitle>代理配置</CardTitle>
                  <CardDescription>当前账号任务记录的代理链路。</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-3xl border border-[#6E7BFF]/24 bg-[#6E7BFF]/12 text-[#cdd2ff]">
                    <RiLinksLine className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white">{account.proxy || '未绑定代理'}</div>
                    <div className="mt-1 truncate text-xs text-white/42">{account.proxy || '未绑定代理'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </WindowFrame>
  );
};

export default AccountDetail;
