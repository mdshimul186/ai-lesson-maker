'use client';

import React, { useEffect, useState } from 'react';
import { useAccountStore } from '../../stores';
import { toast } from 'sonner';
import { 
  User, 
  Users, 
  Plus, 
  ChevronDown,
  Loader2
} from 'lucide-react';

// shadcn/ui components
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

import CreateTeamModal from './CreateTeamModal';

// Define Account type locally if not exported from services
type Account = {
    id: string;
    name: string;
    type: 'personal' | 'team';
    credits: number;
};

const AccountSelector: React.FC = () => {
    const {
        accounts,
        currentAccount,
        fetchAccounts,
        setCurrentAccount,
        isLoading,
        error
    } = useAccountStore();

    const [createTeamModalVisible, setCreateTeamModalVisible] = useState(false);

    useEffect(() => {
        // Only fetch accounts if we don't already have any loaded
        if (accounts.length === 0 && !isLoading) {
            fetchAccounts();
        }
    }, [accounts.length, fetchAccounts, isLoading]);

    useEffect(() => {
        if (error) {
            toast.error(error);
        }
    }, [error]);

    // Check if we have a saved account ID in localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedAccountId = localStorage.getItem('currentAccountId');
            if (savedAccountId && accounts.some(a => a.id === savedAccountId)) {
                setCurrentAccount(savedAccountId);
            }
        }
    }, [accounts, setCurrentAccount]);

    const handleAccountChange = (accountId: string) => {
        setCurrentAccount(accountId);
    };

    const handleCreateTeam = () => {
        setCreateTeamModalVisible(true);
    };

    const renderAccountIcon = (account: Account) => {
        return account.type === 'personal' ? 
            <User className="w-4 h-4" /> : 
            <Users className="w-4 h-4" />;
    };

    const getCreditsColor = (credits: number) => {
        return credits > 0 ? 'bg-green-500' : 'bg-red-500';
    };

    if (isLoading && accounts.length === 0) {
        return (
            <div className="flex items-center text-white/80">
                <Loader2 className="w-4 h-4 animate-spin" />
            </div>
        );
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        className="text-white hover:text-blue-100 hover:bg-white/10 space-x-2 backdrop-blur-sm border border-white/20 rounded-full px-3 py-2 transition-all duration-300 shadow-lg max-w-[200px]"
                    >
                        {currentAccount ? (
                            <>
                                {renderAccountIcon(currentAccount)}
                                <span className="hidden sm:inline truncate max-w-[80px]">{currentAccount.name}</span>
                                <Badge 
                                    variant="secondary"
                                    className={`${getCreditsColor(currentAccount.credits)} text-white border-0 shadow-sm font-semibold flex-shrink-0`}
                                >
                                    {currentAccount.credits}
                                </Badge>
                            </>
                        ) : (
                            <>
                                <User className="w-4 h-4" />
                                <span className="hidden sm:inline truncate">Select Account</span>
                            </>
                        )}
                        <ChevronDown className="w-4 h-4 flex-shrink-0" />
                    </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-lg border border-border/50 shadow-xl">
                    {accounts.map(account => (
                        <DropdownMenuItem
                            key={account.id}
                            onClick={() => handleAccountChange(account.id)}
                            className="flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
                        >
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                                {renderAccountIcon(account)}
                                <span className="font-medium truncate">{account.name}</span>
                            </div>
                            <Badge 
                                variant="secondary"
                                className={`${getCreditsColor(account.credits)} text-white text-xs shadow-sm font-semibold flex-shrink-0 ml-2`}
                            >
                                {account.credits}
                            </Badge>
                        </DropdownMenuItem>
                    ))}
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem 
                        onClick={handleCreateTeam}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Team Account</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <CreateTeamModal
                visible={createTeamModalVisible}
                onClose={() => setCreateTeamModalVisible(false)}
            />
        </>
    );
};

export default AccountSelector;
