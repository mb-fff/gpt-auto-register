import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, message } from 'antd';
import axios from 'axios';

const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/accounts');
      setAccounts(res.data);
    } catch (err) {
      message.error('获取账号列表失败');
    } finally {
      setLoading(false);
    }
  };

  const exportAuth = (account: any) => {
    if (!account.refreshToken) {
      message.warning('该账号暂无 Refresh Token');
      return;
    }
    const authData = { refresh_token: account.refreshToken };
    const blob = new Blob([JSON.stringify(authData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auth_${account.email.split('@')[0]}.json`;
    a.click();
    message.success('auth.json 下载成功');
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const columns = [
    { title: '邮箱', dataIndex: 'email' },
    { title: 'Profile ID', dataIndex: 'profileId', ellipsis: true },
    { 
      title: '状态', 
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'success' ? 'green' : status === 'failed' ? 'red' : 'blue'}>
          {status}
        </Tag>
      )
    },
    { title: '代理', dataIndex: 'proxy', ellipsis: true },
    { title: '创建时间', dataIndex: 'createdAt', render: (date: string) => new Date(date).toLocaleString() },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Button type="primary" size="small" onClick={() => exportAuth(record)}>
          导出 auth.json
        </Button>
      ),
    },
  ];

  return (
    <div>
      <h1>账号管理</h1>
      <Table 
        columns={columns} 
        dataSource={accounts} 
        rowKey="id" 
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default Accounts;
