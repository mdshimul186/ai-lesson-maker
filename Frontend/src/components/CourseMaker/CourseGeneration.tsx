import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    RotateCw,
    Play,
    BookOpen,
    AlertCircle,
    Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createCourse, generateCourseLessons, getCourseProgress, CourseCreateRequest } from '../../services/index';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';

interface Chapter {
    id: string;
    title: string;
    description: string;
    order: number;
    lessons: Lesson[];
}

interface Lesson {
    id: string;
    title: string;
    content: string;
    order: number;
}

interface CourseStructure {
    title: string;
    description: string;
    chapters: Chapter[];
}

interface CourseFormData {
    prompt: string;
    language: string;
    voice: string;
    chapters: number;
    lessonsPerChapter?: number;
    targetAudience?: string;
    difficultyLevel?: string;
}

interface CourseGenerationProps {
    courseStructure: CourseStructure;
    formData: CourseFormData;
    onBack: () => void;
}

interface CourseTask {
    id: string;
    lessonTitle: string;
    chapterTitle: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    taskId?: string;
    resultUrl?: string;
    errorMessage?: string;
}

const CourseGeneration: React.FC<CourseGenerationProps> = ({
    courseStructure,
    formData,
    onBack
}) => {
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [courseTasks, setCourseTasks] = useState<CourseTask[]>([]);
    const [courseId, setCourseId] = useState<string | null>(null);
    const [overallProgress, setOverallProgress] = useState(0);
    const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Initialize course tasks from structure
        const tasks: CourseTask[] = [];
        courseStructure.chapters.forEach((chapter: Chapter) => {
            chapter.lessons.forEach((lesson: Lesson) => {
                tasks.push({
                    id: `${chapter.id}-${lesson.id}`,
                    lessonTitle: lesson.title,
                    chapterTitle: chapter.title,
                    status: 'pending',
                    progress: 0
                });
            });
        });
        setCourseTasks(tasks);

        // Cleanup interval on unmount
        return () => {
            if (progressInterval) {
                clearInterval(progressInterval);
            }
        };
    }, [courseStructure, progressInterval]);

    const handleStartGeneration = async () => {
        setIsGenerating(true);

        try {
            // First, save the course structure to backend
            const loadingToast = toast.loading('Creating course...');

            // Create course using backend API
            const courseCreateRequest: CourseCreateRequest = {
                title: courseStructure.title,
                description: courseStructure.description,
                prompt: formData.prompt,
                language: formData.language,
                voice_id: formData.voice,
                target_audience: formData.targetAudience,
                difficulty_level: formData.difficultyLevel,
                chapters: courseStructure.chapters.map((chapter: Chapter) => ({
                    title: chapter.title,
                    description: chapter.description,
                    order: chapter.order,
                    lessons: chapter.lessons.map((lesson: Lesson) => ({
                        title: lesson.title,
                        content: lesson.content,
                        duration_minutes: 10, // Default duration
                        order: lesson.order
                    }))
                }))
            };

            console.log('Creating course:', courseCreateRequest);
            const createdCourse = await createCourse(courseCreateRequest);
            setCourseId(createdCourse.id);

            toast.dismiss(loadingToast);
            toast.success('Course created successfully! Starting lesson generation...');

            // Start generating lessons using backend API            
            console.log('Generating lessons for course:', createdCourse.id);
            await generateCourseLessons(createdCourse.id);

            // Navigate back to course list after a short delay
            setTimeout(() => {
                router.push('/course-maker');
            }, 2000);

        } catch (error) {
            console.error('Error during course generation:', error);
            toast.error('Failed to start course generation. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'processing':
                return <RotateCw className="w-4 h-4 text-primary animate-spin" />;
            case 'failed':
                return <AlertCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Clock className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'completed':
                return 'default' as const;
            case 'processing':
                return 'secondary' as const;
            case 'failed':
                return 'destructive' as const;
            default:
                return 'outline' as const;
        }
    };

    const completedCount = courseTasks.filter(t => t.status === 'completed').length;
    const failedCount = courseTasks.filter(t => t.status === 'failed').length;
    const processingCount = courseTasks.filter(t => t.status === 'processing').length;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/50 dark:from-background dark:to-card/50">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        <BookOpen className="w-6 h-6 text-primary" />
                        Course Generation
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center space-y-3">
                        <h3 className="text-xl font-semibold text-foreground">
                            {courseStructure.title}
                        </h3>
                        <p className="text-muted-foreground">
                            Ready to generate {courseTasks.length} video lessons across {courseStructure.chapters.length} chapters
                        </p>
                    </div>

                    {!isGenerating && overallProgress === 0 && (
                        <Alert className="border-primary/30 bg-primary/5">
                            <Info className="h-4 w-4 text-primary" />
                            <AlertDescription className="text-primary">
                                Ready to Generate Course - Click the button below to start generating all lessons in this course. Each lesson will be created as a separate task that you can track in the Tasks page.
                            </AlertDescription>
                        </Alert>
                    )}

                    {(isGenerating || overallProgress > 0) && (
                        <div className="space-y-4 p-6 bg-gradient-to-r from-muted to-muted/80 dark:from-card dark:to-card/80 rounded-lg border">
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-5 h-5 text-primary" />
                                <h4 className="text-lg font-semibold text-foreground">
                                    {overallProgress === 100 ? 'Course Generation Complete!' : 'Generating Course...'}
                                </h4>
                            </div>
                            <Progress 
                                value={overallProgress} 
                                className="h-2"
                            />
                            <p className="text-sm text-muted-foreground">
                                {completedCount} completed, {processingCount} processing, {failedCount} failed
                            </p>
                        </div>
                    )}

                    {courseTasks.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-foreground border-b pb-2">
                                Lesson Generation Progress
                            </h4>
                            <div className="space-y-3">
                                {courseTasks.map((task) => (
                                    <Card key={task.id} className="border border-border hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex-1">
                                                    <h5 className="font-medium text-foreground">
                                                        {task.lessonTitle}
                                                    </h5>
                                                    <p className="text-sm text-muted-foreground">{task.chapterTitle}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(task.status)}
                                                    <Badge variant={getStatusBadgeVariant(task.status)}>
                                                        {task.status.toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {task.status === 'processing' && (
                                                <Progress 
                                                    value={task.progress} 
                                                    className="h-1"
                                                />
                                            )}

                                            {task.status === 'completed' && task.resultUrl && (
                                                <div className="mt-3">
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        className="p-0 h-auto text-primary hover:text-primary"
                                                        onClick={() => window.open(task.resultUrl, '_blank')}
                                                    >
                                                        <Play className="w-3 h-3 mr-1" />
                                                        View Video
                                                    </Button>
                                                </div>
                                            )}

                                            {task.status === 'failed' && task.errorMessage && (
                                                <Alert className="mt-3 border-red-200 bg-red-50">
                                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                                    <AlertDescription className="text-red-800">
                                                        {task.errorMessage}
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="border-t pt-6">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="outline"
                                onClick={onBack}
                                disabled={isGenerating}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Structure
                            </Button>

                            <div className="flex items-center gap-3">
                                {!isGenerating && overallProgress === 0 && (
                                    <Button
                                        onClick={handleStartGeneration}
                                        className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg"
                                        size="lg"
                                    >
                                        <BookOpen className="w-4 h-4 mr-2" />
                                        Generate All Lessons
                                    </Button>
                                )}
                                
                                {overallProgress === 100 && (
                                    <>
                                        <Button
                                            onClick={() => router.push('/course-maker')}
                                            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                                        >
                                            Back to Course List
                                        </Button>
                                        {courseId && (
                                            <Button
                                                variant="outline"
                                                onClick={() => router.push(`/course/${courseId}`)}
                                            >
                                                View Course
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CourseGeneration;
