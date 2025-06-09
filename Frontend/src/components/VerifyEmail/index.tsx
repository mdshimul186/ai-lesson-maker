"use client"

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const VerifyEmail: React.FC = () => {
  const { verifyEmail } = useAuthStore();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Access localStorage only on the client side
    if (typeof window !== 'undefined') {
      const unverifiedEmail = localStorage.getItem('unverifiedEmail');
      setEmail(unverifiedEmail);
      
      // If no email in storage, check if we need to show a message
      if (!unverifiedEmail) {
        toast.info('Please enter the verification code sent to your email');
      }
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError(null);
    
    try {
      // Use the verification code entered by the user
      await verifyEmail(verificationCode);
      setVerified(true);
      
      // Show success message
      toast.success('Email verified successfully!');
      // Clear unverified email from storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('unverifiedEmail');
      }
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      setError('Verification failed. The code may be invalid or expired.');
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <Card className="max-w-md mx-auto mt-12 text-center">
        <CardContent className="pt-6">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold">Verifying your email...</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto mt-12">
      <CardContent className="pt-6">
        {verified ? (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-xl font-semibold text-green-600">Email Verified Successfully!</h3>
            <p className="text-gray-600">Your email has been verified. You can now login to your account.</p>
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Verify Your Email</h3>
              <p className="text-gray-600">
                Enter the 6-digit verification code sent to {email ? <strong>{email}</strong> : 'your email address'}.
              </p>
            </div>
            
            {error && (
              <Alert>
                <AlertDescription className="text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input 
                  id="verificationCode"
                  placeholder="Enter 6-digit code" 
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-xl font-bold tracking-widest"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={verifying}
              >
                {verifying ? 'Verifying...' : 'Verify Email'}
              </Button>
            </form>
            
            <div className="text-center text-sm">
              <span className="text-gray-600">Didn't receive the code? </span>
              <Button 
                variant="link" 
                className="p-0 h-auto text-blue-600"
                onClick={() => {
                  if (email) {
                    useAuthStore.getState().resendVerification(email);
                    toast.success('Verification code resent to your email');
                  } else {
                    toast.error('No email address found. Please try to register again.');
                  }
                }}
              >
                Resend Code
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VerifyEmail;