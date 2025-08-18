import React, { useState, useEffect } from 'react';
import {
  Card,
  Statistic,
  Row,
  Col,
  List,
  Avatar,
  Typography,
  Space,
  Empty,
  Spin,
} from 'antd';
import { 
  RiseOutlined, 
  FallOutlined, 
  StockOutlined,
  DollarCircleOutlined 
} from '@ant-design/icons';
import { StockPosition, StockTransaction, User } from '../types';
import { StorageService } from '../services/storage';
import { CalculationService } from '../services/calculation';

const { Text, Title } = Typography;

const PositionManagement: React.FC = () => {
  const [positions, setPositions] = useState<StockPosition[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const loadedUsers = StorageService.getUsers();
      const loadedTransactions = StorageService.getTransactions();
      
      setUsers(loadedUsers);

      // 计算用户持仓
      const calculatedPositions = CalculationService.calculateUserPositions(loadedTransactions);
      
      // 添加用户名
      const positionsWithNames = calculatedPositions.map(position => {
        const user = loadedUsers.find(u => u.id === position.userId);
        return {
          ...position,
          userName: user ? user.name : '未知用户',
        };
      });

      setPositions(positionsWithNames);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : '未知用户';
  };

  // 计算汇总数据
  const totalCost = positions.reduce((sum, pos) => sum + pos.totalCost, 0);
  const totalMarketValue = positions.reduce((sum, pos) => {
    return sum + (pos.currentPrice ? pos.totalQuantity * pos.currentPrice : pos.totalCost);
  }, 0);
  const totalUnrealizedPL = totalMarketValue - totalCost;

  // 渲染单个持仓卡片
  const renderPositionCard = (position: StockPosition) => {
    const unrealizedPL = position.currentPrice 
      ? (position.currentPrice * position.totalQuantity) - position.totalCost 
      : 0;
    const unrealizedPLPercent = position.totalCost > 0 ? (unrealizedPL / position.totalCost) * 100 : 0;
    const isProfit = unrealizedPL >= 0;

    return (
      <Card 
        key={`${position.userId}_${position.stockCode}`}
        size="small"
        style={{ marginBottom: 12, borderRadius: 12 }}
        bodyStyle={{ padding: '16px' }}
      >
        <Row align="middle" justify="space-between">
          <Col span={16}>
            <Space direction="vertical" size={4}>
              <Space align="center">
                <Avatar 
                  size="small" 
                  icon={<StockOutlined />} 
                  style={{ backgroundColor: '#1677ff' }}
                />
                <div>
                  <Text strong style={{ fontSize: 16 }}>{position.stockCode}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {position.stockName || '未知股票'}
                  </Text>
                </div>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                持仓: {position.totalQuantity} 股 | 成本: ¥{position.averagePrice.toFixed(2)}
              </Text>
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: 16 }}>
                ¥{position.totalCost.toFixed(0)}
              </Text>
              {position.currentPrice && (
                <Space align="center">
                  {isProfit ? <RiseOutlined style={{ color: '#52c41a' }} /> : <FallOutlined style={{ color: '#ff4d4f' }} />}
                  <Text 
                    style={{ 
                      color: isProfit ? '#52c41a' : '#ff4d4f',
                      fontSize: 12,
                      fontWeight: 'bold'
                    }}
                  >
                    {isProfit ? '+' : ''}{unrealizedPLPercent.toFixed(1)}%
                  </Text>
                </Space>
              )}
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div style={{ background: '#f7f8fa', minHeight: '100vh' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* 资产概览卡片 */}
          <Card 
            style={{ 
              margin: '0 0 16px 0', 
              borderRadius: 12,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ textAlign: 'center' }}>
                  <DollarCircleOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                  <div style={{ fontSize: 12, opacity: 0.8 }}>总资产</div>
                  <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                    ¥{totalMarketValue.toFixed(0)}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'center' }}>
                  {totalUnrealizedPL >= 0 ? 
                    <RiseOutlined style={{ fontSize: 24, marginBottom: 8, color: '#52c41a' }} /> :
                    <FallOutlined style={{ fontSize: 24, marginBottom: 8, color: '#ff4d4f' }} />
                  }
                  <div style={{ fontSize: 12, opacity: 0.8 }}>今日盈亏</div>
                  <div style={{ 
                    fontSize: 20, 
                    fontWeight: 'bold',
                    color: totalUnrealizedPL >= 0 ? '#52c41a' : '#ff4d4f'
                  }}>
                    {totalUnrealizedPL >= 0 ? '+' : ''}¥{totalUnrealizedPL.toFixed(0)}
                  </div>
                </div>
              </Col>
            </Row>
            <Row style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>持仓数</div>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>{positions.length}</div>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>总成本</div>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>¥{totalCost.toFixed(0)}</div>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>盈亏比</div>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 'bold',
                  color: totalUnrealizedPL >= 0 ? '#52c41a' : '#ff4d4f'
                }}>
                  {totalCost > 0 ? ((totalUnrealizedPL / totalCost) * 100).toFixed(1) : '0.0'}%
                </div>
              </Col>
            </Row>
          </Card>

          {/* 持仓列表 */}
          {positions.length === 0 ? (
            <Empty 
              description="暂无持仓数据" 
              style={{ padding: '50px 20px' }}
            />
          ) : (
            <div>
              <Title level={5} style={{ margin: '16px 0 12px 0', color: '#666' }}>
                持仓明细 ({positions.length})
              </Title>
              {positions.map(renderPositionCard)}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PositionManagement;
