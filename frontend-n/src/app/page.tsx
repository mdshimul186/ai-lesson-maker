'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Video, 
    Book, 
    Rocket,
    User,
    CheckCircle,
    Clock,
    Star,
    Globe
} from 'lucide-react';
import { useAuthStore } from '@/stores';

export default function Home() {
    const router = useRouter();
    const { isAuthenticated, isLoading, token } = useAuthStore();

    useEffect(() => {
        // If user is authenticated, redirect to dashboard
        if (isAuthenticated && !isLoading) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, isLoading, router]);

    // Show loading while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div>Loading...</div>
            </div>
        );
    }

    // If user is authenticated, don't show landing page content (redirect will happen)
    if (isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="text-center py-16 px-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-b-[20px] text-white">
                <h1 className="text-5xl font-bold mb-4">
                    AI Lesson Maker
                </h1>
                <p className="text-xl max-w-3xl mx-auto mb-8">
                    Transform your content into engaging video lessons in minutes with AI-powered educational tools
                </p>
                <div className="flex gap-4 justify-center">
                    <Button 
                        onClick={() => router.push('/login')}
                        className="bg-white text-blue-500 hover:bg-gray-100 font-bold h-12 px-8"
                    >
                        Log In
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={() => router.push('/register')}
                        className="border-white text-white hover:bg-white hover:text-blue-500 font-bold h-12 px-8"
                    >
                        Sign Up
                    </Button>
                </div>
            </div>

            {/* Features Section */}
            <div className="py-16 px-5">
                <h2 className="text-3xl font-bold text-center mb-12">
                    Powerful AI Tools for Educators
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    <Card className="h-full text-center">
                        <CardHeader>
                            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                <Video className="w-8 h-8 text-blue-600" />
                            </div>
                            <CardTitle>AI Video Lessons</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600">
                                Convert text content into engaging video lessons with AI-generated narration and visuals
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="h-full text-center">
                        <CardHeader>
                            <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                <Book className="w-8 h-8 text-green-600" />
                            </div>
                            <CardTitle>Course Builder</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600">
                                Create comprehensive courses with multiple lessons and structured learning paths
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="h-full text-center">
                        <CardHeader>
                            <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                <Rocket className="w-8 h-8 text-purple-600" />
                            </div>
                            <CardTitle>Animated Lessons</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600">
                                Create interactive animated lessons with typing effects and visual elements
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Benefits Section */}
            <div className="py-16 px-5 bg-white">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        Why Choose AI Lesson Maker?
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex gap-4">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Save Time</h3>
                                <p className="text-gray-600">
                                    Create professional lessons in minutes, not hours
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Fast Processing</h3>
                                <p className="text-gray-600">
                                    AI-powered generation delivers results quickly
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <Star className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">High Quality</h3>
                                <p className="text-gray-600">
                                    Professional-grade output suitable for any audience
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <Globe className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Multi-language</h3>
                                <p className="text-gray-600">
                                    Support for multiple languages and voices
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="py-16 px-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center">
                <h2 className="text-3xl font-bold mb-4">
                    Ready to Transform Your Teaching?
                </h2>
                <p className="text-xl mb-8 max-w-2xl mx-auto">
                    Join thousands of educators who are already creating amazing content with AI Lesson Maker
                </p>
                <Button 
                    onClick={() => router.push('/register')}
                    className="bg-white text-blue-600 hover:bg-gray-100 font-bold h-12 px-8"
                >
                    Get Started Free
                </Button>
            </div>
        </div>
    );
}
