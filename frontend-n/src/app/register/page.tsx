'use client';

import React from 'react';
import { Layout } from 'antd';
import RegisterForm from '../../components/RegisterForm';

const { Content } = Layout;

export default function RegisterPage() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px' }}>
        <RegisterForm />
      </Content>
    </Layout>
  );
}
