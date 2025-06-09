'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-foreground">Privacy Policy</h1>
          <p className="text-xl text-muted-foreground">
            How we collect, use, and protect your information
          </p>
          <div className="flex items-center justify-center mt-6">
            <Shield className="h-6 w-6 text-primary mr-2" />
            <p className="text-sm text-muted-foreground">
              Last updated: June 1, 2025
            </p>
          </div>
        </div>

        {/* Introduction */}
        <Card className="p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Introduction</h2>
          <p className="text-muted-foreground mb-4">
            At AI Lesson Maker, we take your privacy seriously. This Privacy Policy explains how we collect, 
            use, disclose, and safeguard your information when you visit our website and use our services.
          </p>
          <p className="text-muted-foreground">
            Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, 
            please do not access the site or use our services.
          </p>
        </Card>

        {/* Information We Collect */}
        <Card className="p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Information We Collect</h2>
          
          <h3 className="text-xl font-medium mb-3 text-foreground">Personal Data</h3>
          <p className="text-muted-foreground mb-4">
            When you register for an account, we may collect:
          </p>
          <ul className="list-disc pl-6 mb-6 text-muted-foreground space-y-2">
            <li>Name and email address</li>
            <li>Billing information and payment details</li>
            <li>Account preferences and settings</li>
            <li>Content you create using our platform</li>
          </ul>
          
          <h3 className="text-xl font-medium mb-3 text-foreground">Usage Data</h3>
          <p className="text-muted-foreground mb-4">
            We automatically collect certain information when you visit, use or navigate our platform:
          </p>
          <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-2">
            <li>Device and connection information</li>
            <li>Browser and operating system details</li>
            <li>IP address and approximate location</li>
            <li>Pages you view and features you use</li>
            <li>Time spent on our platform and navigation patterns</li>
          </ul>
        </Card>

        {/* How We Use Your Information */}
        <Card className="p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">How We Use Your Information</h2>
          <p className="text-muted-foreground mb-4">
            We use the information we collect for various purposes:
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="mr-3 mt-1">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Provide and maintain our services</h4>
                <p className="text-muted-foreground">Including account creation, content generation, and processing payments</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-3 mt-1">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Improve our platform</h4>
                <p className="text-muted-foreground">Understanding how you use our features to enhance user experience</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-3 mt-1">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Communicate with you</h4>
                <p className="text-muted-foreground">Sending updates, support messages, and responding to inquiries</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-3 mt-1">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Security and fraud prevention</h4>
                <p className="text-muted-foreground">Protecting our platform and users from unauthorized access and abuse</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Data Security */}
        <Card className="p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Data Security</h2>
          <p className="text-muted-foreground mb-4">
            We implement appropriate technical and organizational security measures to protect your personal information.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg mb-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                While we strive to use commercially acceptable means to protect your personal information, 
                we cannot guarantee its absolute security. Any transmission of information is at your own risk.
              </p>
            </div>
          </div>
          <p className="text-muted-foreground">
            We regularly review our security procedures and may update them as new technologies become available.
          </p>
        </Card>

        {/* Your Privacy Rights */}
        <Card className="p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Your Privacy Rights</h2>
          <p className="text-muted-foreground mb-4">
            Depending on your location, you may have certain rights regarding your personal information:
          </p>
          <ul className="list-disc pl-6 mb-6 text-muted-foreground space-y-2">
            <li><span className="font-medium">Access:</span> Request a copy of the personal information we hold about you</li>
            <li><span className="font-medium">Correction:</span> Request correction of inaccurate information</li>
            <li><span className="font-medium">Deletion:</span> Request deletion of your personal information</li>
            <li><span className="font-medium">Restriction:</span> Request limitation on how we process your data</li>
            <li><span className="font-medium">Data portability:</span> Request a copy of your data in a structured format</li>
            <li><span className="font-medium">Objection:</span> Object to our processing of your personal information</li>
          </ul>
          <p className="text-muted-foreground">
            To exercise any of these rights, please contact us using the information provided in the "Contact Us" section.
          </p>
        </Card>

        {/* Cookies */}
        <Card className="p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Cookies and Tracking Technologies</h2>
          <p className="text-muted-foreground mb-4">
            We use cookies and similar tracking technologies to track activity on our platform and store certain information.
            You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
          </p>
          <p className="text-muted-foreground">
            For more information about our use of cookies, please see our <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
          </p>
        </Card>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-800 rounded-lg p-8 mb-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Have Questions About Your Privacy?</h2>
          <p className="mb-6">
            We're committed to transparency and are happy to address any concerns you may have.
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
          <Link href="/terms-conditions" className="hover:text-primary">
            Terms & Conditions
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
