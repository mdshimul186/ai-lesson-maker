import React, { useEffect } from 'react';
import { Typography, Card, Row, Col, Avatar, Descriptions, Tag, Divider, Spin, Statistic } from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useAuthStore, useAccountStore } from '../stores';
// Simple date formatting utility
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const { Title, Text } = Typography;

const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const { currentAccount, fetchAccounts } = useAccountStore();
  
  useEffect(() => {
    if (!currentAccount) {
      fetchAccounts();
    }
  }, [fetchAccounts, currentAccount]);
  
  if (!user) {
    return (
      <Card>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <Spin size="large" />
          <Text style={{ marginLeft: 16 }}>Loading profile...</Text>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card 
            style={{ 
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}
          >
            <div 
              style={{ 
                height: '120px', 
                background: 'linear-gradient(90deg, #1890ff 0%, #36cfc9 100%)',
                margin: '-24px -24px 0',
                position: 'relative'
              }} 
            />
            
            <Row align="middle" justify="space-between" style={{ marginTop: -40 }}>
              <Col>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Avatar 
                    size={96} 
                    icon={<UserOutlined />} 
                    style={{ 
                      backgroundColor: '#f0f0f0', 
                      color: '#1890ff',
                      border: '4px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <div style={{ marginLeft: 16 }}>
                    <Title level={3} style={{ margin: '0 0 4px' }}>
                      {`${user.first_name} ${user.last_name}`}
                    </Title>
                    <div>
                      <Tag color={user.is_verified ? "success" : "warning"} icon={user.is_verified ? <CheckCircleOutlined /> : <ClockCircleOutlined />}>
                        {user.is_verified ? "Verified" : "Unverified"}
                      </Tag>
                    </div>
                  </div>
                </div>
              </Col>
              
              {currentAccount && (
                <Col>
                  <Statistic 
                    title="Available Credits"
                    value={currentAccount.credits}
                    valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                    suffix="credits"
                  />
                </Col>
              )}
            </Row>
            
            <Divider />
            
            <Descriptions title="User Information" bordered column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
              <Descriptions.Item label={<><MailOutlined /> Email</>}>
                {user.email}
              </Descriptions.Item>
              <Descriptions.Item label={<><UserOutlined /> User ID</>}>
                {user.id}
              </Descriptions.Item>
              <Descriptions.Item label={<><CalendarOutlined /> Joined</>}>
                {formatDate(user.created_at)}
              </Descriptions.Item>
              {currentAccount && (
                <>
                  <Descriptions.Item label="Account Type">
                    <Tag color="blue">{currentAccount.type.toUpperCase()}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Account Name">
                    {currentAccount.name}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProfilePage;
