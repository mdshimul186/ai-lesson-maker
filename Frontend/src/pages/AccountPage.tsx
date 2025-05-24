import React, { useEffect } from 'react';
import { Typography, Row, Col, Card, Tabs, message, Statistic, Avatar, Spin } from 'antd';
import { 
  WalletOutlined, 
  TeamOutlined, 
  SettingOutlined, 
  UserOutlined, 
  HistoryOutlined, 
  QuestionCircleOutlined 
} from '@ant-design/icons';
import { useAccountStore } from '../stores';
import AccountCredits from '../components/AccountCredits';
import TeamManagement from '../components/TeamManagement';
import AccountSettings from '../components/AccountSettings';
import AccountFAQ from '../components/FAQ';
import TransactionHistory from '../components/TransactionHistory';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const AccountPage: React.FC = () => {
  const { fetchAccounts, currentAccount, error } = useAccountStore();
  
  useEffect(() => {
    // Only fetch accounts if we don't already have any loaded
    if (!currentAccount && !error) {
      fetchAccounts();
    }
  }, [fetchAccounts, currentAccount, error]);
  
  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);
  
  if (!currentAccount) {
    return (
      <Card>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <Spin size="large" />
          <Text style={{ marginLeft: 16 }}>Loading account details...</Text>
        </div>
      </Card>
    );
  }
  
  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 24]}>
        <Col span={24}>
          <Card 
            style={{ 
              borderRadius: 8, 
              backgroundImage: 'linear-gradient(to right, #1890ff, #36cfc9)',
              color: 'white'
            }}
          >
            <Row gutter={16} align="middle">
              <Col>
                <Avatar 
                  size={64} 
                  icon={<UserOutlined />} 
                  style={{ backgroundColor: 'white', color: '#1890ff' }}
                />
              </Col>
              <Col flex="auto">
                <Title level={3} style={{ margin: 0, color: 'white' }}>
                  {currentAccount.name}
                </Title>
                <Text style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                  {currentAccount.type.charAt(0).toUpperCase() + currentAccount.type.slice(1)} Account
                </Text>
              </Col>
              <Col>
                <Statistic 
                  title={<Text style={{ color: 'white' }}>Available Credits</Text>}
                  value={currentAccount.credits}
                  valueStyle={{ color: 'white', fontWeight: 'bold' }}
                  suffix="credits"
                />
              </Col>
            </Row>
          </Card>
        </Col>
        
        <Col span={24}>
          <Tabs defaultActiveKey="credits" type="card" size="large">
            <TabPane 
              tab={<span><WalletOutlined />Credits & Packages</span>} 
              key="credits"
            >
              <AccountCredits />
            </TabPane>
              <TabPane 
              tab={<span><HistoryOutlined />Transaction History</span>} 
              key="history"
            >
              <TransactionHistory />
            </TabPane>
            
            <TabPane 
              tab={<span><SettingOutlined />Account Settings</span>} 
              key="settings"
            >
              <AccountSettings />
            </TabPane>

            <TabPane 
              tab={<span><QuestionCircleOutlined />FAQ</span>} 
              key="faq"
            >
              <AccountFAQ />
            </TabPane>
            
            {currentAccount.type === 'team' && (
              <TabPane 
                tab={<span><TeamOutlined />Team Management</span>} 
                key="team"
              >
                <TeamManagement />
              </TabPane>
            )}
          </Tabs>
        </Col>
      </Row>
    </div>
  );
};

export default AccountPage;
