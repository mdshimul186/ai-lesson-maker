'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Info, AlertTriangle } from 'lucide-react';

export default function TermsConditions() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-foreground">Terms & Conditions</h1>
          <p className="text-xl text-muted-foreground">
            Please read these terms carefully before using our platform
          </p>
          <div className="flex items-center justify-center mt-6">
            <FileText className="h-6 w-6 text-primary mr-2" />
            <p className="text-sm text-muted-foreground">
              Last updated: June 1, 2025
            </p>
          </div>
        </div>

        {/* Introduction */}
        <Card className="p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Introduction</h2>
          <p className="text-muted-foreground mb-4">
            These Terms and Conditions ("Terms") govern your use of AI Lesson Maker ("the Platform"), 
            operated by AI Lesson Maker Inc. By accessing or using our Platform, you agree to be bound 
            by these Terms. If you disagree with any part of these Terms, you may not access the Platform.
          </p>
        </Card>

        {/* Account Terms */}
        <Card className="p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Account Terms</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-medium mb-2 text-foreground">Account Registration</h3>
              <p className="text-muted-foreground">
                To use certain features of the Platform, you must register for an account. You agree to provide 
                accurate, current, and complete information during the registration process and to update such 
                information to keep it accurate, current, and complete.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-2 text-foreground">Account Security</h3>
              <p className="text-muted-foreground">
                You are responsible for safeguarding your password and for all activities that occur under your account. 
                You agree to notify us immediately of any unauthorized use of your account or any other breach of security.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-2 text-foreground">Account Termination</h3>
              <p className="text-muted-foreground">
                We reserve the right to terminate or suspend your account and access to the Platform, at our sole discretion, 
                without notice or liability, for any reason, including but not limited to a breach of these Terms.
              </p>
            </div>
          </div>
        </Card>

        {/* Service Usage */}
        <Card className="p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Service Usage</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-medium mb-2 text-foreground">License</h3>
              <p className="text-muted-foreground">
                Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, and revocable license 
                to use the Platform for your personal or internal business purposes.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-2 text-foreground">Restrictions</h3>
              <p className="text-muted-foreground mb-3">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 mb-3 text-muted-foreground space-y-2">
                <li>Use the Platform for any illegal purpose or in violation of any laws</li>
                <li>Infringe upon or violate the intellectual property rights of others</li>
                <li>Attempt to gain unauthorized access to the Platform or its systems</li>
                <li>Interfere with or disrupt the integrity or performance of the Platform</li>
                <li>Create or distribute content that is harmful, abusive, or discriminatory</li>
                <li>Resell, duplicate, or distribute the Platform without authorization</li>
              </ul>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  Violations of these restrictions may result in the termination of your account and potential legal action.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Content Ownership */}
        <Card className="p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Content Ownership</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-medium mb-2 text-foreground">Your Content</h3>
              <p className="text-muted-foreground">
                You retain all rights to any content you create, upload, or share through the Platform. By submitting 
                content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and 
                display such content solely for the purpose of providing and improving the Platform.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-2 text-foreground">Our Content</h3>
              <p className="text-muted-foreground">
                The Platform and its original content, features, and functionality are owned by AI Lesson Maker Inc. 
                and are protected by international copyright, trademark, patent, trade secret, and other intellectual 
                property or proprietary rights laws.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-2 text-foreground">AI-Generated Content</h3>
              <p className="text-muted-foreground">
                Content generated by the Platform's AI capabilities is subject to these Terms. While you own the content 
                you create, certain components may include elements derived from our AI models, which remain our intellectual property.
              </p>
            </div>
          </div>
        </Card>

        {/* Payment Terms */}
        <Card className="p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Payment Terms</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-medium mb-2 text-foreground">Subscription Plans</h3>
              <p className="text-muted-foreground">
                Some features of the Platform require a paid subscription. By subscribing to a paid plan, you agree 
                to pay all fees in accordance with the pricing and terms displayed at the time of purchase.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-2 text-foreground">Billing</h3>
              <p className="text-muted-foreground">
                For subscription plans, you will be billed in advance on a recurring basis, depending on the plan you select. 
                Subscription fees are non-refundable except as required by law or as explicitly stated in these Terms.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-2 text-foreground">Changes to Pricing</h3>
              <p className="text-muted-foreground">
                We reserve the right to change our prices at any time. If we change pricing for a subscription plan, 
                we will notify you before the change takes effect.
              </p>
            </div>
          </div>
        </Card>

        {/* Limitation of Liability */}
        <Card className="p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Limitation of Liability</h2>
          <p className="text-muted-foreground mb-4">
            To the maximum extent permitted by law, AI Lesson Maker Inc. and its affiliates, officers, employees, 
            agents, partners, and licensors shall not be liable for any indirect, incidental, special, consequential, 
            or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
          </p>
          <p className="text-muted-foreground">
            In no event shall our total liability to you for all claims exceed the amount you paid to us during the 
            twelve (12) month period prior to the action giving rise to the liability.
          </p>
        </Card>

        {/* Changes to Terms */}
        <Card className="p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Changes to Terms</h2>
          <p className="text-muted-foreground mb-4">
            We reserve the right to modify these Terms at any time. If we make material changes to these Terms, 
            we will notify you by email or by posting a notice on our Platform prior to the changes becoming effective.
          </p>
          <p className="text-muted-foreground">
            Your continued use of the Platform after such modifications will constitute your acknowledgment of 
            the modified Terms and agreement to abide by them.
          </p>
        </Card>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-800 rounded-lg p-8 mb-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Questions About Our Terms?</h2>
          <p className="mb-6">
            If you have any questions or concerns about these Terms, please contact our support team.
          </p>
          <Button 
            variant="secondary" 
            className="bg-white text-primary hover:bg-gray-100"
            onClick={() => window.location.href = '/contact'}
          >
            Contact Us
          </Button>
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <Link href="/privacy-policy" className="hover:text-primary">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/cookies" className="hover:text-primary">
            Cookie Policy
          </Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-primary">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
