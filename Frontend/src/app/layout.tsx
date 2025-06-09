'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import '../locales'; // Initialize i18n
import AppHeader from '../components/AppHeader';
import Footer from '../components/Footer';
import { useAuthStore } from '@/stores';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from "sonner";
import { ThemeProvider } from '../contexts/theme-provider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { token, fetchCurrentUser, isAuthenticated } = useAuthStore();
  const pathname = usePathname();

  // Define public pages that should always show the footer
  const publicPages = [
    '/',
    '/pricing',
    '/contact',
    '/terms-conditions',
    '/privacy-policy',
    '/login',
    '/register'
  ];

  const isPublicPage = publicPages.includes(pathname);

  useEffect(() => {
    // If user has a token and we're on the client side, fetch their data
    if (typeof window !== 'undefined' && token) {
      fetchCurrentUser();
    }
  }, [token, fetchCurrentUser]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          defaultTheme="light"
          storageKey="ai-lesson-maker-theme"
        >
          <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
            <AppHeader />
            <main className="flex-1">
              {children}
            </main>
            {/* Show footer on public pages OR for non-authenticated users */}
            {(isPublicPage || !isAuthenticated) && <Footer />}
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
