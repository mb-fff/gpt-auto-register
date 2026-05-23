import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiLoader4Line,
  RiPulseLine,
  RiRadioButtonLine,
  RiTerminalBoxLine,
  RiTimeLine,
} from '@remixicon/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { MetricOrb } from '../components/os/MetricOrb';
import { StatusBadge } from '../components/os/StatusBadge';
import { WindowFrame } from '../components/os/WindowFrame';
import {
  TaskJob,
  QueueStatus,
  emptyQueueStatus,
  formatJobTime,
  getJobStateLabel,
  getJobStateTone,
} from '../lib/taskTypes';

const RealTimeMonitor: React.FC = () => {
  const [status, setStatus] = useState<QueueStatus>(emptyQueueStatus);
  const [jobs, setJobs] = useState<TaskJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const fetchQueueSnapshot = async () => {
    try {
      const [statusRes, jobsRes] = await Promise.all([
        axios.get<QueueStatus>('/api/tasks/status'),
        axios.get<TaskJob[]>('/api/tasks/jobs?limit=20'),
      ]);
      setStatus({ ...emptyQueueStatus, ...statusRes.data });
      setJobs(jobsRes.data || []);
      setLastUpdatedAt(new Date());
    } catch (error) {
      console.error('获取任务监控失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueSnapshot();
    const interval = setInterval(fetchQueueSnapshot, 3000);
    return () => clearInterval(interval);
  }, []);

  const activityItems = jobs.flatMap(job => {
    const base = {
      id: job.id || 'unknown',
      state: job.state,
      time: job.finishedOn || job.processedOn || job.timestamp,
    };

    if (job.logs?.length) {
      return job.logs.map((log, index) => ({
        ...base,
        key: `${base.id}-${index}-${log}`,
        text: log,
      }));
    }

    return [{
      ...base,
      key: `${base.id}-state`,
      text: job.progress?.message || `任务 #${job.id} ${getJobStateLabel(job.state)}`,
    }];
  }).slice(0, 18);

  return (
    <WindowFrame
      title="实时活动流"
      subtitle="从 BullMQ 队列读取真实任务状态、进度和执行日志。"
      status={loading ? '连接中' : '正在监听'}
    >
      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricOrb label="排队任务" value={status.waiting + status.delayed} icon={<RiTimeLine />} tone="blue" />
        <MetricOrb label="执行中" value={status.active} icon={<RiLoader4Line />} tone="amber" />
        <MetricOrb label="已完成" value={status.completed} icon={<RiCheckboxCircleLine />} tone="green" />
        <MetricOrb label="失败任务" value={status.failed} icon={<RiErrorWarningLine />} tone="purple" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>活动控制台</CardTitle>
                <CardDescription>每 3 秒刷新最近任务事件。</CardDescription>
              </div>
              <StatusBadge tone="success" pulse>{lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : '等待数据'}</StatusBadge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t border-white/[0.07] bg-black/18 p-4 font-mono">
              {activityItems.length ? activityItems.map(item => (
                <div
                  key={item.key}
                  className="flex items-start gap-3 rounded-2xl px-3 py-3 text-sm text-white/68 transition-all hover:bg-white/[0.045] hover:text-white"
                >
                  <span className="mt-1 size-2 rounded-full bg-[#6E7BFF] shadow-[0_0_18px_rgba(110,123,255,0.85)]" />
                  <span className="w-20 shrink-0 text-xs text-white/35">{formatJobTime(item.time)}</span>
                  <span className="min-w-0 flex-1 break-words">{item.text}</span>
                  <StatusBadge tone={getJobStateTone(item.state)}>{getJobStateLabel(item.state)}</StatusBadge>
                </div>
              )) : (
                <div className="rounded-2xl px-3 py-8 text-center text-sm text-white/42">
                  暂无任务事件。提交任务后，这里会显示真实队列日志。
                </div>
              )}
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
              <div className="flex items-center justify-between rounded-3xl border border-white/[0.07] bg-white/[0.035] px-4 py-3">
                <span className="text-sm text-white/62">最近任务</span>
                <span className="text-sm text-white">{jobs.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white/[0.07] text-[#9D7CFF]">
                <RiTerminalBoxLine className="size-5" />
              </div>
              <div>
                <div className="text-sm text-white">队列轮询已连接</div>
                <div className="mt-1 text-xs text-white/42">数据来自 /tasks/status 和 /tasks/jobs。</div>
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
