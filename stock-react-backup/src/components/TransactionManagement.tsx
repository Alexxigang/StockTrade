import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  message,
  Popconfirm,
  Space,
  Tag,
  Row,
  Col,
  Avatar,
  Typography,
  Empty,
  Divider,
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CalendarOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { User, StockTransaction } from '../types';
import { StorageService } from '../services/storage';

const { Option } = Select;
const { Text, Title } = Typography;

const TransactionManagement: React.FC = () => {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<StockTransaction | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedTransactions = StorageService.getTransactions();
    const loadedUsers = StorageService.getUsers();
    setTransactions(loadedTransactions);
    setUsers(loadedUsers);
  };

  const showModal = (transaction?: StockTransaction) => {
    setEditingTransaction(transaction || null);
    setIsModalVisible(true);
    if (transaction) {
      form.setFieldsValue({
        ...transaction,
        transactionDate: dayjs(transaction.transactionDate),
      });
    } else {
      form.resetFields();
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingTransaction(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const transactionData = {
        ...values,
        transactionDate: values.transactionDate.format('YYYY-MM-DD'),
        totalAmount: values.quantity * values.price,
        netAmount: values.quantity * values.price,
      };

      if (editingTransaction) {
        StorageService.updateTransaction(editingTransaction.id, transactionData);
        message.success('交易记录更新成功');
      } else {
        const newTransaction: StockTransaction = {
          id: uuidv4(),
          ...transactionData,
          createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        };
        StorageService.addTransaction(newTransaction);
        message.success('交易记录添加成功');
      }

      loadData();
      handleCancel();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const deleteTransaction = (transactionId: string) => {
    StorageService.deleteTransaction(transactionId);
    message.success('交易记录删除成功');
    loadData();
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : '未知用户';
  };

  // 渲染交易记录卡片
  const renderTransactionCard = (transaction: StockTransaction) => {
    const isBuy = transaction.type === 'buy';
    const typeColor = isBuy ? '#52c41a' : '#ff4d4f';
    const typeIcon = isBuy ? <ArrowUpOutlined /> : <ArrowDownOutlined />;

    return (
      <Card 
        key={transaction.id}
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
                  icon={typeIcon} 
                  style={{ backgroundColor: typeColor }}
                />
                <div>
                  <Text strong style={{ fontSize: 16 }}>
                    {transaction.stockCode} {transaction.stockName}
                  </Text>
                  <br />
                  <Tag color={isBuy ? 'green' : 'red'}>
                    {isBuy ? '买入' : '卖出'}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    {getUserName(transaction.userId)}
                  </Text>
                </div>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <CalendarOutlined /> {dayjs(transaction.transactionDate).format('MM-DD')} | 
                数量: {transaction.quantity} | 价格: ¥{transaction.price}
              </Text>
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: 16, color: typeColor }}>
                ¥{transaction.totalAmount?.toFixed(2) || (transaction.quantity * transaction.price).toFixed(2)}
              </Text>
              <Space size="small">
                <Button 
                  type="link" 
                  size="small" 
                  icon={<EditOutlined />} 
                  onClick={() => showModal(transaction)}
                  style={{ padding: 0 }}
                >
                  编辑
                </Button>
                <Popconfirm
                  title="确定删除此交易记录吗？"
                  onConfirm={() => deleteTransaction(transaction.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button 
                    type="link" 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />}
                    style={{ padding: 0 }}
                  >
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  // 计算统计数据
  const totalBuyAmount = transactions
    .filter(t => t.type === 'buy')
    .reduce((sum, t) => sum + (t.totalAmount || t.quantity * t.price), 0);
  
  const totalSellAmount = transactions
    .filter(t => t.type === 'sell')
    .reduce((sum, t) => sum + (t.totalAmount || t.quantity * t.price), 0);

  return (
    <div style={{ background: '#f7f8fa', minHeight: '100vh' }}>
      {/* 交易统计卡片 */}
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
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <ArrowUpOutlined style={{ fontSize: 20, marginBottom: 8, color: '#52c41a' }} />
              <div style={{ fontSize: 12, opacity: 0.8 }}>买入总额</div>
              <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                ¥{totalBuyAmount.toFixed(0)}
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <ArrowDownOutlined style={{ fontSize: 20, marginBottom: 8, color: '#ff4d4f' }} />
              <div style={{ fontSize: 12, opacity: 0.8 }}>卖出总额</div>
              <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                ¥{totalSellAmount.toFixed(0)}
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <DollarOutlined style={{ fontSize: 20, marginBottom: 8 }} />
              <div style={{ fontSize: 12, opacity: 0.8 }}>交易次数</div>
              <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                {transactions.length}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 添加按钮 */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }} bodyStyle={{ padding: '16px' }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => showModal()}
          style={{ width: '100%', borderRadius: 8, height: 40 }}
        >
          添加交易记录
        </Button>
      </Card>

      {/* 交易记录列表 */}
      {transactions.length === 0 ? (
        <Empty 
          description="暂无交易记录" 
          style={{ padding: '50px 20px' }}
        />
      ) : (
        <div>
          <Title level={5} style={{ margin: '16px 0 12px 0', color: '#666' }}>
            交易记录 ({transactions.length})
          </Title>
          {transactions
            .sort((a, b) => dayjs(b.transactionDate).valueOf() - dayjs(a.transactionDate).valueOf())
            .map(renderTransactionCard)
          }
        </div>
      )}

      {/* 添加/编辑交易弹窗 */}
      <Modal
        title={editingTransaction ? '编辑交易' : '新增交易'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        okText="确定"
        cancelText="取消"
        width="90%"
        style={{ maxWidth: 400, borderRadius: 12 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="用户"
            name="userId"
            rules={[{ required: true, message: '请选择用户' }]}
          >
            <Select placeholder="请选择用户">
              {users.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="股票代码"
                name="stockCode"
                rules={[{ required: true, message: '请输入股票代码' }]}
              >
                <Input placeholder="如: 000001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="股票名称"
                name="stockName"
                rules={[{ required: true, message: '请输入股票名称' }]}
              >
                <Input placeholder="如: 平安银行" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="交易类型"
                name="type"
                rules={[{ required: true, message: '请选择交易类型' }]}
              >
                <Select placeholder="请选择">
                  <Option value="buy">买入</Option>
                  <Option value="sell">卖出</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="数量"
                name="quantity"
                rules={[{ required: true, message: '请输入数量' }]}
              >
                <InputNumber
                  placeholder="股数"
                  style={{ width: '100%' }}
                  min={1}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="价格"
                name="price"
                rules={[{ required: true, message: '请输入价格' }]}
              >
                <InputNumber
                  placeholder="单价"
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="交易日期"
                name="transactionDate"
                rules={[{ required: true, message: '请选择日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="备注" name="notes">
            <Input.TextArea rows={2} placeholder="可选备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TransactionManagement;