import React, { useState } from 'react';
import { Typography, Collapse, Card, Tag, Divider } from 'antd';
import { QuestionCircleOutlined, DownOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

interface FAQItem {
  question: string;
  answer: React.ReactNode;
  category?: string;
}

const AccountFAQ: React.FC = () => {
  const [activeKey, setActiveKey] = useState<string | string[]>(['0', '1']); // Default open the first two items
  
  const faqItems: FAQItem[] = [
    {
      question: "How do credits work in this application?",
      answer: (
        <>
          <Paragraph>
            Credits are the currency used in our platform for generating video lessons:
          </Paragraph>
          <ul>
            <li><Text strong>1 credit = 1 scene</Text> in your generated video</li>
            <li>Each scene typically represents one slide or segment in your lesson</li>
            <li>Credits are deducted only when a video is successfully generated</li>
            <li>Credits never expire once purchased</li>
          </ul>
        </>
      ),
      category: "basics"
    },
    {
      question: "How many credits do I need for a typical lesson?",
      answer: (
        <>
          <Paragraph>
            The number of credits needed depends on the complexity and length of your lesson:
          </Paragraph>
          <ul>
            <li><Text strong>Short lessons (1-2 minutes):</Text> 3-5 credits (scenes)</li>
            <li><Text strong>Standard lessons (3-5 minutes):</Text> 6-10 credits (scenes)</li>
            <li><Text strong>Comprehensive lessons (6+ minutes):</Text> 11-20 credits (scenes)</li>
          </ul>
          <Paragraph>
            We recommend starting with 5-10 scenes for most educational content to balance detail and engagement.
          </Paragraph>
        </>
      ),
      category: "usage"
    },
    {
      question: "What does each scene include?",
      answer: (
        <>
          <Paragraph>
            Each scene in your video lesson includes:
          </Paragraph>
          <ul>
            <li>Generated visual content based on your instructions</li>
            <li>Narration with your selected voice</li>
            <li>Automatic timing and transitions</li>
            <li>Background music (if enabled)</li>
          </ul>
          <Paragraph>
            You can customize the style, content, and pacing of each scene through the lesson creation interface.
          </Paragraph>
        </>
      ),
      category: "usage"
    },
    {
      question: "Can I share credits with my team?",
      answer: (
        <>
          <Paragraph>
            Yes, team accounts allow sharing of credits among all team members:
          </Paragraph>
          <ul>
            <li>All team members access the same credit pool</li>
            <li>The account owner can monitor credit usage by team members</li>
            <li>Transaction history shows which team member used credits</li>
          </ul>
          <Paragraph>
            To set up a team, create a team account and invite members from the Team Management tab.
          </Paragraph>
        </>
      ),
      category: "teams"
    },
    {
      question: "What payment methods are accepted?",
      answer: (
        <>
          <Paragraph>
            We currently support the following payment methods:
          </Paragraph>
          <ul>
            <li>PayPal (includes credit/debit card payments through PayPal)</li>
            <li>Major credit cards (Visa, Mastercard, American Express)</li>
            <li>For enterprise customers: invoice/bank transfer (contact sales)</li>
          </ul>
          <Paragraph>
            All payments are securely processed and your payment information is never stored on our servers.
          </Paragraph>
        </>
      ),
      category: "billing"
    },
    {
      question: "Do credits expire?",
      answer: (
        <>
          <Paragraph>
            No, your purchased credits never expire. They will remain in your account until used.
          </Paragraph>
          <Paragraph>
            This allows you to:
          </Paragraph>
          <ul>
            <li>Purchase credits in bulk at a discount</li>
            <li>Use them at your own pace</li>
            <li>Plan for future projects without pressure</li>
          </ul>
        </>
      ),
      category: "billing"
    },
    {
      question: "Can I get a refund for unused credits?",
      answer: (
        <>
          <Paragraph>
            Our refund policy for credits:
          </Paragraph>
          <ul>
            <li>Unused credits are eligible for refund within 30 days of purchase</li>
            <li>Partial refunds may be available for larger packages</li>
            <li>Please contact customer support for refund requests</li>
          </ul>
          <Paragraph>
            Note that we may not be able to provide refunds for credits that have been used or for purchases older than 30 days.
          </Paragraph>
        </>
      ),
      category: "billing"
    },
    {
      question: "How can I see my credit usage history?",
      answer: (
        <>
          <Paragraph>
            You can view your complete credit usage history in the Transaction History tab:
          </Paragraph>
          <ul>
            <li>See all credit purchases and deductions</li>
            <li>Filter by date or transaction type</li>
            <li>View details about which videos used credits</li>
          </ul>
          <Paragraph>
            This helps you track and manage your credit usage over time.
          </Paragraph>
        </>
      ),
      category: "usage"
    },
    {
      question: "What happens if I run out of credits during a project?",
      answer: (
        <>
          <Paragraph>
            If you run out of credits:
          </Paragraph>
          <ul>
            <li>You'll need to purchase more credits to generate new videos</li>
            <li>Any previously generated videos remain accessible</li>
            <li>In-progress videos that haven't started processing won't be generated</li>
          </ul>
          <Paragraph>
            We recommend monitoring your credit balance before starting large projects.
          </Paragraph>
        </>
      ),
      category: "usage"
    },
    {
      question: "Are there any bulk discounts available?",
      answer: (
        <>
          <Paragraph>
            Yes, we offer volume discounts:
          </Paragraph>
          <ul>
            <li>The more credits you purchase at once, the lower the per-credit cost</li>
            <li>Special enterprise pricing is available for educational institutions</li>
            <li>Contact our sales team for custom packages for high-volume users</li>
          </ul>
          <Paragraph>
            Our largest packages offer the best value per credit.
          </Paragraph>
        </>
      ),
      category: "billing"
    }
  ];

  // Group FAQs by category
  const categories = {
    basics: { title: "Credit Basics", icon: "🔍" },
    usage: { title: "Usage & Requirements", icon: "📊" },
    teams: { title: "Team Management", icon: "👥" },
    billing: { title: "Billing & Payments", icon: "💳" }
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
    <Card style={{ borderRadius: 8 }}>
      <Title level={4}>Frequently Asked Questions</Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Find answers to common questions about credits, billing, and account management.
      </Paragraph>

      {Object.entries(groupedFAQs).map(([category, items], categoryIndex) => (
        <div key={category} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <Text strong style={{ fontSize: 18 }}>
              {categories[category as keyof typeof categories]?.icon} {categories[category as keyof typeof categories]?.title || category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </div>

          <Collapse 
            expandIcon={({ isActive }) => <DownOutlined rotate={isActive ? -180 : 0} />}
            defaultActiveKey={['0']}
            style={{ backgroundColor: '#f9f9fa', borderRadius: 8 }}
          >
            {items.map((item, index) => (
              <Panel 
                header={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <QuestionCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                    <Text strong>{item.question}</Text>
                  </div>
                } 
                key={`${categoryIndex}-${index}`}
                style={{ borderRadius: 8, marginBottom: 8, border: '1px solid #f0f0f0' }}
              >
                <div style={{ paddingLeft: 16 }}>{item.answer}</div>
              </Panel>
            ))}
          </Collapse>
        </div>
      ))}

      <Divider />
      
      <div style={{ textAlign: 'center' }}>
        <Paragraph>
          <Text type="secondary">Still have questions? Contact our support team at </Text>
          <a href="mailto:support@ai-lesson-maker.com">support@ai-lesson-maker.com</a>
        </Paragraph>
      </div>
    </Card>
  );
};

export default AccountFAQ;
