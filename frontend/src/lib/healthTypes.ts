export type HealthStatus = 'ok' | 'warn' | 'error';

export interface HealthCheck {
  key: string;
  label: string;
  status: HealthStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface HealthReport {
  status: HealthStatus;
  checkedAt: string;
  checks: HealthCheck[];
}

export interface HealthOverview {
  status: HealthStatus;
  checkedAt: string;
  config: HealthReport;
  services: HealthReport;
}

export function getHealthTone(status: HealthStatus) {
  if (status === 'ok') return 'success';
  if (status === 'warn') return 'warning';
  return 'danger';
}

export function getHealthLabel(status: HealthStatus) {
  if (status === 'ok') return '正常';
  if (status === 'warn') return '注意';
  return '异常';
}
