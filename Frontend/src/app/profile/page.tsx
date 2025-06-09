'use client';

import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Building,
  CreditCard,
  Users
} from 'lucide-react';
import { useAuthStore, useAccountStore } from '../../stores';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const { currentAccount, fetchAccounts } = useAccountStore();

  useEffect(() => {
    if (user && !currentAccount) {
      fetchAccounts();
    }
  }, [user, currentAccount, fetchAccounts]);

  if (authLoading) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">Please log in to view your profile</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Profile Header Card */}
      <Card className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              <User className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">{`${user.first_name} ${user.last_name}`.trim() || 'User'}</h2>
            <p className="text-muted-foreground flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>{user.email}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">User Information</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">User ID</span>
                <span className="text-sm font-mono">{user.id}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Email</span>
                <span className="text-sm">{user.email}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">First Name</span>
                <span className="text-sm">{user.first_name || 'Not provided'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Last Name</span>
                <span className="text-sm">{user.last_name || 'Not provided'}</span>
              </div>
              
              {user.created_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>Member Since</span>
                  </span>
                  <span className="text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Account</h3>
            
            {currentAccount ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                    <Building className="h-3 w-3" />
                    <span>Account Name</span>
                  </span>
                  <span className="text-sm font-semibold">{currentAccount.name}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Account Type</span>
                  <Badge variant={currentAccount.type === 'team' ? 'default' : 'secondary'}>
                    {currentAccount.type === 'team' ? (
                      <Users className="h-3 w-3 mr-1" />
                    ) : (
                      <User className="h-3 w-3 mr-1" />
                    )}
                    {currentAccount.type.charAt(0).toUpperCase() + currentAccount.type.slice(1)}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                    <CreditCard className="h-3 w-3" />
                    <span>Credits Available</span>
                  </span>
                  <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                    {currentAccount.credits} credits
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Role</span>
                  <Badge variant="outline">
                    <Shield className="h-3 w-3 mr-1" />
                    {currentAccount.owner_id === user.id ? 'Owner' : 'Member'}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No account selected</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Quick Stats Card */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">
              {currentAccount?.credits || 0}
            </div>
            <div className="text-sm text-blue-700">Available Credits</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">
              {currentAccount?.type === 'team' ? 'Team' : 'Individual'}
            </div>
            <div className="text-sm text-green-700">Account Type</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {currentAccount?.owner_id === user.id ? 'Owner' : 'Member'}
            </div>
            <div className="text-sm text-purple-700">Your Role</div>
          </div>
        </div>
      </Card>

      {/* Profile Actions Card */}
      <Card className="p-6 bg-muted border-border">
        <h3 className="text-lg font-semibold mb-4">Manage Your Account</h3>
        <p className="text-sm text-muted-foreground mb-4">
          To manage your credits, team settings, and billing information, visit your account page.
        </p>
        <div className="flex space-x-4">
          <a 
            href="/account" 
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Go to Account Settings
          </a>
        </div>
      </Card>
    </div>
  );
}
