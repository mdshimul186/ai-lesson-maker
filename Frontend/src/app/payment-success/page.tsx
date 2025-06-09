'use client';

import React, { useEffect, useRef, Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { paymentService } from '@/services';
import { useAccountStore } from '@/stores';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

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
      <div className="flex justify-center items-center min-h-[400px]">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Processing your payment...</h3>
              <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="bg-red-100 rounded-full p-3">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Payment Error</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <div className="flex flex-col space-y-3 w-full">
              <Button onClick={() => router.push('/account')} className="w-full">
                Go to Account
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Payment Successful!</h2>
              <p className="text-muted-foreground">Your payment has been processed successfully. Credits have been added to your account.</p>
            </div>
            <div className="flex flex-col space-y-3 w-full">
              <Button onClick={() => router.push('/account')} className="w-full">
                View Account
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }
  return null;
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[400px]">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Loading...</h3>
              <p className="text-muted-foreground">Please wait while we load your payment information.</p>
            </div>
          </div>
        </Card>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
