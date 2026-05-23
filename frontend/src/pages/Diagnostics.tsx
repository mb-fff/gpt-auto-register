import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  RiDatabase2Line,
  RiHeartLine,
  RiMailCheckLine,
  RiRefreshLine,
  RiSettings4Line,
  RiShieldCheckLine,
  RiWifiLine,
} from '@remixicon/react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { MetricOrb } from '../components/os/MetricOrb';
import { StatusBadge } from '../components/os/StatusBadge';
import { WindowFrame } from '../components/os/WindowFrame';
import { HealthCheck, HealthOverview, getHealthLabel, getHealthTone } from '../lib/healthTypes';

function CheckRow({ check }: { check: HealthCheck }) {
  const detailText = check.details
    ? Object.entries(check.details)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(' · ')
    : '';

  return (
    <div className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4 transition-all hover:border-[#6E7BFF]/24 hover:bg-white/[0.055]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-medium text-white">{check.label}</div>
          <div className="mt-1 text-sm text-white/54">{check.message}</div>
          {detailText && <div className="mt-2 break-all text-xs text-white/34">{detailText}</div>}
        </div>
        <StatusBadge tone={getHealthTone(check.status) as any} pulse={check.status === 'ok'}>
          {getHealthLabel(check.status)}
        </StatusBadge>
      </div>
    </div>
  );
}

const Diagnostics: React.FC = () => {
  const [health, setHealth] = useState<HealthOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await axios.get<HealthOverview>('/api/health');
      setHealth(res.data);
    } catch (error) {
      toast.error('获取系统诊断失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const serviceChecks = health?.services.checks || [];
  const configChecks = health?.config.checks || [];
  const okCount = [...serviceChecks, ...configChecks].filter(item => item.status === 'ok').length;
  const warnCount = [...serviceChecks, ...configChecks].filter(item => item.status === 'warn').length;
  const errorCount = [...serviceChecks, ...configChecks].filter(item => item.status === 'error').length;

  return (
    <WindowFrame
      title="系统诊断"
      subtitle="启动前检查数据库、Redis、指纹浏览器、IMAP 和关键环境变量，定位流程失败点。"
      status={health ? getHealthLabel(health.status) : loading ? '检查中' : '未连接'}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-white/50">
          <RiHeartLine className="size-5 text-emerald-200" />
          {health?.checkedAt ? `最近检查：${new Date(health.checkedAt).toLocaleString()}` : '等待系统检查结果'}
        </div>
        <Button variant="secondary" onClick={fetchHealth} disabled={loading}>
          <RiRefreshLine className={loading ? 'size-5 animate-spin' : 'size-5'} />
          重新检查
        </Button>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricOrb label="总体状态" value={health ? getHealthLabel(health.status) : '检查中'} icon={<RiShieldCheckLine />} tone={health?.status === 'error' ? 'amber' : health?.status === 'warn' ? 'purple' : 'green'} />
        <MetricOrb label="正常项" value={okCount} icon={<RiHeartLine />} tone="green" />
        <MetricOrb label="注意项" value={warnCount} icon={<RiSettings4Line />} tone="amber" />
        <MetricOrb label="异常项" value={errorCount} icon={<RiWifiLine />} tone="purple" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>服务连通性</CardTitle>
            <CardDescription>真实连接数据库、Redis、指纹浏览器 API 和 IMAP。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {loading && <div className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-6 text-sm text-white/42">正在检查服务...</div>}
            {!loading && serviceChecks.length === 0 && <div className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-6 text-sm text-white/42">暂无服务检查结果。</div>}
            {serviceChecks.map(check => <CheckRow key={check.key} check={check} />)}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>配置完整性</CardTitle>
              <CardDescription>检查必要环境变量是否存在，敏感值不会直接展示。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {loading && <div className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-6 text-sm text-white/42">正在读取配置...</div>}
              {configChecks.map(check => <CheckRow key={check.key} check={check} />)}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
              {[
                ['数据库', serviceChecks.find(item => item.key === 'database')?.status, <RiDatabase2Line className="size-5" />],
                ['邮箱', serviceChecks.find(item => item.key === 'imap')?.status, <RiMailCheckLine className="size-5" />],
                ['浏览器', serviceChecks.find(item => item.key === 'browserProvider')?.status, <RiWifiLine className="size-5" />],
              ].map(([label, status, icon]) => (
                <div key={label as string} className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-white/[0.07] text-[#cdd2ff]">{icon}</div>
                  <div className="text-sm text-white">{label as string}</div>
                  <div className="mt-1 text-xs text-white/45">{status ? getHealthLabel(status as any) : '未检查'}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </WindowFrame>
  );
};

export default Diagnostics;
