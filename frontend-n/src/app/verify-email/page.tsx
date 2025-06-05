'use client';

import React from 'react';
import { Layout } from 'antd';
import VerifyEmail from '../../components/VerifyEmail';

const { Content } = Layout;

export default function VerifyEmailPage() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px' }}>
        <VerifyEmail />
      </Content>
    </Layout>
  );
}
