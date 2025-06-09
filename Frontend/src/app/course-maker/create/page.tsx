'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CreateCourse from '../../../components/CreateCourse';

// shadcn/ui components
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';

const CreateCoursePage: React.FC = () => {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-background to-blue-50 dark:from-background dark:via-background dark:to-background relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
            </div>

            <div className="relative z-10 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6">
                        <Button 
                            variant="outline"
                            onClick={() => router.push('/course-maker')}
                            className="flex items-center gap-2 backdrop-blur-sm bg-background/80 border-border/50 hover:bg-background/90 transition-all duration-200"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Course List
                        </Button>
                    </div>
                    
                    <CreateCourse />
                </div>
            </div>
        </div>
    );
};

export default CreateCoursePage;
