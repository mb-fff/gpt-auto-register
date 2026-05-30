// 📁 frontend/src/pages/AccountDetail.tsx

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  RiArrowLeftLine,
  RiCalendarLine,
  RiErrorWarningLine,
  RiFileCopyLine,
  RiLinksLine,
  RiRefreshLine,
  RiShieldCheckLine,
  RiFingerprintLine,
  RiMacbookLine,
  RiWindowsLine,
  RiGlobalLine,
  RiDoorLine,
} from '@remixicon/react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { MetricOrb } from '../components/os/MetricOrb';
import { StatusBadge } from '../components/os/StatusBadge';
import { copyValue, TokenField } from '../components/os/TokenField';
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
	                    <div className="flex min-w-0 items-center gap-2">
	                      <CardTitle className="truncate">{account.email}</CardTitle>
	                      <button
	                        type="button"
	                        onClick={() => copyValue('账号名', account.email)}
	                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-white/45 transition-all hover:border-white/16 hover:bg-white/[0.09] hover:text-white"
	                        aria-label="复制账号名"
	                        title="复制账号名"
	                      >
	                        <RiFileCopyLine className="size-4" />
	                      </button>
	                    </div>
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
                  <CardTitle>Token 凭证</CardTitle>
                  <CardDescription>当前账号任务保存的 Access Token 和 Refresh Token。</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <TokenField label="Access Token" value={account.accessToken} />
                  <TokenField label="Refresh Token" value={account.refreshToken} />
                </CardContent>
              </Card>

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

          {/* 👇 新增的设备指纹卡片 */}
          {account.fingerprint && (
            <Card className="border-white/[0.08] bg-[#0F131A]/70">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <RiFingerprintLine className="size-5 text-[#6E7BFF]" />
                  <CardTitle>设备指纹环境</CardTitle>
                </div>
                <CardDescription>
                  注册该账号时所分配的物理与环境特征。后续活跃行为应保持此特征一致。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                
                {/* 操作系统卡片 */}
                <div className="flex items-center gap-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
                  <div className=" rounded-full bg-white/[0.05] p-3">
                    {account.fingerprint.platform === 'macOS' ? (
                      <RiMacbookLine className="size-6 text-white/70" />
                    ) : (
                      <RiWindowsLine className="size-6 text-white/70" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-white/40">操作系统与硬件</div>
                    <div className="mt-0.5 text-sm font-medium text-white/80">
                      {account.fingerprint.platform} ({account.fingerprint.hardwareConcurrency}核 / {account.fingerprint.deviceMemory}GB)
                    </div>
                  </div>
                </div>

                {/* 屏幕分辨率卡片 */}
                <div className="flex items-center gap-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
                  <div className=" rounded-full bg-white/[0.05] p-3">
                    <RiDoorLine className="size-6 text-white/70" />
                  </div>
                  <div>
                    <div className="text-xs text-white/40">屏幕分辨率</div>
                    <div className="mt-0.5 text-sm font-medium text-white/80">
                      {account.fingerprint.screenSize}
                    </div>
                  </div>
                </div>

                {/* 时区与底层指纹 */}
                <div className="flex items-center gap-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
                   <div className=" rounded-full bg-white/[0.05] p-3">
                    <RiGlobalLine className="size-6 text-white/70" />
                  </div>
                  <div>
                    <div className="text-xs text-white/40">系统时区 & 引擎伪装</div>
                    <div className="mt-0.5 flex items-center gap-2 text-sm font-medium text-white/80">
                      {account.fingerprint.timezone} 
                      <span className="rounded bg-[#6E7BFF]/20 px-1.5 py-0.5 text-[10px] text-[#8C98FF]">
                        {account.fingerprint.impersonate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* User Agent 长条显示 */}
                <div className="col-span-1 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 md:col-span-2 xl:col-span-3">
                  <div className="mb-2 text-xs text-white/40">User-Agent</div>
                  <div className="break-all rounded-lg border border-white/[0.03] bg-black/20 p-2 font-mono text-xs text-white/50">
                    {account.fingerprint.userAgent}
                  </div>
                </div>
                
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </WindowFrame>
  );
};

export default AccountDetail;