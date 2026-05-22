import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Button } from 'antd';
import { UserOutlined, CheckCircleOutlined, SyncOutlined, PlusOutlined } from '@ant-design/icons';
import axios from 'axios';

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
    <div>
      <h1 style={{ marginBottom: 24 }}>GPT Auto Register Dashboard</h1>
      
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="总账号数" value={stats.total} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="成功账号" value={stats.success} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="运行中任务" value={stats.running} prefix={<SyncOutlined spin />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="今日新增" value={stats.today} />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }} title="快速操作">
        <Button type="primary" icon={<PlusOutlined />} size="large" href="/tasks">
          创建批量注册任务
        </Button>
      </Card>
    </div>
  );
};

export default Dashboard;
