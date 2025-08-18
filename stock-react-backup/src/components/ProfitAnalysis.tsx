import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Statistic,
  Row,
  Col,
  Select,
  Tag,
  InputNumber,
  Button,
  message,
} from 'antd';
import { UserProfit, StockTransaction, User } from '../types';
import { StorageService } from '../services/storage';
import { CalculationService } from '../services/calculation';

const { Option } = Select;

const ProfitAnalysis: React.FC = () => {
  const [userProfits, setUserProfits] = useState<UserProfit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [managementFeeRate, setManagementFeeRate] = useState<number>(0.1);
  const [overallStats, setOverallStats] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [managementFeeRate]);

  const loadData = () => {
    const loadedUsers = StorageService.getUsers();
    const loadedTransactions = StorageService.getTransactions();
    
    setUsers(loadedUsers);
    setTransactions(loadedTransactions);

    // 计算用户盈利
    const profits = CalculationService.calculateUserProfits(loadedTransactions, managementFeeRate);
    
    // 添加用户名
    const profitsWithNames = profits.map(profit => {
      const user = loadedUsers.find(u => u.id === profit.userId);
      return {
        ...profit,
        userName: user ? user.name : '未知用户',
      };
    });

    setUserProfits(profitsWithNames);

    // 计算总体统计
    const stats = CalculationService.calculateOverallStats(loadedTransactions);
    setOverallStats(stats);
  };

  const handleFeeRateChange = (value: number | null) => {
    if (value !== null && value >= 0 && value <= 1) {
      setManagementFeeRate(value);
    }
  };

  const exportData = () => {
    const csvContent = [
      ['用户名', '总投入', '总回报', '总盈利', '盈利率(%)', '管理费', '净盈利'],
      ...userProfits.map(profit => [
        profit.userName,
        profit.totalInvestment.toFixed(2),
        profit.totalReturn.toFixed(2),
        profit.totalProfit.toFixed(2),
        profit.profitRate.toFixed(2),
        profit.managementFee.toFixed(2),
        profit.netProfit.toFixed(2),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `盈利分析报告_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    message.success('报告导出成功');
  };

  const columns = [
    {
      title: '用户',
      dataIndex: 'userName',
      key: 'userName',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '总投入',
      dataIndex: 'totalInvestment',
      key: 'totalInvestment',
      render: (value: number) => (
        <Statistic
          value={value}
          precision={2}
          prefix="¥"
          valueStyle={{ fontSize: '14px' }}
        />
      ),
    },
    {
      title: '总回报',
      dataIndex: 'totalReturn',
      key: 'totalReturn',
      render: (value: number) => (
        <Statistic
          value={value}
          precision={2}
          prefix="¥"
          valueStyle={{ fontSize: '14px' }}
        />
      ),
    },
    {
      title: '总盈利',
      dataIndex: 'totalProfit',
      key: 'totalProfit',
      render: (value: number) => (
        <Statistic
          value={value}
          precision={2}
          prefix="¥"
          valueStyle={{ 
            color: value >= 0 ? '#3f8600' : '#cf1322',
            fontSize: '14px'
          }}
        />
      ),
    },
    {
      title: '盈利率',
      dataIndex: 'profitRate',
      key: 'profitRate',
      render: (value: number) => (
        <Tag color={value >= 0 ? 'green' : 'red'}>
          {value.toFixed(2)}%
        </Tag>
      ),
    },
    {
      title: '管理费',
      dataIndex: 'managementFee',
      key: 'managementFee',
      render: (value: number) => (
        <Statistic
          value={value}
          precision={2}
          prefix="¥"
          valueStyle={{ fontSize: '14px' }}
        />
      ),
    },
    {
      title: '净盈利',
      dataIndex: 'netProfit',
      key: 'netProfit',
      render: (value: number) => (
        <Statistic
          value={value}
          precision={2}
          prefix="¥"
          valueStyle={{ 
            color: value >= 0 ? '#3f8600' : '#cf1322',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        />
      ),
    },
  ];

  const totalManagementFee = userProfits.reduce((sum, profit) => sum + profit.managementFee, 0);
  const totalNetProfit = userProfits.reduce((sum, profit) => sum + profit.netProfit, 0);

  return (
    <div>
      {/* 总体统计 */}
      <Card title="总体统计" className="summary-card">
        <Row gutter={16}>
          <Col span={4}>
            <Statistic
              title="总投入"
              value={overallStats.totalInvestment}
              precision={2}
              prefix="¥"
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="总回报"
              value={overallStats.totalReturn}
              precision={2}
              prefix="¥"
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="总盈利"
              value={overallStats.totalProfit}
              precision={2}
              prefix="¥"
              valueStyle={{ color: overallStats.totalProfit >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="盈利率"
              value={overallStats.profitRate}
              precision={2}
              suffix="%"
              valueStyle={{ color: overallStats.profitRate >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="总管理费"
              value={totalManagementFee}
              precision={2}
              prefix="¥"
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="交易笔数"
              value={overallStats.transactionCount}
            />
          </Col>
        </Row>
      </Card>

      {/* 盈利分析 */}
      <Card 
        title="用户盈利分析" 
        className="page-header"
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>管理费率:</span>
            <InputNumber
              value={managementFeeRate}
              min={0}
              max={1}
              step={0.01}
              precision={2}
              formatter={value => `${(Number(value) * 100).toFixed(0)}%`}
              parser={value => Number(value!.replace('%', '')) / 100}
              onChange={handleFeeRateChange}
              style={{ width: 80 }}
            />
            <Button type="primary" onClick={exportData}>
              导出报告
            </Button>
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={userProfits}
          rowKey="userId"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个用户`,
          }}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <strong>合计</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Statistic
                    value={userProfits.reduce((sum, profit) => sum + profit.totalInvestment, 0)}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                  />
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <Statistic
                    value={userProfits.reduce((sum, profit) => sum + profit.totalReturn, 0)}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                  />
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <Statistic
                    value={userProfits.reduce((sum, profit) => sum + profit.totalProfit, 0)}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ 
                      color: totalNetProfit >= 0 ? '#3f8600' : '#cf1322',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  />
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <Tag color={totalNetProfit >= 0 ? 'green' : 'red'} style={{ fontWeight: 'bold' }}>
                    {overallStats.profitRate?.toFixed(2)}%
                  </Tag>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}>
                  <Statistic
                    value={totalManagementFee}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                  />
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6}>
                  <Statistic
                    value={totalNetProfit}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ 
                      color: totalNetProfit >= 0 ? '#3f8600' : '#cf1322',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  />
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
    </div>
  );
};

export default ProfitAnalysis;
