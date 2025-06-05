'use client';

import React, { useEffect, useRef, Suspense } from 'react';
import { Result, Button, Card, Spin } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { paymentService } from '../../services';
import { useAccountStore } from '../../stores';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAccountData } = useAccountStore();
  const [loading, setLoading] = React.useState(true);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState('');
  
  // Single ref to prevent any duplicate processing
  const processedRef = useRef(false);

  useEffect(() => {
    const executePaymentOnce = async () => {
      // Prevent multiple executions with a single check
      if (processedRef.current) {
        return;
      }
      processedRef.current = true;

      const paymentId = searchParams.get('paymentId');
      const payerId = searchParams.get('PayerID');
      const token = searchParams.get('token');

      if (!paymentId || !payerId) {
        setError('Missing payment information');
        setLoading(false);
        return;
      }

      console.log('Processing payment once:', paymentId);

      try {
        // Execute the payment directly - the backend will handle the "already done" case
        const result = await paymentService.executePayment({
          payment_id: paymentId,
          payer_id: payerId,
          token: token || undefined
        });

        if (result.status === 'completed') {
          console.log('Payment completed successfully');
          setSuccess(true);
          await refreshAccountData();
        } else {
          setError(result.error_message || 'Payment failed');
        }
      } catch (err) {
        console.error('Payment execution error:', err);
        setError('Payment processing failed');
      } finally {
        setLoading(false);
      }
    };

    executePaymentOnce();
  }, [searchParams, refreshAccountData]);

  if (loading) {
    return (
      <Card style={{ textAlign: 'center', margin: '50px auto', maxWidth: 500 }}>
        <Spin size="large" />
        <div style={{ marginTop: 20 }}>
          <h3>Processing your payment...</h3>
          <p>Please wait while we confirm your payment.</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Result
        status="error"
        title="Payment Error"
        subTitle={error}
        extra={[
          <Button type="primary" key="retry" onClick={() => router.push('/account')}>
            Go to Account
          </Button>,
          <Button key="dashboard" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        ]}
      />
    );
  }

  if (success) {
    return (
      <Result
        status="success"
        title="Payment Successful!"
        subTitle="Your payment has been processed successfully. Credits have been added to your account."
        extra={[
          <Button type="primary" key="account" onClick={() => router.push('/account')}>
            View Account
          </Button>,
          <Button key="dashboard" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        ]}
      />
    );
  }
  return null;
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <Card style={{ textAlign: 'center', margin: '50px auto', maxWidth: 500 }}>
        <Spin size="large" />
        <div style={{ marginTop: 20 }}>
          <h3>Loading...</h3>
          <p>Please wait while we load your payment information.</p>
        </div>
      </Card>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
