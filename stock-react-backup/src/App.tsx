import React, { useState, useEffect } from 'react';
import {
  ConfigProvider,
  message,
  Tabs,
} from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  BarChartOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import UserManagement from './components/UserManagement';
import TransactionManagement from './components/TransactionManagement';
import ProfitAnalysis from './components/ProfitAnalysis';
import PositionManagement from './components/PositionManagement';
import { loadSampleData } from './utils/sampleData';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('positions');

  useEffect(() => {
    // 首次启动时检查是否需要加载示例数据
    const loaded = loadSampleData();
    if (loaded) {
      message.success('欢迎使用股票记录小程序！');
    }
  }, []);

  const tabItems = [
    {
      key: 'positions',
      label: '我的持仓',
      icon: <PieChartOutlined />,
      children: <PositionManagement />,
    },
    {
      key: 'transactions',
      label: '交易记录',
      icon: <DollarOutlined />,
      children: <TransactionManagement />,
    },
    {
      key: 'profits',
      label: '收益分析',
      icon: <BarChartOutlined />,
      children: <ProfitAnalysis />,
    },
    {
      key: 'users',
      label: '个人中心',
      icon: <UserOutlined />,
      children: <UserManagement />,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
        components: {
          Tabs: {
            cardBg: '#ffffff',
          },
        },
      }}
    >
      <div className="miniapp-container">
        {/* 顶部标题栏 */}
        <div className="miniapp-header">
          <h1 className="miniapp-title">股票记录</h1>
        </div>

        {/* 主要内容区域 */}
        <div className="miniapp-content">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            centered
            type="card"
            tabPosition="bottom"
            className="miniapp-tabs"
          />
        </div>
      </div>
    </ConfigProvider>
  );
};

export default App;
