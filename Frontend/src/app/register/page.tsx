'use client';

import React from 'react';
import RegisterForm from '../../components/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <RegisterForm />
      </div>
    </div>
  );
}
