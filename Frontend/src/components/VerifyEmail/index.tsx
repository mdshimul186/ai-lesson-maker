import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Result, Spin, Form, Input, message } from 'antd';
import { useAuthStore } from '../../stores';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircleOutlined, SafetyOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const VerifyEmail: React.FC = () => {
  const { verifyEmail } = useAuthStore();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const email = localStorage.getItem('unverifiedEmail');

  useEffect(() => {
    // If no email in storage, check if we need to show a message
    if (!email) {
      message.info('Please enter the verification code sent to your email');
    }
  }, [email]);

  const handleVerify = async (values: { verificationCode: string }) => {
    setVerifying(true);
    setError(null);
    
    try {
      // Use the verification code entered by the user
      await verifyEmail(values.verificationCode);
      setVerified(true);
      
      // Show success message
      message.success('Email verified successfully!');
      
      // Clear unverified email from storage
      localStorage.removeItem('unverifiedEmail');
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError('Verification failed. The code may be invalid or expired.');
    } finally {
      setVerifying(false);
    }
  };
  if (verifying) {
    return (
      <Card style={{ maxWidth: 500, margin: '0 auto', marginTop: 50, textAlign: 'center' }}>
        <Spin size="large" />
        <Title level={3} style={{ marginTop: 20 }}>Verifying your email...</Title>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 500, margin: '0 auto', marginTop: 50 }}>
      {verified ? (
        <Result
          status="success"
          icon={<CheckCircleOutlined />}
          title="Email Verified Successfully!"
          subTitle="Your email has been verified. You can now login to your account."
          extra={[
            <Link to="/login" key="login">
              <Button type="primary">
                Go to Login
              </Button>
            </Link>
          ]}
        />
      ) : (
        <div style={{ padding: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <SafetyOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />            <Title level={3}>Verify Your Email</Title>
            <Text>
              Enter the 6-digit verification code sent to {email ? <strong>{email}</strong> : 'your email address'}.
            </Text>
          </div>
          
          {error && (
            <div style={{ color: 'red', textAlign: 'center', marginBottom: 16 }}>
              {error}
            </div>
          )}
          
          <Form
            form={form}
            onFinish={handleVerify}
            layout="vertical"
          >
            <Form.Item
              name="verificationCode"
              rules={[
                { required: true, message: 'Please enter your verification code!' },
                { len: 6, message: 'Verification code must be 6 digits!' },
                { pattern: /^[0-9]+$/, message: 'Verification code must contain only numbers!' }
              ]}
            >              <Input 
                placeholder="Enter 6-digit code" 
                size="large"
                maxLength={6}
                style={{ 
                  textAlign: 'center', 
                  letterSpacing: '8px', 
                  fontWeight: 'bold',
                  fontSize: '24px',
                  height: '60px'
                }}
              />
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                style={{ width: '100%' }} 
                size="large"
                loading={verifying}
              >
                Verify Email
              </Button>
            </Form.Item>          </Form>
          
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary">Didn't receive the code? </Text>
            <Button 
              type="link" 
              onClick={() => {
                if (email) {
                  useAuthStore.getState().resendVerification(email);
                  message.success('Verification code resent to your email');
                } else {
                  message.error('No email address found. Please try to register again.');
                }
              }}
            >
              Resend Code
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default VerifyEmail;