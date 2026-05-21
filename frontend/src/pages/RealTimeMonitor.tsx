import React, { useEffect, useState } from 'react';
import { Card, List, Typography } from 'antd';

const RealTimeMonitor: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([
    "系统启动完成",
    "Dolphin Anty API 连接成功",
    "等待任务执行...",
  ]);

  // 模拟实时日志（实际可换成 WebSocket）
  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 任务状态更新...`].slice(-10));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card title="实时任务监控" style={{ marginTop: 16 }}>
      <List
        dataSource={logs}
        renderItem={item => <List.Item><Typography.Text>{item}</Typography.Text></List.Item>}
      />
    </Card>
  );
};

export default RealTimeMonitor;
