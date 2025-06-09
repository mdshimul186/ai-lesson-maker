import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Gift,
  Info
} from 'lucide-react';
import { useAccountStore } from '../../stores';

interface Transaction {
  id: string;
  type: 'credit_purchase' | 'credit_usage' | 'refund' | 'bonus';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

const TransactionHistory: React.FC = () => {
  const { currentAccount } = useAccountStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading transaction data
    // In a real app, this would fetch from an API
    const fetchTransactions = async () => {
      setLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock transaction data
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          type: 'credit_purchase',
          amount: 100,
          description: 'Credit Purchase - Starter Pack',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
          status: 'completed'
        },
        {
          id: '2',
          type: 'credit_usage',
          amount: -10,
          description: 'Video Generation - "Introduction to AI"',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
          status: 'completed'
        },
        {
          id: '3',
          type: 'credit_usage',
          amount: -5,
          description: 'Image Generation - Course Thumbnail',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          status: 'completed'
        },
        {
          id: '4',
          type: 'bonus',
          amount: 25,
          description: 'Welcome Bonus Credits',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
          status: 'completed'
        }
      ];
      
      setTransactions(mockTransactions);
      setLoading(false);
    };

    if (currentAccount) {
      fetchTransactions();
    }
  }, [currentAccount]);

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'credit_purchase':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'credit_usage':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'refund':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'bonus':
        return <Gift className="h-4 w-4 text-purple-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatAmount = (amount: number) => {
    const isPositive = amount > 0;
    const absAmount = Math.abs(amount);
    return (
      <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : '-'}{absAmount} credits
      </span>
    );
  };

  if (!currentAccount) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Please select an account first</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold">Transaction History</h4>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Last 30 days</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h5 className="text-lg font-semibold mb-2">No Transactions Found</h5>
            <p className="text-muted-foreground">You haven't made any transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction, index) => (
              <div key={transaction.id}>
                <div className="flex items-center justify-between p-4 hover:bg-muted dark:hover:bg-card rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(transaction.status)}
                    <div className="text-right">
                      {formatAmount(transaction.amount)}
                    </div>
                  </div>
                </div>
                {index < transactions.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Summary Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h5 className="font-semibold mb-2 text-blue-900">Transaction Summary</h5>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• All transactions are processed securely and recorded in real-time.</p>
          <p>• Credit usage is deducted immediately when services are consumed.</p>
          <p>• Refunds and adjustments may take 3-5 business days to process.</p>
        </div>
      </Card>
    </div>
  );
};

export default TransactionHistory;
