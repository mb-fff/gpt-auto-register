import React, { useEffect, useState } from 'react';
import {
  RiArrowRightLine,
  RiFlashlightLine,
  RiInformationLine,
  RiLinksLine,
  RiLoopRightLine,
  RiRocket2Line,
} from '@remixicon/react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { StatusBadge } from '../components/os/StatusBadge';
import { WindowFrame } from '../components/os/WindowFrame';
import {
  TaskJob,
  QueueStatus,
  emptyQueueStatus,
  getJobStateLabel,
  getJobStateTone,
} from '../lib/taskTypes';

const Tasks: React.FC = () => {
  const [count, setCount] = useState('5');
  const [proxy, setProxy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastJobs, setLastJobs] = useState<string[]>([]);
  const [status, setStatus] = useState<QueueStatus>(emptyQueueStatus);
  const [recentJobs, setRecentJobs] = useState<TaskJob[]>([]);

  const fetchQueueSnapshot = async () => {
    try {
      const [statusRes, jobsRes] = await Promise.all([
        axios.get<QueueStatus>('/api/tasks/status'),
        axios.get<TaskJob[]>('/api/tasks/jobs?limit=8'),
      ]);
      setStatus({ ...emptyQueueStatus, ...statusRes.data });
      setRecentJobs(jobsRes.data || []);
    } catch (error) {
      console.error('获取队列状态失败', error);
    }
  };

  useEffect(() => {
    fetchQueueSnapshot();
    const interval = setInterval(fetchQueueSnapshot, 5000);
    return () => clearInterval(interval);
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedCount = parseInt(count, 10);
    if (!parsedCount || parsedCount < 1) {
      toast.error('请输入有效的注册数量');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post('/api/tasks/register', {
        count: parsedCount,
        proxy: proxy || undefined,
      });
      setLastJobs(res.data?.jobIds || []);
      toast.success(`成功创建 ${parsedCount} 个注册任务！`);
      await fetchQueueSnapshot();
      setCount('5');
      setProxy('');
    } catch (error) {
      toast.error('创建任务失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WindowFrame
      title="任务控制舱"
      subtitle="将批量注册任务投递到 BullMQ 队列，并保持现有后端处理链路不变。"
      status="队列就绪"
    >
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>启动序列</CardTitle>
            <CardDescription>配置注册数量和可选代理，然后提交到队列。</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-5">
              <label className="flex flex-col gap-2">
                <span className="text-sm text-white/68">注册数量</span>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={event => setCount(event.target.value)}
                  placeholder="建议 1~20"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm text-white/68">代理 (可选)</span>
                <Input
                  value={proxy}
                  onChange={event => setProxy(event.target.value)}
                  placeholder="http://user:pass@ip:port"
                />
              </label>

              <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full">
                <RiRocket2Line className={submitting ? 'size-5 animate-soft-pulse' : 'size-5'} />
                {submitting ? '正在投递任务...' : '提交任务到队列'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>任务参数</CardTitle>
              <CardDescription>提交后会进入 BullMQ 队列，并在活动流中持续更新。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {[
                ['重试策略', '最多 3 次', <RiFlashlightLine className="size-5" />],
                ['退避间隔', '5 秒指数退避', <RiArrowRightLine className="size-5" />],
                ['代理状态', proxy ? '已绑定' : '可选', <RiLinksLine className="size-5" />],
              ].map(([label, value, icon]) => (
                <div key={label as string} className="rounded-3xl border border-white/[0.07] bg-white/[0.04] p-4">
                  <div className="mb-5 flex size-10 items-center justify-center rounded-2xl bg-white/[0.07] text-[#cdd2ff]">{icon}</div>
                  <div className="text-sm text-white">{label}</div>
                  <div className="mt-1 text-xs text-white/45">{value as string}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>队列状态</CardTitle>
                  <CardDescription>真实队列快照，每 5 秒刷新。</CardDescription>
                </div>
                <StatusBadge tone={status.active ? 'warning' : 'success'} pulse={!!status.active}>
                  {status.active ? '执行中' : '待命'}
                </StatusBadge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                ['排队', status.waiting],
                ['执行', status.active],
                ['延迟', status.delayed],
                ['完成', status.completed],
                ['失败', status.failed],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-3 text-center">
                  <div className="text-2xl font-normal text-white">{value as number}</div>
                  <div className="mt-1 text-xs text-white/42">{label as string}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>最近投递</CardTitle>
                  <CardDescription>最近一次投递返回的队列 Job ID。</CardDescription>
                </div>
                <StatusBadge tone={lastJobs.length ? 'success' : 'neutral'} pulse={!!lastJobs.length}>
                  {lastJobs.length ? `${lastJobs.length} 个任务` : '空闲'}
                </StatusBadge>
              </div>
            </CardHeader>
            <CardContent>
              {lastJobs.length ? (
                <div className="flex flex-wrap gap-2">
                  {lastJobs.slice(0, 12).map(job => (
                    <span key={job} className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-xs text-white/56">
                      #{job}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4 text-sm text-white/48">
                  <RiInformationLine className="size-5 text-[#9D7CFF]" />
                  提交任务后，队列 job id 会显示在这里。
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>最近任务</CardTitle>
                  <CardDescription>用于确认投递后的执行状态和失败原因。</CardDescription>
                </div>
                <RiLoopRightLine className="size-5 text-white/42" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {recentJobs.length ? recentJobs.map(job => (
                <div key={job.id} className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-white">任务 #{job.id}</div>
                      <div className="mt-1 text-xs text-white/42">
                        {job.progress?.stage || getJobStateLabel(job.state)}
                        {job.progress?.message ? ` · ${job.progress.message}` : ''}
                      </div>
                    </div>
                    <StatusBadge tone={getJobStateTone(job.state)} pulse={job.state === 'active'}>
                      {getJobStateLabel(job.state)}
                    </StatusBadge>
                  </div>
                  {job.failedReason && (
                    <div className="mt-3 rounded-2xl border border-red-300/15 bg-red-500/10 px-3 py-2 text-xs text-red-100/80">
                      {job.failedReason}
                    </div>
                  )}
                </div>
              )) : (
                <div className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4 text-sm text-white/42">
                  暂无队列任务。
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </WindowFrame>
  );
};

export default Tasks;
