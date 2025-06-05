'use client';

import React from 'react';
import { Layout } from 'antd';
import LoginForm from '../../components/LoginForm';

const { Content } = Layout;

export default function LoginPage() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px' }}>
        <LoginForm />
      </Content>
    </Layout>
  );
}
