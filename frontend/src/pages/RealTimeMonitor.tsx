import React, { useEffect, useState } from 'react';
import { RiPulseLine, RiRadioButtonLine, RiTerminalBoxLine } from '@remixicon/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { StatusBadge } from '../components/os/StatusBadge';
import { WindowFrame } from '../components/os/WindowFrame';

const RealTimeMonitor: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([
    '系统启动完成',
    'Dolphin Anty API 连接成功',
    '等待任务执行...',
  ]);

  // 模拟实时日志（实际可换成 WebSocket）
  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 任务状态更新...`].slice(-10));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <WindowFrame
      title="实时活动流"
      subtitle="终端式活动流，用于观察本地任务、Profile 和队列状态变化。"
      status="正在监听"
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>活动控制台</CardTitle>
                <CardDescription>最近 10 条系统活动会自动刷新。</CardDescription>
              </div>
              <StatusBadge tone="success" pulse>实时</StatusBadge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t border-white/[0.07] bg-black/18 p-4 font-mono">
              {logs.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="flex items-start gap-3 rounded-2xl px-3 py-3 text-sm text-white/68 transition-all hover:bg-white/[0.045] hover:text-white"
                >
                  <span className="mt-1 size-2 rounded-full bg-[#6E7BFF] shadow-[0_0_18px_rgba(110,123,255,0.85)]" />
                  <span className="min-w-0 flex-1 break-words">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>信号</CardTitle>
              <CardDescription>当前活动流连接状态。</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-center rounded-[28px] border border-white/[0.07] bg-white/[0.04] p-8">
                <div className="relative flex size-28 items-center justify-center rounded-full border border-[#6E7BFF]/24 bg-[#6E7BFF]/10">
                  <RiRadioButtonLine className="size-10 text-[#cdd2ff]" />
                  <span className="absolute inset-3 rounded-full border border-[#6E7BFF]/18 animate-ping" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-3xl border border-white/[0.07] bg-white/[0.035] px-4 py-3">
                <span className="text-sm text-white/62">心跳</span>
                <span className="text-sm text-emerald-200">3s</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white/[0.07] text-[#9D7CFF]">
                <RiTerminalBoxLine className="size-5" />
              </div>
              <div>
                <div className="text-sm text-white">WebSocket 就绪</div>
                <div className="mt-1 text-xs text-white/42">后续可替换模拟日志源。</div>
              </div>
              <RiPulseLine className="ml-auto size-5 text-emerald-200" />
            </CardContent>
          </Card>
        </div>
      </div>
    </WindowFrame>
  );
};

export default RealTimeMonitor;
