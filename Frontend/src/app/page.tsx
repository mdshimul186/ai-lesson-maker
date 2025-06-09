'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Video, 
    Book, 
    Rocket,
    User,
    CheckCircle,
    Clock,
    Star,
    Globe,
    Zap,
    Users,
    ArrowRight,
    Play,
    BookOpen,
    PenTool,
    MessageSquare,
    TrendingUp,
    Shield
} from 'lucide-react';
import { useAuthStore } from '@/stores';

export default function Home() {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, isLoading, token } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [typedText, setTypedText] = useState('');
    const fullText = 'AI Lessons';

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        
        let i = 0;
        const typeTimer = setInterval(() => {
            if (i < fullText.length) {
                setTypedText(fullText.slice(0, i + 1));
                i++;
            } else {
                clearInterval(typeTimer);
            }
        }, 150);

        return () => clearInterval(typeTimer);
    }, [mounted]);

    // Remove automatic redirect - let users access landing page even when authenticated
    // useEffect(() => {
    //     if (isAuthenticated && !isLoading && pathname === '/') {
    //         router.push('/dashboard');
    //     }
    // }, [isAuthenticated, isLoading, pathname, router]);

    // Show loading while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div>Loading...</div>
            </div>
        );
    }

    // Allow both authenticated and non-authenticated users to view the landing page
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 dark:from-blue-700 dark:via-purple-700 dark:to-indigo-900"></div>
                <div className="absolute inset-0 bg-black/10"></div>
                
                {/* Animated decorative elements */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-float-delayed"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl animate-float"></div>
                
                <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">
                    <Badge 
                        variant="secondary" 
                        className={`mb-6 text-sm font-medium transition-all duration-1000 ${
                            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                    >
                        🚀 AI-Powered Education Platform
                    </Badge>
                    
                    <h1 className={`text-6xl md:text-7xl lg:text-8xl font-extrabold text-white mb-6 leading-tight transition-all duration-1000 delay-300 ${
                        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}>
                        Create Amazing
                        <span className="block bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                            {typedText}
                            <span className="animate-pulse">|</span>
                        </span>
                    </h1>
                    
                    <p className={`text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8 leading-relaxed transition-all duration-1000 delay-500 ${
                        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                    }`}>
                        Transform your content into engaging video lessons, interactive courses, and animated stories with cutting-edge AI technology.
                    </p>
                    
                    <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 transition-all duration-1000 delay-700 ${
                        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}>
                        <Button 
                            size="lg"
                            onClick={() => router.push(isAuthenticated ? '/dashboard' : '/register')}
                            className="bg-white text-black hover:bg-gray-100 font-bold text-lg px-8 py-4 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-200 hover:shadow-3xl"
                        >
                            {isAuthenticated ? 'Go to Dashboard' : 'Start Creating Free'}
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <Button 
                            size="lg"
                            variant="outline"
                            onClick={() => router.push(isAuthenticated ? '/lesson-maker' : '/login')}
                            className="border border-white/20 text-white bg-white/5 hover:bg-white/15 font-bold text-lg px-8 py-4 rounded-xl backdrop-blur-md hover:border-white/40 transition-all duration-300 hover:shadow-lg hover:shadow-white/10"
                        >
                            <Play className="mr-2 w-5 h-5" />
                            {isAuthenticated ? 'Create Lesson' : 'Watch Demo'}
                        </Button>
                    </div>
                    
                    <div className={`flex flex-wrap justify-center items-center gap-8 text-white/80 transition-all duration-1000 delay-1000 ${
                        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                    }`}>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span>No Credit Card Required</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span>Free Forever Plan</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span>10,000+ Happy Educators</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-16 px-6 bg-background opacity-100 translate-y-0 transition-all duration-1000">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4">
                            Features
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                            Everything you need to create
                            <span className="block text-blue-600 dark:text-blue-400">amazing educational content</span>
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                            Our AI-powered platform provides all the tools you need to transform your ideas into engaging learning experiences.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-blue-200 dark:hover:border-blue-800">
                            <CardHeader className="text-center pb-4">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Video className="w-10 h-10 text-white" />
                                </div>
                                <CardTitle className="text-xl">AI Video Lessons</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-muted-foreground leading-relaxed">
                                    Convert text content into engaging video lessons with AI-generated narration, visuals, and smooth animations.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-green-200 dark:hover:border-green-800">
                            <CardHeader className="text-center pb-4">
                                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <BookOpen className="w-10 h-10 text-white" />
                                </div>
                                <CardTitle className="text-xl">Course Builder</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-muted-foreground leading-relaxed">
                                    Create comprehensive courses with multiple lessons, quizzes, and structured learning paths for your students.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-purple-200 dark:hover:border-purple-800">
                            <CardHeader className="text-center pb-4">
                                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Rocket className="w-10 h-10 text-white" />
                                </div>
                                <CardTitle className="text-xl">Animated Lessons</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-muted-foreground leading-relaxed">
                                    Create interactive animated lessons with typing effects, visual elements, and engaging storytelling.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-orange-200 dark:hover:border-orange-800">
                            <CardHeader className="text-center pb-4">
                                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <MessageSquare className="w-10 h-10 text-white" />
                                </div>
                                <CardTitle className="text-xl">AI Voice Generation</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-muted-foreground leading-relaxed">
                                    Generate natural-sounding voiceovers in multiple languages with our advanced AI voice technology.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-pink-200 dark:hover:border-pink-800">
                            <CardHeader className="text-center pb-4">
                                <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <PenTool className="w-10 h-10 text-white" />
                                </div>
                                <CardTitle className="text-xl">Smart Content Creation</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-muted-foreground leading-relaxed">
                                    Let AI help you create lesson content, generate ideas, and structure your educational materials efficiently.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-indigo-200 dark:hover:border-indigo-800">
                            <CardHeader className="text-center pb-4">
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <TrendingUp className="w-10 h-10 text-white" />
                                </div>
                                <CardTitle className="text-xl">Analytics & Insights</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-muted-foreground leading-relaxed">
                                    Track student engagement, monitor progress, and get insights to improve your teaching effectiveness.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-16 px-6 bg-muted/30 opacity-100 translate-y-0 transition-all duration-1000">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4">
                            How It Works
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                            Create lessons in
                            <span className="block text-blue-600 dark:text-blue-400">3 simple steps</span>
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                            Our intuitive platform makes it easy for anyone to create professional educational content.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="text-center group">
                            <div className="relative mb-8">
                                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-xl">
                                    <span className="text-3xl font-bold text-white">1</span>
                                </div>
                                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-px h-16 bg-gradient-to-b from-blue-500 to-transparent lg:hidden"></div>
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Input Your Content</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Simply paste your text, upload documents, or describe what you want to teach. Our AI understands your content.
                            </p>
                        </div>

                        <div className="text-center group">
                            <div className="relative mb-8">
                                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-xl">
                                    <span className="text-3xl font-bold text-white">2</span>
                                </div>
                                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-px h-16 bg-gradient-to-b from-green-500 to-transparent lg:hidden"></div>
                            </div>
                            <h3 className="text-2xl font-bold mb-4">AI Magic Happens</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Our advanced AI processes your content, generates visuals, creates voiceovers, and structures your lesson.
                            </p>
                        </div>

                        <div className="text-center group">
                            <div className="relative mb-8">
                                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-xl">
                                    <span className="text-3xl font-bold text-white">3</span>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Share & Teach</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Download your lesson, share it with students, or publish it online. Start teaching immediately!
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section id="benefits" className="py-16 px-6 bg-background opacity-100 translate-y-0 transition-all duration-1000">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4">
                            Benefits
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                            Why educators
                            <span className="block text-blue-600 dark:text-blue-400">choose our platform</span>
                        </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="text-center group">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">10x Faster</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Create professional lessons in minutes, not hours or days
                            </p>
                        </div>

                        <div className="text-center group">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Clock className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Always Available</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                24/7 AI-powered generation delivers results whenever you need them
                            </p>
                        </div>

                        <div className="text-center group">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Star className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Premium Quality</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Professional-grade output suitable for any audience or institution
                            </p>
                        </div>

                        <div className="text-center group">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Globe className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Global Reach</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Support for 50+ languages and diverse voice options
                            </p>
                        </div>
                    </div>
                    
                    <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h3 className="text-3xl font-bold mb-6">Trusted by educators worldwide</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center">
                                        <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">10,000+ Active Users</h4>
                                        <p className="text-muted-foreground">Educators creating amazing content daily</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                                        <Video className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">100,000+ Lessons Created</h4>
                                        <p className="text-muted-foreground">High-quality educational content generated</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center">
                                        <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">99.9% Uptime</h4>
                                        <p className="text-muted-foreground">Reliable service you can count on</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-3xl p-8">
                            <h4 className="text-2xl font-bold mb-4">Ready to get started?</h4>
                            <p className="text-muted-foreground mb-6">
                                Join thousands of educators who are already transforming their teaching with AI.
                            </p>
                            <Button 
                                size="lg"
                                onClick={() => router.push('/register')}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl"
                            >
                                Start Your Free Trial
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="py-16 px-6 bg-muted/30 opacity-100 translate-y-0 transition-all duration-1000">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4">
                            Testimonials
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                            Loved by educators
                            <span className="block text-blue-600 dark:text-blue-400">around the world</span>
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                            See what our users have to say about their experience with AI Lesson Maker.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <Card className="p-6 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>
                            <p className="text-muted-foreground mb-6 leading-relaxed">
                                "AI Lesson Maker has revolutionized how I create content for my students. What used to take me hours now takes minutes, and the quality is outstanding!"
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold">SM</span>
                                </div>
                                <div>
                                    <h4 className="font-bold">Sarah Martinez</h4>
                                    <p className="text-sm text-muted-foreground">High School Teacher</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>
                            <p className="text-muted-foreground mb-6 leading-relaxed">
                                "The AI voice generation is incredibly natural, and my students love the animated lessons. This platform has made remote teaching so much more engaging."
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold">DJ</span>
                                </div>
                                <div>
                                    <h4 className="font-bold">Dr. James Wilson</h4>
                                    <p className="text-sm text-muted-foreground">University Professor</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>
                            <p className="text-muted-foreground mb-6 leading-relaxed">
                                "As a corporate trainer, I need to create content quickly. AI Lesson Maker helps me produce professional training materials in record time."
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold">AL</span>
                                </div>
                                <div>
                                    <h4 className="font-bold">Anna Lee</h4>
                                    <p className="text-sm text-muted-foreground">Corporate Trainer</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section id="cta" className="py-16 px-6 relative overflow-hidden opacity-100 translate-y-0 transition-all duration-1000">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 dark:from-blue-700 dark:via-purple-700 dark:to-indigo-900"></div>
                <div className="absolute inset-0 bg-black/10"></div>
                
                {/* Decorative elements */}
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
                    <Badge variant="secondary" className="mb-6">
                        🎉 Limited Time Offer
                    </Badge>
                    
                    <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                        Ready to Transform
                        <span className="block bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                            Your Teaching?
                        </span>
                    </h2>
                    
                    <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed max-w-3xl mx-auto">
                        Join thousands of educators who are already creating amazing content with AI Lesson Maker. Start your free trial today!
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                        <Button 
                            size="lg"
                            onClick={() => router.push(isAuthenticated ? '/dashboard' : '/register')}
                            className="bg-white text-black hover:bg-gray-100 font-bold text-lg px-8 py-4 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-200"
                        >
                            {isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'}
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <Button 
                            size="lg"
                            variant="outline"
                            onClick={() => router.push('/pricing')}
                            className="border border-white/20 text-white bg-white/5 hover:bg-white/15 font-bold text-lg px-8 py-4 rounded-xl backdrop-blur-md hover:border-white/40 transition-all duration-300 hover:shadow-lg hover:shadow-white/10"
                        >
                            View Pricing
                        </Button>
                    </div>
                    
                    <div className="flex flex-wrap justify-center items-center gap-8 text-white/80">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span>Free 14-day trial</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span>No setup fees</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span>Cancel anytime</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
