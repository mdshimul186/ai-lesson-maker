import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CreditCard, Info, CheckCircle, Loader2 } from 'lucide-react';
import { useAccountStore } from '../../stores';
import { toast } from 'sonner';
import CreditUsageGuide from '../CreditUsageGuide';

// Define CreditPackage type if not imported from services
type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  price: number;
};

const AccountCredits: React.FC = () => {
  const { 
    currentAccount, 
    creditPackages, 
    fetchCreditPackages, 
    purchaseCredits,
    isLoading, 
    error
  } = useAccountStore();
  
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetchCreditPackages();
    }
  }, [fetchCreditPackages]);
  
  // Refresh when account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && currentAccount) {
      console.log('Account changed in AccountCredits, refreshing data...');
      fetchCreditPackages();
    }
  }, [currentAccount?.id, fetchCreditPackages]);
  
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);
  
  const handleSelectPackage = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setConfirmDialogOpen(true);
  };
  
  const handleConfirmPurchase = async () => {
    if (!selectedPackage || !currentAccount) return;
    
    try {
      const result = await purchaseCredits(selectedPackage.id, currentAccount.id);
      
      if (result.redirectUrl) {
        // Redirect to PayPal for payment
        window.location.href = result.redirectUrl;
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (err) {
      console.error('Purchase failed:', err);
    } finally {
      setConfirmDialogOpen(false);
    }
  };
  
  if (!currentAccount) {
    return <div className="text-center py-8">Please select an account first</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Credits Summary Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-blue-200 dark:border-blue-900">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <h4 className="text-lg font-semibold mb-4 text-foreground">Current Balance</h4>
            <div className="flex items-baseline space-x-2 mb-2">
              <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {currentAccount.credits}
              </span>
              <span className="text-lg text-muted-foreground">credits</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Each credit can be used to generate one scene in your video lesson.
            </p>
          </div>
          <div>
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
              <div className="flex items-start space-x-2 mb-2">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <h5 className="font-semibold text-blue-900 dark:text-blue-300">Credit Usage Guide</h5>
              </div>
              <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                <li>• 1 credit = 1 scene in your video</li>
                <li>• Average lesson: 5-10 scenes</li>
                <li>• Credits never expire</li>
              </ul>
            </Card>
          </div>
        </div>
      </Card>
      
      <CreditUsageGuide />
        
      <div>
        <h4 className="text-lg font-semibold mb-2">Purchase Credits</h4>
        <p className="text-muted-foreground mb-6">
          Select a package below to add more credits to your account. All packages are one-time purchases (no subscription).
        </p>
          
        {isLoading && creditPackages.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {creditPackages.map(pkg => (
              <Card 
                key={pkg.id}
                className="relative cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-2 border-border hover:border-blue-300 dark:hover:border-blue-700 bg-background dark:bg-card"
                onClick={() => handleSelectPackage(pkg)}
              >
                <div className="p-0">
                  <Badge className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600">
                    {pkg.name}
                  </Badge>
                  
                  <div className="p-6 pt-10">
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{pkg.credits}</div>
                      <div className="text-sm text-muted-foreground">credits</div>
                    </div>
                    
                    <Separator className="my-3" />
                    
                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="text-base font-semibold text-foreground">Price: ${pkg.price}</div>
                        <div className="text-sm text-muted-foreground">
                          ${(pkg.price / pkg.credits).toFixed(2)} per credit
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-foreground">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                          Generate up to {pkg.credits} scenes
                        </div>
                        
                        <div>
                          <div className="flex items-center text-sm text-foreground">
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                            Create approximately {Math.floor(pkg.credits / 7)} lessons
                          </div>
                          <div className="text-xs text-muted-foreground ml-6">
                            (based on avg. 7 scenes per lesson)
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPackage(pkg);
                      }}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Purchase
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>                <DialogContent className="max-w-lg bg-background dark:bg-card">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              Review your purchase details before proceeding to payment.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPackage && (
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="text-lg font-semibold">{selectedPackage.name}</h4>
                <div className="text-2xl font-bold text-blue-600 my-2">
                  {selectedPackage.credits} credits
                </div>
                <div className="text-xl font-semibold">${selectedPackage.price}</div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div>
                  <h5 className="font-semibold mb-2">Package Details:</h5>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• {selectedPackage.credits} credits added to your account</li>
                    <li>• Generate up to {selectedPackage.credits} scenes in your videos</li>
                    <li>• Create approximately {Math.floor(selectedPackage.credits / 7)} complete lessons (based on average 7 scenes per lesson)</li>
                    <li>• Credits never expire</li>
                    <li>• One-time purchase (not a subscription)</li>
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-semibold mb-2">Credit Usage:</h5>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Each credit allows you to create one scene in your lesson</li>
                    <li>• Credits are only consumed when a video is successfully generated</li>
                    <li>• You can edit your project multiple times before generating</li>
                  </ul>
                </div>
              </div>
              
              <Separator />
              
              <Card className="p-4 bg-muted dark:bg-card/80 border dark:border-border">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">Total amount:</div>
                    <div className="text-sm text-muted-foreground">Includes all taxes and fees</div>
                  </div>
                  <div className="text-lg font-bold">${selectedPackage.price}</div>
                </div>
              </Card>
              
              <p className="text-sm text-muted-foreground">
                After confirming, you'll be redirected to PayPal to complete the payment securely.
                Upon successful payment, credits will be immediately available in your account.
              </p>
              
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleConfirmPurchase} disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Proceed to Payment'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountCredits;
