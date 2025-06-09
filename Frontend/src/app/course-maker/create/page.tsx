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
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 dark:from-background dark:via-background dark:to-card/30 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <Button 
                        variant="outline"
                        onClick={() => router.push('/course-maker')}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Course List
                    </Button>
                </div>
                
                <CreateCourse />
            </div>
        </div>
    );
};

export default CreateCoursePage;
