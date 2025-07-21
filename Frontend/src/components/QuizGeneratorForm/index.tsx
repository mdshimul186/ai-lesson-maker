import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createQuizTask, getTaskStatus, cancelTask, QuizGenerateRequest } from '../../services';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Task } from '../../interfaces';
import { X } from 'lucide-react';

const formSchema = z.object({
    content: z.string().min(10, "Content must be at least 10 characters"),
    num_questions: z.number().min(1).max(50),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    language: z.string().min(1, "Language is required"),
    topic: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const QuizGeneratorForm: React.FC = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const [taskStatus, setTaskStatus] = useState<Task | null>(null);
    const [quizResult, setQuizResult] = useState<any>(null);
    const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            content: '',
            num_questions: 5,
            difficulty: 'medium',
            language: 'English',
            topic: '',
        }
    });

    const startPolling = (taskId: string) => {
        setCurrentTaskId(taskId);
        const interval = setInterval(async () => {
            try {
                const status = await getTaskStatus(taskId);
                setTaskStatus(status);

                if (status.status === 'COMPLETED') {
                    clearInterval(interval);
                    setPollInterval(null);
                    setIsGenerating(false);
                    
                    // Extract quiz result from task
                    if (status.result_url || status.task_folder_content) {
                        setQuizResult(status.task_folder_content || { url: status.result_url });
                    }
                    
                    toast.success('Quiz generated successfully!');
                } else if (status.status === 'FAILED' || status.status === 'CANCELLED') {
                    clearInterval(interval);
                    setPollInterval(null);
                    setIsGenerating(false);
                    if (status.status === 'FAILED') {
                        toast.error(`Quiz generation failed: ${status.error_message}`);
                    } else {
                        toast.info('Quiz generation was cancelled');
                    }
                }
            } catch (error) {
                console.error('Failed to fetch task status:', error);
            }
        }, 2000);
        
        setPollInterval(interval);
    };

    const handleCancelTask = async () => {
        if (!currentTaskId) return;
        
        setIsCancelling(true);
        try {
            const response = await cancelTask(currentTaskId, 'Cancelled by user from Quiz Generator');
            
            if (response.cancelled_count > 0) {
                toast.success('Quiz generation cancelled successfully');
                
                // Clear the polling interval
                if (pollInterval) {
                    clearInterval(pollInterval);
                    setPollInterval(null);
                }
                
                // Reset states
                setIsGenerating(false);
                setCurrentTaskId(null);
                setTaskStatus(null);
            } else {
                toast.error('Failed to cancel task - it may have already completed');
            }
        } catch (error: any) {
            toast.error(error?.message || 'Failed to cancel task');
        } finally {
            setIsCancelling(false);
        }
    };

    const onSubmit = async (values: FormData) => {
        setIsGenerating(true);
        setTaskStatus(null);
        setQuizResult(null);
        
        const taskId = uuidv4();
        const quizRequest: QuizGenerateRequest = {
            task_id: taskId,
            content: values.content,
            num_questions: values.num_questions,
            question_types: ['multiple_choice', 'true_false', 'short_answer'],
            difficulty: values.difficulty,
            language: values.language,
            topic: values.topic || undefined,
        };

        try {
            const response = await createQuizTask(quizRequest);
            
            if (response.task_id) {
                toast.success('Quiz generation started!');
                startPolling(response.task_id);
            } else {
                setIsGenerating(false);
                toast.error('Failed to start quiz generation');
            }
        } catch (error: any) {
            setIsGenerating(false);
            toast.error(error?.message || 'Failed to create quiz task');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Quiz Generator (Task API Example)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Content to Generate Quiz From</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Enter the content you want to create a quiz about..."
                                                rows={6}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="num_questions"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Number of Questions</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    min="1" 
                                                    max="50"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="difficulty"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Difficulty</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select difficulty" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="easy">Easy</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="hard">Hard</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="language"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Language</FormLabel>
                                            <FormControl>
                                                <Input placeholder="English" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="topic"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Topic (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter a specific topic..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button 
                                type="submit" 
                                disabled={isGenerating}
                                className="w-full"
                            >
                                {isGenerating ? "Generating Quiz..." : "Generate Quiz"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Progress Card */}
            {currentTaskId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                Quiz Generation Progress
                                <Badge variant={
                                    taskStatus?.status === 'COMPLETED' ? 'default' :
                                    taskStatus?.status === 'FAILED' ? 'destructive' : 
                                    taskStatus?.status === 'CANCELLED' ? 'secondary' :
                                    'secondary'
                                }>
                                    {taskStatus?.status || 'PENDING'}
                                </Badge>
                            </div>
                            {isGenerating && taskStatus?.status !== 'COMPLETED' && taskStatus?.status !== 'FAILED' && taskStatus?.status !== 'CANCELLED' && (
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={handleCancelTask}
                                    disabled={isCancelling}
                                    className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    {isCancelling ? 'Cancelling...' : 'Cancel'}
                                </Button>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Progress</span>
                                    <span>{taskStatus?.progress || 0}%</span>
                                </div>
                                <Progress value={taskStatus?.progress || 0} />
                            </div>
                            
                            {taskStatus?.events && (
                                <div>
                                    <h4 className="font-medium mb-2">Recent Events:</h4>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                        {taskStatus.events.slice().reverse().map((event, index) => (
                                            <div key={index} className="text-sm p-2 bg-muted rounded">
                                                <p>{event.message}</p>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(event.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Results Card */}
            {quizResult && (
                <Card>
                    <CardHeader>
                        <CardTitle>Generated Quiz</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Quiz generated successfully! You can now download or view the quiz.
                            </p>
                            
                            {/* Display quiz content or download link */}
                            {quizResult.url && (
                                <Button asChild>
                                    <a href={quizResult.url} target="_blank" rel="noopener noreferrer">
                                        Download Quiz
                                    </a>
                                </Button>
                            )}
                            
                            {/* If quiz content is embedded in the response */}
                            {quizResult.questions && (
                                <div className="space-y-3">
                                    <h4 className="font-medium">Preview:</h4>
                                    {quizResult.questions.slice(0, 3).map((question: any, index: number) => (
                                        <div key={index} className="p-3 border rounded">
                                            <p className="font-medium">{index + 1}. {question.question}</p>
                                            {question.options && (
                                                <ul className="mt-2 space-y-1">
                                                    {question.options.map((option: string, optIndex: number) => (
                                                        <li key={optIndex} className="text-sm text-muted-foreground">
                                                            {String.fromCharCode(65 + optIndex)}. {option}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                    {quizResult.questions.length > 3 && (
                                        <p className="text-sm text-muted-foreground">
                                            ... and {quizResult.questions.length - 3} more questions
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default QuizGeneratorForm;
