import React from 'react';
import { Result, Button, Card } from 'antd';
import { useNavigate } from 'react-router-dom';

const PaymentCancelPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <Card style={{ maxWidth: 800, margin: '40px auto' }}>
      <Result
        status="info"
        title="Payment Cancelled"
        subTitle="You've cancelled the payment process. No charges were made."
        extra={[
          <Button type="primary" key="account" onClick={() => navigate('/account')}>
            Back to Account
          </Button>,
          <Button key="home" onClick={() => navigate('/')}>
            Go to Home
          </Button>,
        ]}
      />
    </Card>
  );
};

export default PaymentCancelPage;
