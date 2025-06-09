'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="bg-yellow-100 rounded-full p-3">
            <AlertTriangle className="h-12 w-12 text-yellow-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Payment Cancelled</h2>
            <p className="text-muted-foreground">Your payment was cancelled. No charges were made to your account.</p>
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
