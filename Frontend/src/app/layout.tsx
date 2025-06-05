'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import '../locales'; // Initialize i18n
import { Layout } from 'antd';
import AppHeader from '../components/AppHeader';
import { useAuthStore } from '../stores';
import { useEffect } from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const { Content, Footer } = Layout;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { token, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    // If user has a token, fetch their data
    if (token) {
      fetchCurrentUser();
    }
  }, [token, fetchCurrentUser]);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Layout style={{ minHeight: '100vh', width: "100vw" }}>
          <AppHeader />
          <Content style={{ padding: '0 50px', marginTop: 20 }}>
            {children}
          </Content>
          <Footer style={{ textAlign: 'center', background: '#f0f0f0' }}>
            AI Lesson Maker ©{new Date().getFullYear()} Created with BootcampsHub
          </Footer>
        </Layout>
      </body>
    </html>
  );
}
