import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  RiArrowLeftLine,
  RiCalendarLine,
  RiDownloadCloud2Line,
  RiErrorWarningLine,
  RiFingerprintLine,
  RiKey2Line,
  RiLinksLine,
  RiRefreshLine,
  RiShieldCheckLine,
} from '@remixicon/react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { MetricOrb } from '../components/os/MetricOrb';
import { StatusBadge } from '../components/os/StatusBadge';
import { WindowFrame } from '../components/os/WindowFrame';
import { Account, exportAuthFile, getAccountStatusTone } from '../lib/accountTypes';

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

  const exportAuth = () => {
    if (!account || !exportAuthFile(account)) {
      toast.warning('该账号暂无 Refresh Token');
      return;
    }

    toast.success('auth.json 下载成功');
  };

  const detailItems = account ? [
    ['邮箱', account.email],
    ['账号 ID', account.id],
    ['Profile ID', account.profileId],
    ['代理', account.proxy || '未绑定代理'],
    ['创建时间', new Date(account.createdAt).toLocaleString()],
    ['更新时间', new Date(account.updatedAt).toLocaleString()],
    ['Refresh Token 到期', account.rtExpiresAt ? new Date(account.rtExpiresAt).toLocaleString() : '未记录'],
  ] : [];

  return (
    <WindowFrame
      title="账号详情"
      subtitle="从任务结果进入账号资产，查看 Profile、代理、Token 状态和导出入口。"
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
            <MetricOrb label="Refresh Token" value={account.refreshToken ? '已写入' : '未获取'} icon={<RiKey2Line />} tone={account.refreshToken ? 'purple' : 'amber'} />
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
                  <CardTitle>Token 操作</CardTitle>
                  <CardDescription>存在 Refresh Token 时可导出 Codex/本地工具使用的 auth.json。</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Button variant="primary" size="lg" onClick={exportAuth} disabled={!account.refreshToken}>
                    <RiDownloadCloud2Line className="size-5" />
                    导出 auth.json
                  </Button>
                  <div className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4 text-sm text-white/50">
                    {account.refreshToken ? 'Refresh Token 已存在，只会在你点击导出时写入本地文件。' : '当前账号还没有 Refresh Token，完成 OAuth 后会显示导出入口。'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Profile 信号</CardTitle>
                  <CardDescription>Dolphin Profile 和代理链路。</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-3xl border border-[#6E7BFF]/24 bg-[#6E7BFF]/12 text-[#cdd2ff]">
                    <RiFingerprintLine className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white">{account.profileId}</div>
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
