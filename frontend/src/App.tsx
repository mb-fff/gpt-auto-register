import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Tasks from './pages/Tasks';
import RealTimeMonitor from './pages/RealTimeMonitor';

const { Header, Content, Footer } = Layout;

const App: React.FC = () => {
  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#001529', padding: '0 20px' }}>
          <div style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', float: 'left' }}>
            GPT Auto Register
          </div>
          <Menu theme="dark" mode="horizontal" style={{ float: 'right' }}>
            <Menu.Item key="1"><Link to="/">Dashboard</Link></Menu.Item>
            <Menu.Item key="2"><Link to="/accounts">账号列表</Link></Menu.Item>
            <Menu.Item key="3"><Link to="/tasks">创建任务</Link></Menu.Item>
            <Menu.Item key="4"><Link to="/monitor">实时监控</Link></Menu.Item>
          </Menu>
        </Header>

        <Content style={{ padding: '20px 40px', background: '#f0f2f5' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/monitor" element={<RealTimeMonitor />} />
          </Routes>
        </Content>

        <Footer style={{ textAlign: 'center' }}>
          ⚠️ <strong>警告</strong>: 本项目仅供本地个人学习和技术研究使用 | 
          自动化注册 OpenAI 账号存在被封禁风险
        </Footer>
      </Layout>
    </Router>
  );
};

export default App;
