'use client';

import React from 'react';
import Link from 'next/link';
import StoryForm from '../../components/LessonForm';
import VideoResult from '../../components/VideoResult';
import { Button } from '../../components/ui/button';
import { List, ArrowLeft, Sparkles, Video, Wand2, PlayCircle, Stars, Zap } from 'lucide-react';

export default function LessonFormPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-background to-blue-50 dark:from-background dark:via-background dark:to-background relative overflow-hidden">
     

            {/* Enhanced fixed sidebar for StoryForm */}
            <div className="fixed left-0 top-16 w-[580px] bg-background/95 dark:bg-card/95 backdrop-blur-3xl border-r border-border shadow-2xl z-10 h-[calc(100vh-64px)] overflow-hidden">
         
                
                {/* Floating design elements */}
                <div className="absolute top-10 right-8 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-20 left-8 w-16 h-16 bg-gradient-to-br from-purple-400/10 to-pink-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
                
                <div className="relative z-10 h-full">
                    <StoryForm />
                </div>
            </div>
            
            {/* Main content area */}
            <div className="flex-1 w-[calc(100%-580px)] ml-[580px] min-h-[calc(100vh-64px)]">
                {/* Beautiful enhanced header with glass morphism */}
                <div className="relative overflow-hidden border-b border-border backdrop-blur-sm">
                    {/* Multi-layered gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 to-cyan-500/15"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/60 dark:via-card/20 dark:to-card/60"></div>
                    
                    {/* Animated floating elements */}
                    <div className="absolute top-4 right-20 w-24 h-24 bg-gradient-to-br from-blue-400/15 to-indigo-500/15 rounded-full blur-2xl animate-bounce delay-300"></div>
                    <div className="absolute bottom-2 right-40 w-16 h-16 bg-gradient-to-br from-purple-400/15 to-pink-500/15 rounded-full blur-2xl animate-bounce delay-700"></div>
                    
                    <div className="relative p-10 backdrop-blur-sm">
                     
                        
                        {/* Enhanced beautiful feature highlights */}
                        <div className="flex items-center gap-5 text-sm">
                            <div className="flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-green-100/90 to-emerald-100/90 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl border border-green-200/70 dark:border-green-700/50 shadow-lg backdrop-blur-sm">
                                <PlayCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                <span className="font-semibold text-green-700 dark:text-green-300">Real-time Generation</span>
                            </div>
                            <div className="flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-purple-100/90 to-violet-100/90 dark:from-purple-900/30 dark:to-violet-900/30 rounded-2xl border border-purple-200/70 dark:border-purple-700/50 shadow-lg backdrop-blur-sm">
                                <Video className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                <span className="font-semibold text-purple-700 dark:text-purple-300">4K HD Quality</span>
                            </div>
                            <div className="flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-blue-100/90 to-sky-100/90 dark:from-blue-900/30 dark:to-sky-900/30 rounded-2xl border border-blue-200/70 dark:border-blue-700/50 shadow-lg backdrop-blur-sm">
                                <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <span className="font-semibold text-blue-700 dark:text-blue-300">AI-Powered Content</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main content with stunning enhanced background */}
                <div className="relative min-h-[calc(100vh-240px)]">
                    {/* Enhanced sophisticated geometric pattern overlay */}
                    <div className="absolute inset-0 opacity-50" style={{
                        backgroundImage: `
                            radial-gradient(circle at 15% 15%, rgba(99, 102, 241, 0.12) 0%, transparent 50%),
                            radial-gradient(circle at 85% 85%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
                            radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
                            radial-gradient(circle at 30% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 50%),
                            linear-gradient(45deg, rgba(99, 102, 241, 0.04) 25%, transparent 25%),
                            linear-gradient(-45deg, rgba(139, 92, 246, 0.04) 25%, transparent 25%)
                        `,
                        backgroundSize: '500px 500px, 500px 500px, 400px 400px, 350px 350px, 80px 80px, 80px 80px'
                    }}></div>
                    
                    {/* Beautiful floating decoration elements */}
                    <div className="absolute top-16 right-16 w-40 h-40 bg-gradient-to-br from-blue-400/15 to-indigo-500/15 rounded-full blur-2xl animate-pulse delay-300"></div>
                    <div className="absolute bottom-32 right-32 w-32 h-32 bg-gradient-to-br from-purple-400/15 to-pink-500/15 rounded-full blur-2xl animate-pulse delay-700"></div>
                    <div className="absolute top-40 right-60 w-24 h-24 bg-gradient-to-br from-cyan-400/15 to-teal-500/15 rounded-full blur-2xl animate-pulse delay-1000"></div>
                    
                    <div className="relative z-10 p-10">
                        {/* Enhanced welcome message card with glass morphism */}
                        <div className="mb-10 p-8 bg-gradient-to-br from-background/90 via-card/95 to-background/85 dark:from-card/90 dark:via-background/95 dark:to-card/85 rounded-3xl border border-border">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl shadow-xl">
                                    <Video className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">
                                        Ready to Create Amazing Lessons?
                                    </h2>
                                    <p className="text-muted-foreground text-base leading-relaxed max-w-2xl">
                                        Fill out the comprehensive form on the left to generate your AI-powered video lesson. 
                                        Your stunning results will appear here in real-time.
                                    </p>
                                    <div className="flex items-center gap-4 mt-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            <span>AI Ready</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-300"></div>
                                            <span>High Quality Output</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <VideoResult />
                    </div>
                </div>
            </div>
        </div>
    );
}
