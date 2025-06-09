'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  CreditCard, 
  Sparkles, 
  ArrowRight,
  Zap,
  HelpCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Pricing() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [annualBilling, setAnnualBilling] = useState(true);

  const handlePlanSelection = (planId: string) => {
    if (isAuthenticated) {
      router.push(`/account?plan=${planId}`);
    } else {
      router.push(`/register?plan=${planId}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Simple, Transparent Pricing</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Choose the perfect plan for your educational content needs. No hidden fees or complicated tiers.
        </p>
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          <span className={`text-sm font-medium ${!annualBilling ? 'text-foreground' : 'text-muted-foreground'}`}>
            Monthly
          </span>
          
          <button
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              annualBilling ? 'bg-primary' : 'bg-muted'
            }`}
            onClick={() => setAnnualBilling(!annualBilling)}
            role="switch"
            aria-checked={annualBilling}
          >
            <span
              className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                annualBilling ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          
          <div className="flex items-center">
            <span className={`text-sm font-medium ${annualBilling ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual
            </span>
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900">
              Save 20%
            </Badge>
          </div>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Starter Plan */}
        <Card className="relative overflow-hidden border border-border shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-2 text-foreground">Starter</h2>
            <p className="text-muted-foreground mb-4">Perfect for beginners and small projects</p>
            
            <div className="mb-6">
              <div className="flex items-end">
                <span className="text-4xl font-bold text-foreground">${annualBilling ? '12' : '15'}</span>
                <span className="text-sm text-muted-foreground ml-1 mb-1">/month</span>
              </div>
              {annualBilling && (
                <p className="text-sm text-muted-foreground">
                  Billed annually (${12 * 12})
                </p>
              )}
            </div>
            
            <Button 
              className="w-full mb-6"
              variant="outline"
              onClick={() => handlePlanSelection('starter')}
            >
              Get Started
            </Button>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">30 credits per month</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Up to 5 lessons per month</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Standard quality voice</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">720p video export</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Basic templates</span>
              </div>
              <div className="flex items-start">
                <XCircle className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Team collaboration</span>
              </div>
              <div className="flex items-start">
                <XCircle className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Advanced animations</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Pro Plan */}
        <Card className="relative border-primary overflow-hidden shadow-md scale-105 z-10">
          <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
            Most Popular
          </div>
          <div className="p-6 pt-8">
            <h2 className="text-xl font-bold mb-2 text-foreground">Professional</h2>
            <p className="text-muted-foreground mb-4">For educators and content creators</p>
            
            <div className="mb-6">
              <div className="flex items-end">
                <span className="text-4xl font-bold text-foreground">${annualBilling ? '39' : '49'}</span>
                <span className="text-sm text-muted-foreground ml-1 mb-1">/month</span>
              </div>
              {annualBilling && (
                <p className="text-sm text-muted-foreground">
                  Billed annually (${39 * 12})
                </p>
              )}
            </div>
            
            <Button 
              className="w-full mb-6"
              onClick={() => handlePlanSelection('pro')}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Get Pro
            </Button>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">100 credits per month</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Up to 20 lessons per month</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Premium quality voices</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">1080p video export</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">All templates</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Basic team collaboration</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Advanced animations</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Enterprise Plan */}
        <Card className="relative overflow-hidden border border-border shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-2 text-foreground">Enterprise</h2>
            <p className="text-muted-foreground mb-4">For schools and large organizations</p>
            
            <div className="mb-6">
              <div className="flex items-end">
                <span className="text-4xl font-bold text-foreground">${annualBilling ? '99' : '129'}</span>
                <span className="text-sm text-muted-foreground ml-1 mb-1">/month</span>
              </div>
              {annualBilling && (
                <p className="text-sm text-muted-foreground">
                  Billed annually (${99 * 12})
                </p>
              )}
            </div>
            
            <Button 
              className="w-full mb-6"
              variant="outline"
              onClick={() => handlePlanSelection('enterprise')}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Contact Sales
            </Button>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Unlimited credits</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Unlimited lessons</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Premium quality voices</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">4K video export</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Custom templates</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Advanced team management</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Dedicated support</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Features Comparison */}
      <div className="mt-20 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center text-foreground">Compare Plan Features</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-4 px-6 text-left font-medium text-foreground">Feature</th>
                <th className="py-4 px-6 text-center font-medium text-foreground">Starter</th>
                <th className="py-4 px-6 text-center font-medium text-foreground bg-muted/30">Professional</th>
                <th className="py-4 px-6 text-center font-medium text-foreground">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-4 px-6 text-muted-foreground">
                  <div className="flex items-center">
                    <span>Monthly Credits</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground/70" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-56">Credits are used to generate video scenes. Each scene uses 1 credit.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </td>
                <td className="py-4 px-6 text-center text-muted-foreground">30</td>
                <td className="py-4 px-6 text-center text-muted-foreground bg-muted/30">100</td>
                <td className="py-4 px-6 text-center text-muted-foreground">Unlimited</td>
              </tr>
              
              <tr className="border-b border-border">
                <td className="py-4 px-6 text-muted-foreground">Video Quality</td>
                <td className="py-4 px-6 text-center text-muted-foreground">720p</td>
                <td className="py-4 px-6 text-center text-muted-foreground bg-muted/30">1080p</td>
                <td className="py-4 px-6 text-center text-muted-foreground">4K</td>
              </tr>
              
              <tr className="border-b border-border">
                <td className="py-4 px-6 text-muted-foreground">Team Members</td>
                <td className="py-4 px-6 text-center text-muted-foreground">1</td>
                <td className="py-4 px-6 text-center text-muted-foreground bg-muted/30">5</td>
                <td className="py-4 px-6 text-center text-muted-foreground">Unlimited</td>
              </tr>
              
              <tr className="border-b border-border">
                <td className="py-4 px-6 text-muted-foreground">Voice Options</td>
                <td className="py-4 px-6 text-center text-muted-foreground">5</td>
                <td className="py-4 px-6 text-center text-muted-foreground bg-muted/30">20</td>
                <td className="py-4 px-6 text-center text-muted-foreground">All + Custom</td>
              </tr>
              
              <tr className="border-b border-border">
                <td className="py-4 px-6 text-muted-foreground">Support</td>
                <td className="py-4 px-6 text-center text-muted-foreground">Email</td>
                <td className="py-4 px-6 text-center text-muted-foreground bg-muted/30">Priority Email</td>
                <td className="py-4 px-6 text-center text-muted-foreground">Dedicated Support</td>
              </tr>
              
              <tr className="border-b border-border">
                <td className="py-4 px-6 text-muted-foreground">Custom Branding</td>
                <td className="py-4 px-6 text-center">
                  <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
                </td>
                <td className="py-4 px-6 text-center bg-muted/30">
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                </td>
                <td className="py-4 px-6 text-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                </td>
              </tr>
              
              <tr>
                <td className="py-4 px-6 text-muted-foreground">API Access</td>
                <td className="py-4 px-6 text-center">
                  <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
                </td>
                <td className="py-4 px-6 text-center bg-muted/30">
                  <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
                </td>
                <td className="py-4 px-6 text-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center text-foreground">Frequently Asked Questions</h2>
        
        <div className="space-y-6">
          <Card className="p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-2 text-foreground">Can I upgrade or downgrade my plan?</h3>
            <p className="text-muted-foreground">
              Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated 
              difference for the remainder of your billing cycle. When downgrading, the new rate will apply at the 
              next billing cycle.
            </p>
          </Card>
          
          <Card className="p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-2 text-foreground">What happens if I use all my credits?</h3>
            <p className="text-muted-foreground">
              If you use all your monthly credits, you can purchase additional credit packages from the account page. 
              Alternatively, you can wait until your next billing cycle when your credits will refresh.
            </p>
          </Card>
          
          <Card className="p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-2 text-foreground">Is there a free trial?</h3>
            <p className="text-muted-foreground">
              Yes, we offer a 7-day free trial with 10 credits so you can test our platform before committing to a paid plan. 
              No credit card is required for the trial.
            </p>
          </Card>
          
          <Card className="p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-2 text-foreground">How do credits work?</h3>
            <p className="text-muted-foreground">
              Each credit allows you to generate one scene in your video lesson. A typical 5-minute lesson might use 
              anywhere from 5-15 credits, depending on how many scenes you include.
            </p>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-20 text-center">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-800 rounded-xl p-10 max-w-4xl mx-auto">
          <div className="space-y-6 text-white">
            <h2 className="text-3xl font-bold">Ready to Transform Your Teaching?</h2>
            <p className="text-xl max-w-2xl mx-auto">
              Join thousands of educators who are already creating amazing content with AI Lesson Maker
            </p>
            <Button 
              size="lg"
              className="bg-white text-primary hover:bg-gray-100"
              onClick={() => router.push('/register')}
            >
              <Zap className="h-5 w-5 mr-2" />
              Start Your Free Trial
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <p className="text-sm opacity-90">No credit card required</p>
          </div>
        </div>
      </div>
    </div>
  );
}
