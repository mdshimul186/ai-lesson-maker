import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Modal } from 'antd';
import { useAuthStore } from '../../stores';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const LoginForm: React.FC = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { isLoading, error, needsVerification, login, resendVerification, resetNeedsVerification, unverifiedEmail } = useAuthStore();
  const [emailForResend, setEmailForResend] = useState(unverifiedEmail || '');
  const [resendModalVisible, setResendModalVisible] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const onFinish = async (values: any) => {
    try {
      await login({
        email: values.email,
        password: values.password
      });      // If no error and authentication successful
      if (useAuthStore.getState().isAuthenticated) {
        message.success('Login successful!');
        router.push('/dashboard');
      } else if (useAuthStore.getState().needsVerification) {
        setEmailForResend(values.email);
        // Store the email for the verification page
        localStorage.setItem('unverifiedEmail', values.email);
        // Redirect to verification page immediately
        message.info('Please verify your email before logging in');
        router.push('/verify-email');
      }
    } catch (err: any) {
      message.error('Login failed. Please check your credentials.');
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      await resendVerification(emailForResend);
      message.success('Verification email sent successfully');
      setResendModalVisible(false);
      resetNeedsVerification();
    } catch (err) {
      message.error('Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <>
      <Card style={{ maxWidth: 500, margin: '0 auto', marginTop: 50, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>
            <UserOutlined /> Login
          </Title>
          <Text type="secondary">Sign in to your account</Text>
        </div>

        <Form
          form={form}
          name="login_form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="Email" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Password" 
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              style={{ width: '100%' }} 
              size="large"
              loading={isLoading}
            >
              Login
            </Button>
          </Form.Item>

          {error && !needsVerification && (
            <div style={{ color: 'red', textAlign: 'center', marginBottom: 16 }}>
              {error}
            </div>
          )}          <div style={{ textAlign: 'center' }}>
            Don't have an account? <Link href="/register">Register</Link>
          </div>
        </Form>
      </Card>

      <Modal
        title="Email Verification Required"
        open={resendModalVisible}
        onCancel={() => {
          setResendModalVisible(false);
          resetNeedsVerification();
        }}
        footer={[
          <Button 
            key="back" 
            onClick={() => {
              setResendModalVisible(false);
              resetNeedsVerification();
            }}
          >
            Cancel
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={resendLoading} 
            onClick={handleResendVerification}
          >
            Resend Verification Email
          </Button>
        ]}
      >
        <p>Your email address hasn't been verified yet. Please check your inbox for the verification email or click the button below to resend it.</p>
      </Modal>
    </>
  );
};

export default LoginForm;
