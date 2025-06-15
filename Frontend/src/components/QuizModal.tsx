import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Trophy, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Task } from '../interfaces/index';

interface QuizModalProps {
    task: Task;
    children: React.ReactNode;
}

interface QuizQuestion {
    id: string;
    question: string;
    type: string;
    options: string[];
    correct_answer: string;
    explanation: string;
    difficulty: string;
    points: number;
}

interface QuizData {
    id: string;
    title: string;
    story_prompt: string;
    difficulty: string;
    num_questions: number;
    quiz_type: string;
    language: string;
    questions: QuizQuestion[];
    total_points: number;
    estimated_time_minutes: number;
    created_at: string;
}

const QuizModal: React.FC<QuizModalProps> = ({ task, children }) => {
    const quizData: QuizData | null = task.task_folder_content?.quiz || null;

    if (!quizData) {
        return (
            <Dialog>
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Quiz Not Available</DialogTitle>
                        <DialogDescription>
                            Quiz data is not available for this task.
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );
    }

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    const getQuestionIcon = (index: number) => {
        // Simple alternating icons for visual variety
        const icons = [CheckCircle2, AlertCircle, XCircle, Trophy];
        const IconComponent = icons[index % icons.length];
        return <IconComponent className="h-4 w-4" />;
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                        {quizData.title}
                    </DialogTitle>
                    <DialogDescription>
                        Generated quiz based on the provided story content
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Quiz Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Quiz Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="space-y-1">
                                    <div className="text-muted-foreground">Difficulty</div>
                                    <Badge className={getDifficultyColor(quizData.difficulty)}>
                                        {quizData.difficulty}
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-muted-foreground">Questions</div>
                                    <div className="font-semibold">{quizData.num_questions}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-muted-foreground">Total Points</div>
                                    <div className="font-semibold">{quizData.total_points}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-muted-foreground">Est. Time</div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span className="font-semibold">{quizData.estimated_time_minutes} min</span>
                                    </div>
                                </div>
                            </div>

                            {/* Story Prompt */}
                            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                                <div className="text-sm text-muted-foreground mb-1">Story/Content:</div>
                                <div className="text-sm">{quizData.story_prompt}</div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Questions */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Quiz Questions</h3>
                        {quizData.questions.map((question, index) => (
                            <Card key={question.id}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        {getQuestionIcon(index)}
                                        Question {index + 1}
                                        <Badge variant="outline" className="ml-auto">
                                            {question.points} {question.points === 1 ? 'point' : 'points'}
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="font-medium text-sm">
                                            {question.question}
                                        </div>

                                        {/* Options */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {question.options.map((option, optionIndex) => (
                                                <div
                                                    key={optionIndex}
                                                    className={`p-2 rounded border text-sm ${option === question.correct_answer
                                                            ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200'
                                                            : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                            {String.fromCharCode(65 + optionIndex)}
                                                        </span>
                                                        <span>{option}</span>
                                                        {option === question.correct_answer && (
                                                            <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Explanation */}
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800">
                                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                                                Explanation:
                                            </div>
                                            <div className="text-sm text-blue-800 dark:text-blue-200">
                                                {question.explanation}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Quiz Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Quiz Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span>Total Questions:</span>
                                    <span className="font-semibold">{quizData.questions.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Total Points:</span>
                                    <span className="font-semibold">{quizData.total_points}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Quiz Type:</span>
                                    <span className="font-semibold capitalize">{quizData.quiz_type.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Language:</span>
                                    <span className="font-semibold">{quizData.language}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Created:</span>
                                    <span className="font-semibold">
                                        {new Date(quizData.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default QuizModal;
