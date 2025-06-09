'use client';

import React from 'react';
import CourseMaker from '../../components/CourseMaker';

export default function CourseMakerPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-background to-blue-50 dark:from-background dark:via-background dark:to-background relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center p-8 pt-2">
                <CourseMaker />
            </div>
        </div>
    );
}
