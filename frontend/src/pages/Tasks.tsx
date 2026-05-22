import React, { useState } from 'react';
import {
  RiArrowRightLine,
  RiFlashlightLine,
  RiInformationLine,
  RiLinksLine,
  RiRocket2Line,
} from '@remixicon/react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { StatusBadge } from '../components/os/StatusBadge';
import { WindowFrame } from '../components/os/WindowFrame';

const Tasks: React.FC = () => {
  const [count, setCount] = useState('5');
  const [proxy, setProxy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastJobs, setLastJobs] = useState<string[]>([]);

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
      title="Mission Control"
      subtitle="将批量注册任务投递到 BullMQ 队列，并保持现有后端处理链路不变。"
      status="Queue Armed"
    >
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Launch Sequence</CardTitle>
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
              <CardTitle>Mission Parameters</CardTitle>
              <CardDescription>当前任务将保持本地学习模式，不改变后端业务逻辑。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {[
                ['Attempts', '3 retries', <RiFlashlightLine className="size-5" />],
                ['Backoff', '5s exponential', <RiArrowRightLine className="size-5" />],
                ['Proxy', proxy ? 'attached' : 'optional', <RiLinksLine className="size-5" />],
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
                  <CardTitle>Last Dispatch</CardTitle>
                  <CardDescription>最近一次投递返回的队列 job id。</CardDescription>
                </div>
                <StatusBadge tone={lastJobs.length ? 'success' : 'neutral'} pulse={!!lastJobs.length}>
                  {lastJobs.length ? `${lastJobs.length} jobs` : 'idle'}
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
        </div>
      </div>
    </WindowFrame>
  );
};

export default Tasks;
