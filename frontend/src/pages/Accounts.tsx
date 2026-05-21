import React, { useEffect, useState } from 'react';
import { Table, Button, message } from 'antd';
import axios from 'axios';

const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState([]);

  const fetchAccounts = async () => {
    const res = await axios.get('/api/accounts');
    setAccounts(res.data);
  };

  useEffect(() => { fetchAccounts(); }, []);

  const exportRT = (record: any) => {
    if (record.refreshToken) {
      const authJson = { refresh_token: record.refreshToken };
      const blob = new Blob([JSON.stringify(authJson, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auth_${record.email}.json`;
      a.click();
      message.success('auth.json 已导出');
    } else {
      message.error('该账号暂无 Refresh Token');
    }
  };

  const columns = [
    { title: '邮箱', dataIndex: 'email' },
    { title: '状态', dataIndex: 'status' },
    { title: 'Profile ID', dataIndex: 'profileId' },
    { title: '创建时间', dataIndex: 'createdAt' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Button onClick={() => exportRT(record)}>导出 auth.json</Button>
      ),
    },
  ];

  return <Table columns={columns} dataSource={accounts} rowKey="id" />;
};

export default Accounts;
