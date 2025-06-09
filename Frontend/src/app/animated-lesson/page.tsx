'use client';

import React from 'react';
import Link from 'next/link';
import AnimatedLessonForm from '../../components/AnimatedLessonForm';
import DivLessonRenderer from '../../components/DivLessonRenderer';
import { List, ArrowLeft } from 'lucide-react';
import { useVideoStore } from '../../stores';
import { Button } from '../../components/ui/button';

export default function AnimatedLessonMakerPage() {
    const { taskStatus, isLoading } = useVideoStore();
    
    return (
        <div className="flex w-full h-screen">
            {/* Left Panel - Form */}
            <div className="fixed left-0 top-16 w-[500px] bg-background border-r shadow-lg z-10 h-[calc(100vh-4rem)] overflow-hidden">
                <AnimatedLessonForm />
            </div>
            
            {/* Right Panel - Renderer */}
            <div className="flex-1 ml-[500px] h-[calc(100vh-4rem)] overflow-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-card border-b border-border">
                    <Link href="/dashboard">
                        <Button variant="outline" className="flex items-center space-x-2">
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Dashboard</span>
                        </Button>
                    </Link>
                    <Link href="/tasks">
                        <Button className="flex items-center space-x-2">
                            <List className="w-4 h-4" />
                            <span>View All Tasks</span>
                        </Button>
                    </Link>
                </div>
                
                {/* Content */}
                <DivLessonRenderer 
                    sections={taskStatus?.task_folder_content?.content || []} 
                    isLoading={isLoading} 
                />
            </div>
        </div>
    );
}
