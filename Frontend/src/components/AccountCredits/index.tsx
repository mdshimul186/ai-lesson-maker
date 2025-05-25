import React, { useEffect, useState } from 'react';
import { Card, Button, Row, Col, Typography, Spin, message, Modal, Divider, Badge } from 'antd';
import { CreditCardOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAccountStore } from '../../stores';
// Define CreditPackage type if not imported from services
type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  price: number;
};
import CreditUsageGuide from '../CreditUsageGuide';

const { Title, Text, Paragraph } = Typography;

const AccountCredits: React.FC = () => {  const { 
    currentAccount, 
    creditPackages, 
    fetchCreditPackages, 
    purchaseCredits,
    isLoading, 
    error
  } = useAccountStore();
  
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  
  useEffect(() => {
    fetchCreditPackages();
  }, [fetchCreditPackages]);
  
  // Refresh when account changes
  useEffect(() => {
    if (currentAccount) {
      console.log('Account changed in AccountCredits, refreshing data...');
      fetchCreditPackages();
    }
  }, [currentAccount?.id, fetchCreditPackages]);
  
  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);
  
  const handleSelectPackage = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setConfirmModalVisible(true);
  };
  
  const handleConfirmPurchase = async () => {
    if (!selectedPackage || !currentAccount) return;
    
    try {
      const result = await purchaseCredits(selectedPackage.id, currentAccount.id);
      
      if (result.redirectUrl) {
        // Redirect to PayPal for payment
        window.location.href = result.redirectUrl;
      } else if (result.error) {
        message.error(result.error);
      }
    } catch (err) {
      console.error('Purchase failed:', err);
    } finally {
      setConfirmModalVisible(false);
    }
  };
  
  if (!currentAccount) {
    return <div>Please select an account first</div>;
  }
  
  return (
    <div>
      <Card className="credits-summary-card" style={{ marginBottom: 24, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} md={12}>
            <Title level={4}>Current Balance</Title>
            <Row align="middle">
              <Col>
                <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#1890ff' }}>
                  {currentAccount.credits}
                </Text>
              </Col>
              <Col style={{ marginLeft: 8 }}>
                <Text style={{ fontSize: 20 }}>credits</Text>
              </Col>
            </Row>
            <Text type="secondary">
              Each credit can be used to generate one scene in your video lesson.
            </Text>
          </Col>
          <Col xs={24} md={12}>
            <Card style={{ backgroundColor: '#e6f7ff', borderRadius: 8 }}>
              <Title level={5}>
                <InfoCircleOutlined style={{ marginRight: 8 }} />
                Credit Usage Guide
              </Title>
              <Paragraph>
                <ul style={{ paddingLeft: 20 }}>
                  <li>1 credit = 1 scene in your video</li>
                  <li>Average lesson: 5-10 scenes</li>
                  <li>Credits never expire</li>
                </ul>
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </Card>
      
      <CreditUsageGuide />
        
      <Title level={4}>Purchase Credits</Title>
      <Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Select a package below to add more credits to your account. All packages are one-time purchases (no subscription).
      </Paragraph>
        
      {isLoading && creditPackages.length === 0 ? (
        <Spin size="large" />
      ) : (
        <Row gutter={[16, 16]}>
          {creditPackages.map(pkg => (
            <Col xs={24} sm={12} md={8} key={pkg.id}>
              <Card 
                hoverable 
                className="credit-package-card"
                style={{ 
                  borderRadius: 8, 
                  height: '100%',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.09)'
                }}
                onClick={() => handleSelectPackage(pkg)}
              >
                <Badge.Ribbon text={pkg.name} color="blue">
                  <div style={{ padding: '10px 0' }}>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                      <Title level={2} style={{ margin: 0, color: '#1890ff' }}>{pkg.credits}</Title>
                      <Text>credits</Text>
                    </div>
                    
                    <Divider style={{ margin: '12px 0' }} />
                    
                    <div style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 16 }}><strong>Price:</strong> ${pkg.price}</Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary">
                          ${(pkg.price / pkg.credits).toFixed(2)} per credit
                        </Text>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: 16 }}>
                      <Text>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                        Generate up to {pkg.credits} scenes
                      </Text>
                    </div>
                    
                    <div style={{ marginBottom: 16 }}>
                      <Text>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                        Create approximately {Math.floor(pkg.credits / 7)} lessons
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary">(based on avg. 7 scenes per lesson)</Text>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                      <Button 
                        type="primary" 
                        icon={<CreditCardOutlined />}
                        size="large"
                        style={{ width: '100%' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPackage(pkg);
                        }}
                      >
                        Purchase
                      </Button>
                    </div>
                  </div>
                </Badge.Ribbon>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title="Confirm Purchase"
        visible={confirmModalVisible}
        onOk={handleConfirmPurchase}
        onCancel={() => setConfirmModalVisible(false)}
        confirmLoading={isLoading}
        okText="Proceed to Payment"
        cancelText="Cancel"
        style={{ top: 20 }}
        width={500}
      >
        {selectedPackage && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Title level={4}>{selectedPackage.name}</Title>
              <Title level={3} style={{ color: '#1890ff', margin: '8px 0' }}>
                {selectedPackage.credits} credits
              </Title>
              <Title level={4}>${selectedPackage.price}</Title>
            </div>
            
            <Divider />
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>Package Details:</Text>
              <ul style={{ marginTop: 8 }}>
                <li>{selectedPackage.credits} credits added to your account</li>
                <li>Generate up to {selectedPackage.credits} scenes in your videos</li>
                <li>Create approximately {Math.floor(selectedPackage.credits / 7)} complete lessons (based on average 7 scenes per lesson)</li>
                <li>Credits never expire</li>
                <li>One-time purchase (not a subscription)</li>
              </ul>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>Credit Usage:</Text>
              <ul style={{ marginTop: 8 }}>
                <li>Each credit allows you to create one scene in your lesson</li>
                <li>Credits are only consumed when a video is successfully generated</li>
                <li>You can edit your project multiple times before generating</li>
              </ul>
            </div>
            
            <Divider />
            
            <Card style={{ backgroundColor: '#f9f9f9', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Text strong>Total amount:</Text>
                  <div>
                    <Text type="secondary">Includes all taxes and fees</Text>
                  </div>
                </div>
                <div>
                  <Text style={{ fontSize: 18, fontWeight: 'bold' }}>${selectedPackage.price}</Text>
                </div>
              </div>
            </Card>
            
            <Paragraph type="secondary">
              After confirming, you'll be redirected to PayPal to complete the payment securely.
              Upon successful payment, credits will be immediately available in your account.
            </Paragraph>
          </>
        )}
      </Modal>
    </div>
  );
};

export default AccountCredits;
