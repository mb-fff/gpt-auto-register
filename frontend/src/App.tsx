import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Tasks from './pages/Tasks';

const { Header, Content, Footer } = Layout;

const App: React.FC = () => {
  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#001529' }}>
          <div style={{ color: 'white', fontSize: '20px', float: 'left' }}>
            GPT Auto Register
          </div>
          <Menu theme="dark" mode="horizontal" style={{ float: 'right' }}>
            <Menu.Item key="1"><Link to="/">Dashboard</Link></Menu.Item>
            <Menu.Item key="2"><Link to="/accounts">账号列表</Link></Menu.Item>
            <Menu.Item key="3"><Link to="/tasks">创建任务</Link></Menu.Item>
          </Menu>
        </Header>
        <Content style={{ padding: '20px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/tasks" element={<Tasks />} />
          </Routes>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          ⚠️ 仅供本地学习研究使用 | Dolphin Anty + NestJS 项目
        </Footer>
      </Layout>
    </Router>
  );
};

export default App;
