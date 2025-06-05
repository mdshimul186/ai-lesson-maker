import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { useAuthStore } from '../../stores';
import { Link, useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined, MailOutlined, UserAddOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const RegisterForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { isLoading, error, register } = useAuthStore();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const onFinish = async (values: any) => {
    // Check if passwords match
    if (values.password !== values.confirmPassword) {
      message.error('Passwords do not match');
      return;
    }

    try {
      await register({
        email: values.email,
        password: values.password,
        first_name: values.firstName,
        last_name: values.lastName
      });
        // Check if there was an error
      if (!useAuthStore.getState().error) {
        setRegistrationSuccess(true);
        message.success('Registration successful! Please verify your email with the code we sent you.');
        form.resetFields();
        
        // Store the email for verification
        localStorage.setItem('unverifiedEmail', values.email);
        
        // Redirect to verification page immediately
        navigate('/verify-email');
      }
    } catch (err) {
      console.error('Registration failed:', err);
      message.error('Registration failed. Please try again.');
    }
  };

  return (
    <Card style={{ maxWidth: 500, margin: '0 auto', marginTop: 50, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={2}>
          <UserAddOutlined /> Register
        </Title>
        <Text type="secondary">Create a new account to get started</Text>
      </div>

      {registrationSuccess ? (
        <div style={{ textAlign: 'center' }}>
          <Title level={4} style={{ color: 'green' }}>Registration Successful!</Title>
          <Text>Please check your email to verify your account.</Text>
          <div style={{ marginTop: 20 }}>
            <Link to="/login">
              <Button type="primary">Go to Login</Button>
            </Link>
          </div>
        </div>
      ) : (
        <Form
          form={form}
          name="register_form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
        >
          <Space direction="horizontal" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Form.Item
              name="firstName"
              rules={[{ required: true, message: 'Please input your first name!' }]}
              style={{ width: '100%' }}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="First Name" 
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="lastName"
              rules={[{ required: true, message: 'Please input your last name!' }]}
              style={{ width: '100%' }}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="Last Name" 
                size="large"
              />
            </Form.Item>
          </Space>

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
            rules={[
              { required: true, message: 'Please input your password!' },
              { min: 8, message: 'Password must be at least 8 characters!' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Password" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match!'));
                },
              }),
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Confirm Password" 
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
              Register
            </Button>
          </Form.Item>

          {error && (
            <div style={{ color: 'red', textAlign: 'center', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </Form>
      )}
    </Card>
  );
};

export default RegisterForm;
