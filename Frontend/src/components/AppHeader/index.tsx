import React from 'react';
import { Layout, Menu, Button, Dropdown, Space, Avatar, Divider } from 'antd';
import type { MenuProps } from 'antd';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useAccountStore } from '../../stores';
import { 
  UserOutlined, 
  LogoutOutlined, 
  DownOutlined, 
  HomeOutlined, 
  HistoryOutlined,
  SettingOutlined,
  WalletOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import AccountSelector from '../AccountSelector';

const { Header } = Layout;

const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { currentAccount } = useAccountStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      label: <span>Profile</span>,
      icon: <UserOutlined />,
      onClick: () => navigate('/profile'),
    },
    {
      key: 'account',
      label: <span>Account Settings</span>,
      icon: <SettingOutlined />,
      onClick: () => navigate('/account'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: <span>Logout</span>,
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <Header 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: 'linear-gradient(90deg, #1890ff 0%, #36cfc9 100%)', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div className="logo" style={{ fontSize: '20px', fontWeight: 'bold' }}>
        <Link to="/" style={{ color: '#fff', display: 'flex', alignItems: 'center' }}>
          <IdcardOutlined style={{ fontSize: '24px', marginRight: '10px' }} />
          AI Lesson Maker
        </Link>
      </div>
      
      <Menu 
        mode="horizontal" 
        style={{ 
          flex: 1, 
          justifyContent: 'center', 
          background: 'transparent',
          border: 'none',
          color: '#fff'
        }}
        selectedKeys={[location.pathname]}
        theme="dark"
      >
        <Menu.Item key="/" icon={<HomeOutlined />}>
          <Link to="/">Generate Video</Link>
        </Menu.Item>
        {isAuthenticated && (
          <>
            <Menu.Item key="/tasks" icon={<HistoryOutlined />}>
              <Link to="/tasks">Tasks</Link>
            </Menu.Item>
            <Menu.Item key="/account" icon={<WalletOutlined />}>
              <Link to="/account">Account</Link>
            </Menu.Item>
          </>
        )}
      </Menu>
      
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {isAuthenticated && (
          <>
            <AccountSelector />
            <Divider type="vertical" style={{ margin: '0 16px', backgroundColor: 'rgba(255,255,255,0.3)', height: '20px' }} />
            {/* <Badge count={0} dot style={{ marginRight: '16px' }}>
              <BellOutlined style={{ fontSize: '20px', color: '#fff', cursor: 'pointer' }} />
            </Badge> */}
          </>
        )}
          {isAuthenticated ? (
          <Dropdown menu={{ items }} trigger={['click']}>
            <a onClick={(e) => e.preventDefault()} style={{ cursor: 'pointer' }}>
              <Space>
                <Avatar 
                  style={{ 
                    backgroundColor: '#f0f0f0', 
                    color: '#1890ff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }} 
                  icon={<UserOutlined />} 
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ color: '#fff', fontWeight: '500', lineHeight: '1.2' }}>
                    {user?.first_name || 'User'}
                  </span>
                  {currentAccount && (
                    <span style={{ color: '#fff', fontSize: '12px', opacity: 0.8, lineHeight: '1.2' }}>
                      {currentAccount.credits} credits
                    </span>
                  )}
                </div>
                <DownOutlined style={{ color: '#fff', fontSize: '12px' }} />
              </Space>
            </a>
          </Dropdown>
        ) : (
          <Space>
            <Button type="link" style={{ color: '#fff' }}>
              <Link to="/login">Login</Link>
            </Button>
            <Button type="primary" style={{ background: '#fff', color: '#1890ff', border: 'none', fontWeight: '500' }}>
              <Link to="/register">Register</Link>
            </Button>
          </Space>
        )}
      </div>
    </Header>
  );
};

export default AppHeader;

