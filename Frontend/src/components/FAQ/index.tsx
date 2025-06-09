import React from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle, Search, BarChart3, Users, CreditCard } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
  category?: string;
}

const AccountFAQ: React.FC = () => {

  const faqItems: FAQItem[] = [
    {
      question: "How do credits work in this application?",
      answer: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Credits are the currency used in our platform for generating video lessons:
          </p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li><span className="font-semibold">1 credit = 1 scene</span> in your generated video</li>
            <li>Each scene typically represents one slide or segment in your lesson</li>
            <li>Credits are deducted only when a video is successfully generated</li>
            <li>Credits never expire once purchased</li>
          </ul>
        </div>
      ),
      category: "basics"
    },
    {
      question: "How many credits do I need for a typical lesson?",
      answer: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The number of credits needed depends on the complexity and length of your lesson:
          </p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li><span className="font-semibold">Short lessons (1-2 minutes):</span> 3-5 credits (scenes)</li>
            <li><span className="font-semibold">Standard lessons (3-5 minutes):</span> 6-10 credits (scenes)</li>
            <li><span className="font-semibold">Comprehensive lessons (6+ minutes):</span> 11-20 credits (scenes)</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            We recommend starting with 5-10 scenes for most educational content to balance detail and engagement.
          </p>
        </div>
      ),
      category: "usage"
    },
    {
      question: "What does each scene include?",
      answer: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Each scene in your video lesson includes:
          </p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>Generated visual content based on your instructions</li>
            <li>Narration with your selected voice</li>
            <li>Automatic timing and transitions</li>
            <li>Background music (if enabled)</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            You can customize the style, content, and pacing of each scene through the lesson creation interface.
          </p>
        </div>
      ),
      category: "usage"
    },
    {
      question: "Can I share credits with my team?",
      answer: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Yes, team accounts allow sharing of credits among all team members:
          </p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>All team members access the same credit pool</li>
            <li>The account owner can monitor credit usage by team members</li>
            <li>Transaction history shows which team member used credits</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            To set up a team, create a team account and invite members from the Team Management tab.
          </p>
        </div>
      ),
      category: "teams"
    },
    {
      question: "What payment methods are accepted?",
      answer: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            We currently support the following payment methods:
          </p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>PayPal (includes credit/debit card payments through PayPal)</li>
            <li>Major credit cards (Visa, Mastercard, American Express)</li>
            <li>For enterprise customers: invoice/bank transfer (contact sales)</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            All payments are securely processed and your payment information is never stored on our servers.
          </p>
        </div>
      ),
      category: "billing"
    },
    {
      question: "Do credits expire?",
      answer: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No, your purchased credits never expire. They will remain in your account until used.
          </p>
          <p className="text-sm text-muted-foreground">
            This allows you to:
          </p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>Purchase credits in bulk at a discount</li>
            <li>Use them at your own pace</li>
            <li>Plan for future projects without pressure</li>
          </ul>
        </div>
      ),
      category: "billing"
    },
    {
      question: "Can I get a refund for unused credits?",
      answer: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Our refund policy for credits:
          </p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>Unused credits are eligible for refund within 30 days of purchase</li>
            <li>Partial refunds may be available for larger packages</li>
            <li>Please contact customer support for refund requests</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Note that we may not be able to provide refunds for credits that have been used or for purchases older than 30 days.
          </p>
        </div>
      ),
      category: "billing"
    },
    {
      question: "How can I see my credit usage history?",
      answer: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You can view your complete credit usage history in the Transaction History tab:
          </p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>See all credit purchases and deductions</li>
            <li>Filter by date or transaction type</li>
            <li>View details about which videos used credits</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            This helps you track and manage your credit usage over time.
          </p>
        </div>
      ),
      category: "usage"
    },
    {
      question: "What happens if I run out of credits during a project?",
      answer: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            If you run out of credits:
          </p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>You'll need to purchase more credits to generate new videos</li>
            <li>Any previously generated videos remain accessible</li>
            <li>In-progress videos that haven't started processing won't be generated</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            We recommend monitoring your credit balance before starting large projects.
          </p>
        </div>
      ),
      category: "usage"
    },
    {
      question: "Are there any bulk discounts available?",
      answer: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Yes, we offer volume discounts:
          </p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>The more credits you purchase at once, the lower the per-credit cost</li>
            <li>Special enterprise pricing is available for educational institutions</li>
            <li>Contact our sales team for custom packages for high-volume users</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Our largest packages offer the best value per credit.
          </p>
        </div>
      ),
      category: "billing"
    }
  ];

  // Group FAQs by category
  const categories = {
    basics: { title: "Credit Basics", icon: Search },
    usage: { title: "Usage & Requirements", icon: BarChart3 },
    teams: { title: "Team Management", icon: Users },
    billing: { title: "Billing & Payments", icon: CreditCard }
  };

  const groupedFAQs: Record<string, FAQItem[]> = {};
  faqItems.forEach(item => {
    const category = item.category || 'other';
    if (!groupedFAQs[category]) {
      groupedFAQs[category] = [];
    }
    groupedFAQs[category].push(item);
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-2">Frequently Asked Questions</h4>
        <p className="text-sm text-muted-foreground mb-6">
          Find answers to common questions about credits, billing, and account management.
        </p>

        <div className="space-y-6">
          {Object.entries(groupedFAQs).map(([category, items]) => {
            const categoryConfig = categories[category as keyof typeof categories];
            const IconComponent = categoryConfig?.icon || HelpCircle;
            
            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <IconComponent className="h-5 w-5 text-primary" />
                  <h5 className="text-base font-semibold">
                    {categoryConfig?.title || category.charAt(0).toUpperCase() + category.slice(1)}
                  </h5>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  {items.map((item, index) => (
                    <AccordionItem key={`${category}-${index}`} value={`${category}-${index}`}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center space-x-2">
                          <HelpCircle className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="font-medium">{item.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 pb-2 pl-6">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            );
          })}
        </div>

        <Separator className="my-6" />
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Still have questions? Contact our support team at{' '}
            <a 
              href="mailto:support@ai-lesson-maker.com" 
              className="text-primary hover:underline"
            >
              support@ai-lesson-maker.com
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AccountFAQ;
