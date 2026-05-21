import React, { useState } from 'react';
import { Form, Input, Button, Select, Card, message } from 'antd';
import axios from 'axios';

const Tasks: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    try {
      await axios.post('/api/tasks/register', values);
      message.success('批量注册任务已加入队列！');
      form.resetFields();
    } catch (err) {
      message.error('创建任务失败');
    }
  };

  return (
    <Card title="创建批量注册任务">
      <Form form={form} onFinish={onFinish} layout="vertical">
        <Form.Item name="count" label="注册数量" rules={[{ required: true }]}>
          <Input type="number" min={1} max={50} />
        </Form.Item>
        <Form.Item name="proxy" label="代理（可选）">
          <Input placeholder="http://user:pass@ip:port" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          提交任务
        </Button>
      </Form>
    </Card>
  );
};

export default Tasks;
