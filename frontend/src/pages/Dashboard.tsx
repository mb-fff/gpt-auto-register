import React, { useEffect } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { UserOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';

const Dashboard: React.FC = () => {
  return (
    <div>
      <h1>仪表盘</h1>
      <Row gutter={16}>
        <Col span={6}>
          <Card><Statistic title="总账号" value={42} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="成功率" value={78} suffix="%" valueStyle={{ color: '#3f8600' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="运行中任务" value={3} prefix={<SyncOutlined spin />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="今日新增" value={12} /></Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
