'use client';

import React from 'react';
import LoginForm from '../../components/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <LoginForm />
      </div>
    </div>
  );
}
