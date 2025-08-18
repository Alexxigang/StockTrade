import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Space,
  Avatar,
  Typography,
  Row,
  Col,
  Empty,
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UserOutlined,
  SettingOutlined,
  TeamOutlined 
} from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { User } from '../types';
import { StorageService } from '../services/storage';

const { Title, Text } = Typography;

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const loadedUsers = StorageService.getUsers();
    setUsers(loadedUsers);
  };

  const showModal = (user?: User) => {
    setEditingUser(user || null);
    setIsModalVisible(true);
    if (user) {
      form.setFieldsValue(user);
    } else {
      form.resetFields();
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        // 更新用户
        StorageService.updateUser(editingUser.id, values);
        message.success('用户信息更新成功');
      } else {
        // 新增用户
        const newUser: User = {
          id: uuidv4(),
          ...values,
          createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        };
        StorageService.addUser(newUser);
        message.success('用户添加成功');
      }
      
      loadUsers();
      handleCancel();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const deleteUser = (userId: string) => {
    StorageService.deleteUser(userId);
    message.success('用户删除成功');
    loadUsers();
  };

  // 渲染用户卡片
  const renderUserCard = (user: User) => (
    <Card 
      key={user.id}
      size="small"
      style={{ marginBottom: 12, borderRadius: 12 }}
      bodyStyle={{ padding: '16px' }}
    >
      <Row align="middle" justify="space-between">
        <Col span={16}>
          <Space align="center">
            <Avatar 
              size="large" 
              icon={<UserOutlined />} 
              style={{ backgroundColor: '#1677ff' }}
            />
            <div>
              <Text strong style={{ fontSize: 16 }}>{user.name}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {user.email || '未设置邮箱'}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 10 }}>
                {user.phone || '未设置电话'}
              </Text>
            </div>
          </Space>
        </Col>
        <Col span={8} style={{ textAlign: 'right' }}>
          <Space direction="vertical" size="small">
            <Button 
              type="primary" 
              size="small" 
              icon={<EditOutlined />} 
              onClick={() => showModal(user)}
              style={{ width: '100%' }}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定删除此用户吗？"
              onConfirm={() => deleteUser(user.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button 
                danger 
                size="small" 
                icon={<DeleteOutlined />}
                style={{ width: '100%' }}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  return (
    <div style={{ background: '#f7f8fa', minHeight: '100vh' }}>
      {/* 个人中心头部 */}
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
        <Row align="middle" justify="center">
          <Col span={24} style={{ textAlign: 'center' }}>
            <Avatar 
              size={64} 
              icon={<UserOutlined />} 
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                marginBottom: 12
              }}
            />
            <div>
              <Title level={4} style={{ color: 'white', margin: '0 0 8px 0' }}>
                个人中心
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                管理您的账户信息
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 功能区 */}
      <Card 
        style={{ marginBottom: 16, borderRadius: 12 }}
        bodyStyle={{ padding: '16px' }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => showModal()}
              style={{ width: '100%', borderRadius: 8 }}
            >
              添加用户
            </Button>
          </Col>
          <Col span={12}>
            <Button 
              icon={<SettingOutlined />} 
              style={{ width: '100%', borderRadius: 8 }}
            >
              设置
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 用户列表 */}
      {users.length === 0 ? (
        <Empty 
          description="暂无用户数据" 
          style={{ padding: '50px 20px' }}
        />
      ) : (
        <div>
          <Title level={5} style={{ margin: '16px 0 12px 0', color: '#666' }}>
            <TeamOutlined /> 用户列表 ({users.length})
          </Title>
          {users.map(renderUserCard)}
        </div>
      )}

      {/* 添加/编辑用户弹窗 */}
      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        okText="确定"
        cancelText="取消"
        style={{ borderRadius: 12 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="姓名"
            name="name"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item
            label="电话"
            name="phone"
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
            ]}
          >
            <Input placeholder="请输入电话号码" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { type: 'email', message: '请输入正确的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱地址" style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
