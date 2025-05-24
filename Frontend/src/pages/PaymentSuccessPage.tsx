import React, { useEffect, useRef } from 'react';
import { Result, Button, Card, Spin } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { paymentService } from '../services';
import { useAccountStore } from '../stores';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchAccounts } = useAccountStore();
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

      const queryParams = new URLSearchParams(location.search);
      const paymentId = queryParams.get('paymentId');
      const payerId = queryParams.get('PayerID');
      const token = queryParams.get('token');

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
          await fetchAccounts();
        } else {
          setError(result.error_message || 'Payment failed');
        }
      } catch (err: any) {
        console.error('Payment execution error:', err);
        const errorMessage = err?.response?.data?.message || err.message || 'Payment processing failed';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    executePaymentOnce();
  }, []); // Empty dependency array ensures this runs only once

  return (
    <Card style={{ maxWidth: 800, margin: '40px auto' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Processing your payment...</p>
        </div>
      ) : success ? (
        <Result
          status="success"
          title="Payment Successful!"
          subTitle="Your credits have been added to your account."
          extra={[
            <Button type="primary" key="account" onClick={() => navigate('/account')}>
              Go to Account
            </Button>,
            <Button key="home" onClick={() => navigate('/')}>
              Go to Home
            </Button>,
          ]}
        />
      ) : (
        <Result
          status="error"
          title="Payment Failed"
          subTitle={error || "There was an issue processing your payment."}
          extra={[
            <Button type="primary" key="account" onClick={() => navigate('/account')}>
              Back to Account
            </Button>,
            <Button key="try-again" onClick={() => navigate('/account')}>
              Try Again
            </Button>,
          ]}
        />
      )}
    </Card>
  );
};

export default PaymentSuccessPage;
