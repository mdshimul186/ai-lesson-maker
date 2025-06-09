'use client';

import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Wallet, 
  Users, 
  Settings, 
  User, 
  History, 
  HelpCircle 
} from 'lucide-react';
import { useAccountStore } from '../../stores';
import { toast } from 'sonner';
import AccountCredits from '../../components/AccountCredits';
import TeamManagement from '../../components/TeamManagement';
import AccountSettings from '../../components/AccountSettings';
import AccountFAQ from '../../components/FAQ';
import TransactionHistory from '../../components/TransactionHistory';

export default function AccountPage() {
  const { fetchAccounts, currentAccount, error } = useAccountStore();
  
  useEffect(() => {
    // Only fetch accounts if we don't already have any loaded and we're on the client side
    if (typeof window !== 'undefined' && !currentAccount && !error) {
      fetchAccounts();
    }
  }, [fetchAccounts, currentAccount, error]);
  
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);
  
  if (!currentAccount) {
    return (
      <div className="p-6 bg-background dark:bg-background">
        <Card className="p-6 border border-border bg-background dark:bg-card/95 shadow-sm">
          <div className="flex justify-center items-center h-48 space-x-4">
            <Skeleton className="h-8 w-8 rounded-full bg-muted/70 dark:bg-muted/30" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-muted/70 dark:bg-muted/30" />
              <Skeleton className="h-4 w-24 bg-muted/70 dark:bg-muted/30" />
            </div>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6 space-y-6 bg-background dark:bg-background">
      {/* Account Header Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-700 dark:to-cyan-700 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16 bg-white/90 dark:bg-gray-900/90 ring-2 ring-white/50 dark:ring-white/20">
              <AvatarFallback className="text-blue-600 dark:text-blue-400">
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-2xl font-bold text-white">
                {currentAccount.name}
              </h3>
              <p className="text-blue-100 dark:text-blue-200">
                {currentAccount.type.charAt(0).toUpperCase() + currentAccount.type.slice(1)} Account
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100 dark:text-blue-200">Available Credits</div>
            <div className="text-3xl font-bold text-white">
              {currentAccount.credits}
            </div>
            <div className="text-sm text-blue-100 dark:text-blue-200">credits</div>
          </div>
        </div>
      </Card>
      
      {/* Tabs Section */}
      <Card className="p-6 border border-border bg-background dark:bg-card/95 shadow-sm">
        <Tabs defaultValue="credits" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5 bg-muted/60 dark:bg-muted/20 dark:text-muted-foreground">
            <TabsTrigger value="credits" className="flex items-center space-x-2 data-[state=active]:bg-background dark:data-[state=active]:bg-card/90 dark:data-[state=active]:text-foreground">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Credits</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2 data-[state=active]:bg-background dark:data-[state=active]:bg-card/90 dark:data-[state=active]:text-foreground">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2 data-[state=active]:bg-background dark:data-[state=active]:bg-card/90 dark:data-[state=active]:text-foreground">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center space-x-2 data-[state=active]:bg-background dark:data-[state=active]:bg-card/90 dark:data-[state=active]:text-foreground">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">FAQ</span>
            </TabsTrigger>
            {currentAccount.type === 'team' && (
              <TabsTrigger value="team" className="flex items-center space-x-2 data-[state=active]:bg-background dark:data-[state=active]:bg-card/90 dark:data-[state=active]:text-foreground">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Team</span>
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="credits" className="mt-6">
            <AccountCredits />
          </TabsContent>
          
          <TabsContent value="history" className="mt-6">
            <TransactionHistory />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-6">
            <AccountSettings />
          </TabsContent>
          
          <TabsContent value="faq" className="mt-6">
            <AccountFAQ />
          </TabsContent>
          
          {currentAccount.type === 'team' && (
            <TabsContent value="team" className="mt-6">
              <TeamManagement />
            </TabsContent>
          )}
        </Tabs>
      </Card>
    </div>
  );
}
