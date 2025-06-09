'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Video, 
    Book, 
    History,
    PlayCircle,
    CreditCard,
    Clock,
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAccountStore } from '../../stores';
import { getAllTasks } from '../../services';

export default function DashboardPage() {
    const router = useRouter();
    const { currentAccount } = useAccountStore();
    const [stats, setStats] = useState({
        totalVideos: 0,
        pendingVideos: 0,
        availableCredits: 0,
        loading: true
    });

    // Tool cards data
    const tools = [
        {
            id: 'lesson-maker',
            title: 'AI Lesson Maker',
            description: 'Create engaging video lessons with AI. Convert your text into professional educational videos.',
            icon: <Video className="w-9 h-9 text-blue-500" />,
            path: '/lesson-maker',
            available: true
        },
        {
            id: 'animated-lesson-maker',
            title: 'AI Animated Lesson Maker',
            description: 'Create animated lessons with typing effects, drawing, and other animations right in your browser.',
            icon: <PlayCircle className="w-9 h-9 text-orange-500" />,
            path: '/animated-lesson',
            available: true
        },
        {
            id: 'course-maker',
            title: 'AI Course Maker',
            description: 'Build complete courses with multiple lessons and structured learning paths.',
            icon: <Book className="w-9 h-9 text-green-500" />,
            path: '/courses',
            available: true
        },
        {
            id: 'tasks',
            title: 'Recent Tasks',
            description: 'View and manage your recent content generation tasks.',
            icon: <History className="w-9 h-9 text-purple-500" />,
            path: '/tasks',
            available: true
        }
    ];

    // Fetch user stats on component mount and when currentAccount changes
    useEffect(() => {
        if (currentAccount) {
            console.log('Account changed, fetching stats...');
            fetchStats();
        }
    }, [currentAccount?.id]); // Specifically track currentAccount.id to detect account changes

    // Function to fetch stats
    const fetchStats = async () => {
        setStats(prev => ({ ...prev, loading: true }));
        try {
            // Get actual pending videos count from the tasks API
            const response = await getAllTasks();
            const tasks = response.tasks;
            
            // Count pending, queued, and processing tasks
            const pendingCount = tasks.filter(task => 
                task.status === 'PENDING' || 
                task.status === 'QUEUED' || 
                task.status === 'PROCESSING'
            ).length;
            
            // Count total videos (completed tasks)
            const completedCount = tasks.filter(task => 
                task.status === 'COMPLETED'
            ).length;
            
            setStats({
                totalVideos: completedCount,
                pendingVideos: pendingCount,
                availableCredits: currentAccount?.credits || 0,
                loading: false
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            // Fallback to default values if API call fails
            setStats({
                totalVideos: 0,
                pendingVideos: 0,
                availableCredits: currentAccount?.credits || 0,
                loading: false
            });
        }
    };

    // Function to manually refresh stats
    const refreshStats = async () => {
        setStats(prev => ({ ...prev, loading: true }));
        
        try {
            // Get actual pending videos count from the tasks API
            const response = await getAllTasks();
            const tasks = response.tasks;
            
            // Count pending, queued, and processing tasks
            const pendingCount = tasks.filter(task => 
                task.status === 'PENDING' || 
                task.status === 'QUEUED' || 
                task.status === 'PROCESSING'
            ).length;
            
            // Count total videos (completed tasks)
            const completedCount = tasks.filter(task => 
                task.status === 'COMPLETED'
            ).length;
            
            setStats({
                totalVideos: completedCount,
                pendingVideos: pendingCount,
                availableCredits: currentAccount?.credits || 0,
                loading: false
            });
        } catch (error) {
            console.error('Error refreshing stats:', error);
            setStats(prev => ({ ...prev, loading: false }));
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-6 py-8 max-w-7xl">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground">Welcome to AI Lesson Maker. Select a tool to get started.</p>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="outline"
                                size="sm"
                                onClick={refreshStats} 
                                disabled={stats.loading}
                                className="gap-2"
                            >
                                <RefreshCw className={`h-4 w-4 ${stats.loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Refresh statistics</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            
            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
                        <PlayCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {stats.loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{stats.totalVideos}</div>
                        )}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Videos</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {stats.loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{stats.pendingVideos}</div>
                        )}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {stats.loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{stats.availableCredits}</div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <div className="flex items-center mb-6">
                <h2 className="text-xl font-semibold">Tools</h2>
                <Separator className="ml-4 flex-1" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map(tool => (
                    <Card 
                        key={tool.id}
                        className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-border hover:border-primary/20"
                    >
                        <CardHeader className="text-center">
                            <div className="flex justify-center mb-4">
                                {tool.icon}
                            </div>
                            <CardTitle className="text-lg">{tool.title}</CardTitle>
                            <CardDescription className="text-sm">
                                {tool.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button 
                                className="w-full" 
                                onClick={() => router.push(tool.path)}
                                disabled={!tool.available}
                                variant={tool.available ? "default" : "secondary"}
                            >
                                {tool.available ? 'Launch' : 'Coming Soon'}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
            </div>
        </div>
    );
}
