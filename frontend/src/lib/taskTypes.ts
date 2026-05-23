export interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface TaskJobProgress {
  percent?: number;
  stage?: string;
  message?: string;
  accountId?: string;
}

export interface TaskJob {
  id?: string;
  name: string;
  state: 'active' | 'waiting' | 'delayed' | 'completed' | 'failed' | string;
  progress: TaskJobProgress;
  data?: {
    count?: number;
    proxy?: string;
  };
  attemptsMade: number;
  attemptsTotal: number;
  failedReason?: string;
  returnvalue?: {
    success?: boolean;
    accountId?: string;
  };
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  logs: string[];
}

export const emptyQueueStatus: QueueStatus = {
  waiting: 0,
  active: 0,
  completed: 0,
  failed: 0,
  delayed: 0,
};

export function getJobStateLabel(state: TaskJob['state']) {
  const labels: Record<string, string> = {
    active: '执行中',
    waiting: '排队中',
    delayed: '延迟中',
    completed: '已完成',
    failed: '已失败',
    paused: '已暂停',
  };

  return labels[state] || state;
}

export function getJobStateTone(state: TaskJob['state']) {
  if (state === 'completed') return 'success';
  if (state === 'active') return 'warning';
  if (state === 'failed') return 'danger';
  if (state === 'delayed') return 'violet';
  return 'neutral';
}

export function formatJobTime(value?: number) {
  if (!value) return '尚未开始';
  return new Date(value).toLocaleTimeString();
}
