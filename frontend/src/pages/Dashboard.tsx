import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RiAddLine,
  RiCheckboxCircleLine,
  RiFingerprintLine,
  RiPulseLine,
  RiRobot2Line,
  RiTimeLine,
} from '@remixicon/react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { MetricOrb } from '../components/os/MetricOrb';
import { StatusBadge } from '../components/os/StatusBadge';
import { WindowFrame } from '../components/os/WindowFrame';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    running: 0,
    today: 0,
  });

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/accounts');
      setStats({
        total: res.data.length,
        success: res.data.filter((a: any) => a.status === 'success').length,
        running: 3, // 模拟
        today: 12,
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <WindowFrame
      title="AI OS Overview"
      subtitle="一个悬浮式控制台，用于观察账号资产、任务队列和系统运行状态。"
      status="Workspace Online"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricOrb label="总账号数" value={stats.total} icon={<RiFingerprintLine />} tone="blue" />
        <MetricOrb label="成功账号" value={stats.success} icon={<RiCheckboxCircleLine />} tone="green" />
        <MetricOrb label="运行中任务" value={stats.running} icon={<RiPulseLine />} tone="amber" />
        <MetricOrb label="今日新增" value={stats.today} icon={<RiTimeLine />} tone="purple" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="min-h-[320px]">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Mission Surface</CardTitle>
                <CardDescription>创建、观察并进入批量注册任务工作流。</CardDescription>
              </div>
              <StatusBadge tone="success" pulse>Ready</StatusBadge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#0F131A]/70 p-6">
              <div className="absolute right-0 top-0 size-52 rounded-full bg-[#6E7BFF]/20 blur-[70px]" />
              <div className="relative max-w-xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/55">
                  <RiRobot2Line className="size-4 text-[#cdd2ff]" />
                  Spatial automation console
                </div>
                <h2 className="text-3xl font-light leading-tight text-white">从一个任务面板启动整条注册链路。</h2>
                <p className="mt-3 text-sm leading-6 text-white/56">
                  保持后端队列与 OAuth 流程不变，前端提供更清晰的任务入口、状态反馈和操作节奏。
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button variant="primary" size="lg" onClick={() => { window.location.href = '/tasks'; }}>
                    <RiAddLine className="size-5" />
                    创建批量注册任务
                  </Button>
                  <Link to="/monitor">
                    <Button variant="secondary" size="lg">查看实时活动</Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Pulse</CardTitle>
            <CardDescription>当前工作台的关键运行信号。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[
              ['Dolphin profile bridge', '待本地 Dolphin API 响应', 'violet'],
              ['Account vault', `${stats.total} assets indexed`, 'success'],
              ['Register queue', `${stats.running} simulated active missions`, 'warning'],
              ['Refresh token export', 'auth.json ready when RT exists', 'neutral'],
            ].map(([label, value, tone]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-3xl border border-white/[0.07] bg-white/[0.035] px-4 py-3">
                <div>
                  <div className="text-sm text-white/82">{label}</div>
                  <div className="mt-1 text-xs text-white/42">{value}</div>
                </div>
                <StatusBadge tone={tone as any} pulse={tone !== 'neutral'}>{tone}</StatusBadge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </WindowFrame>
  );
};

export default Dashboard;
