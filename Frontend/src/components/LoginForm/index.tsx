import React, { useState } from 'react';
import { useAuthStore } from '../../stores';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const LoginForm: React.FC = () => {
  const router = useRouter();
  const { isLoading, error, needsVerification, login, resendVerification, resetNeedsVerification, unverifiedEmail } = useAuthStore();
  const [emailForResend, setEmailForResend] = useState(unverifiedEmail || '');
  const [resendModalVisible, setResendModalVisible] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({
        email: formData.email,
        password: formData.password
      });
      // If no error and authentication successful
      if (useAuthStore.getState().isAuthenticated) {
        toast.success('Login successful!');
        router.push('/dashboard');
      } else if (useAuthStore.getState().needsVerification) {
        setEmailForResend(formData.email);
        // Store the email for the verification page
        localStorage.setItem('unverifiedEmail', formData.email);
        // Redirect to verification page immediately
        toast.info('Please verify your email before logging in');
        router.push('/verify-email');
      }
    } catch (err: any) {
      toast.error('Login failed. Please check your credentials.');
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      await resendVerification(emailForResend);
      toast.success('Verification email sent successfully');
      setResendModalVisible(false);
      resetNeedsVerification();
    } catch (err) {
      toast.error('Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <>
      <Card className="max-w-md mx-auto mt-12 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <User className="h-6 w-6" /> Login
          </CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>

            {error && !needsVerification && (
              <Alert className="mt-4">
                <AlertDescription className="text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/register" className="text-blue-600 hover:underline">
                Register
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={resendModalVisible} onOpenChange={setResendModalVisible}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Email Verification Required</AlertDialogTitle>
            <AlertDialogDescription>
              Your email address hasn't been verified yet. Please check your inbox for the verification email or click the button below to resend it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setResendModalVisible(false);
              resetNeedsVerification();
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleResendVerification} disabled={resendLoading}>
              {resendLoading ? 'Sending...' : 'Resend Verification Email'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LoginForm;
