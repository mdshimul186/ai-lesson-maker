import React from 'react';
import { Layout } from 'antd';
import RegisterForm from '../components/RegisterForm';

const { Content } = Layout;

const RegisterPage: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px' }}>
        <RegisterForm />
      </Content>
    </Layout>
  );
};

export default RegisterPage;
