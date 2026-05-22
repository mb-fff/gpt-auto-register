import React from 'react';
import { Card, Form, Input, Button, message, Select } from 'antd';
import axios from 'axios';

const Tasks: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    try {
      await axios.post('/api/tasks/register', {
        count: parseInt(values.count),
        proxy: values.proxy || undefined,
      });
      message.success(`成功创建 ${values.count} 个注册任务！`);
      form.resetFields();
    } catch (error) {
      message.error('创建任务失败');
    }
  };

  return (
    <Card title="创建批量注册任务" style={{ maxWidth: 600 }}>
      <Form form={form} onFinish={onFinish} layout="vertical">
        <Form.Item name="count" label="注册数量" rules={[{ required: true }]}>
          <Input type="number" min={1} max={100} placeholder="建议 1~20" />
        </Form.Item>

        <Form.Item name="proxy" label="代理 (可选)">
          <Input placeholder="http://user:pass@ip:port" />
        </Form.Item>

        <Button type="primary" htmlType="submit" block size="large">
          提交任务到队列
        </Button>
      </Form>
    </Card>
  );
};

export default Tasks;
