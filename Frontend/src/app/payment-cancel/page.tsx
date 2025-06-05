'use client';

import React from 'react';
import { Result, Button } from 'antd';
import { useRouter } from 'next/navigation';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <Result
      status="warning"
      title="Payment Cancelled"
      subTitle="Your payment was cancelled. No charges were made to your account."
      extra={[
        <Button type="primary" key="account" onClick={() => router.push('/account')}>
          Go to Account
        </Button>,
        <Button key="dashboard" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      ]}
    />
  );
}
