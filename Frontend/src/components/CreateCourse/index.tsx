import React, { useState, useEffect } from 'react';
import { 
    BookOpen, 
    Languages, 
    Volume2,
    Play,
    Settings,
    RotateCcw,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { 
    getVoiceList, 
    generateCourseStructure, 
    CourseGenerateRequest
} from '../../services/index';
import CourseStructureDisplay from '../CourseMaker/CourseStructureDisplay';
import CourseGeneration from '../CourseMaker/CourseGeneration';

// shadcn/ui components
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';

interface VoiceOption {
    displayName: string;
    gender: string;
    language: string;
    name: string;
}

export interface CourseStructure {
    title: string;
    description: string;
    chapters: Chapter[];
}

export interface Chapter {
    id: string;
    title: string;
    description: string;
    lessons: Lesson[];
    order: number;
}

export interface Lesson {
    id: string;
    title: string;
    description: string;
    content: string;
    order: number;
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

const CreateCourse: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [allVoiceList, setAllVoiceList] = useState<VoiceOption[]>([]);
    const [filteredVoiceList, setFilteredVoiceList] = useState<VoiceOption[]>([]);
    const [courseStructure, setCourseStructure] = useState<CourseStructure | null>(null);
    const [formData, setFormData] = useState<CourseFormData>({
        prompt: '',
        language: 'en',
        voice: '',
        chapters: 5,
        lessonsPerChapter: 3,
        difficultyLevel: 'intermediate'
    });

    // Load voices when component mounts
    useEffect(() => {
        fetchVoices();
    }, []);

    const fetchVoices = async () => {
        try {
            const response = await getVoiceList({ area: [] });
            if (response?.voices?.length > 0) {
                setAllVoiceList(response.voices as VoiceOption[]);
                // Set initial language and voice
                const initialLanguage = getUniqueLanguageList(response.voices as VoiceOption[])[0];
                if (initialLanguage) {
                    const filtered = (response.voices as VoiceOption[]).filter(v => v.language === initialLanguage);
                    setFilteredVoiceList(filtered);
                    setFormData(prev => ({
                        ...prev,
                        language: initialLanguage,
                        voice: filtered[0]?.name || ''
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch voices:', error);
            toast.error('Failed to load voice options');
        }
    };

    const getUniqueLanguageList = (voices: VoiceOption[]) => {
        const languageSet = new Set(voices.map(v => v.language));
        return Array.from(languageSet);
    };

    const handleLanguageChange = (language: string) => {
        const filtered = allVoiceList.filter(v => v.language === language);
        setFilteredVoiceList(filtered);
        setFormData(prev => ({
            ...prev,
            language,
            voice: filtered[0]?.name || ''
        }));
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.prompt || formData.prompt.length < 10) {
            toast.error('Please provide more details about your course topic (minimum 10 characters)');
            return;
        }

        setIsGenerating(true);

        try {
            toast.loading('Generating course structure...');
            
            const request: CourseGenerateRequest = {
                prompt: formData.prompt,
                language: formData.language,
                voice_id: formData.voice,
                max_chapters: formData.chapters,
                max_lessons_per_chapter: formData.lessonsPerChapter || 3,
                target_audience: formData.targetAudience || '',
                difficulty_level: formData.difficultyLevel || 'intermediate'
            };

            const response = await generateCourseStructure(request);
            
            if (response && response.chapters) {
                setCourseStructure(response);
                setCurrentStep(1);
                toast.dismiss();
                toast.success('Course structure generated successfully!');
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Error generating course structure:', error);
            toast.dismiss();
            toast.error('Failed to generate course structure. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleBackToForm = () => {
        setCurrentStep(0);
        setCourseStructure(null);
    };

    const handleNext = () => {
        setCurrentStep(2);
    };

    const handleBackToStructure = () => {
        setCurrentStep(1);
    };

    const handleReset = () => {
        setFormData({
            prompt: '',
            language: 'en',
            voice: '',
            chapters: 5,
            lessonsPerChapter: 3,
            difficultyLevel: 'intermediate'
        });
    };

    const steps = [
        {
            title: 'Configuration',
            description: 'Set up course parameters',
            icon: Settings
        },
        {
            title: 'Structure',
            description: 'Review course outline',
            icon: BookOpen
        },
        {
            title: 'Generation',
            description: 'Generate lesson content',
            icon: Play
        }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-foreground">Create New Course</h1>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    Create an engaging educational course with AI-generated content. Configure your course parameters, 
                    review the structure, and generate comprehensive lessons with videos.
                </p>
            </div>

            {/* Progress Steps */}
            <div className="w-full">
                <div className="flex items-center justify-between mb-8">
                    {steps.map((step, index) => {
                        const IconComponent = step.icon;
                        const isActive = index === currentStep;
                        const isCompleted = index < currentStep;
                        
                        return (
                            <div key={index} className="flex items-center">
                                <div className="flex flex-col items-center">
                                    <div className={`
                                        w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200
                                        ${isActive 
                                            ? 'bg-primary border-primary text-primary-foreground' 
                                            : isCompleted 
                                                ? 'bg-green-600 border-green-600 text-white dark:bg-green-500 dark:border-green-500'
                                                : 'bg-muted border-border text-muted-foreground'
                                        }
                                    `}>
                                        <IconComponent className="w-5 h-5" />
                                    </div>
                                    <div className="mt-3 text-center">
                                        <p className={`text-sm font-medium ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            {step.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{step.description}</p>
                                    </div>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`
                                        flex-1 h-0.5 mx-4 transition-all duration-200
                                        ${index < currentStep ? 'bg-green-600 dark:bg-green-500' : 'bg-border'}
                                    `} />
                                )}
                            </div>
                        );
                    })}
                </div>
                <Progress value={(currentStep / (steps.length - 1)) * 100} className="h-2" />
            </div>

            {/* Step Content */}
            {currentStep === 0 && (
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5 text-primary" />
                            Course Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleFormSubmit} className="space-y-6">
                            {/* Course Topic */}
                            <div className="space-y-2">
                                <Label htmlFor="prompt" className="text-base font-medium">
                                    Course Topic *
                                </Label>
                                <Textarea
                                    id="prompt"
                                    value={formData.prompt}
                                    onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                                    placeholder="Describe what you want to teach in this course. Be specific about the topics, target audience, and learning objectives..."
                                    rows={4}
                                    className="resize-none"
                                    required
                                />
                                <p className="text-sm text-muted-foreground">
                                    {formData.prompt.length}/1000 characters (minimum 10 required)
                                </p>
                            </div>

                            {/* Language and Voice */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-base font-medium flex items-center gap-2">
                                        <Languages className="w-4 h-4" />
                                        Language *
                                    </Label>
                                    <Select 
                                        value={formData.language} 
                                        onValueChange={handleLanguageChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getUniqueLanguageList(allVoiceList).map(language => (
                                                <SelectItem key={language} value={language}>
                                                    {language}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-base font-medium flex items-center gap-2">
                                        <Volume2 className="w-4 h-4" />
                                        Voice *
                                    </Label>
                                    <Select 
                                        value={formData.voice} 
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, voice: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select voice" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredVoiceList.map(voice => (
                                                <SelectItem key={voice.name} value={voice.name}>
                                                    <div className="flex items-center gap-2">
                                                        {voice.displayName}
                                                        <Badge variant="secondary" className="text-xs">
                                                            {voice.gender}
                                                        </Badge>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Course Structure Settings */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-base font-medium">
                                        Number of Chapters *
                                    </Label>
                                    <Select 
                                        value={formData.chapters.toString()} 
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, chapters: parseInt(value) }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[3, 4, 5, 6, 7, 8].map(num => (
                                                <SelectItem key={num} value={num.toString()}>
                                                    {num} chapters
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-base font-medium">
                                        Lessons per Chapter
                                    </Label>
                                    <Select 
                                        value={formData.lessonsPerChapter?.toString() || '3'} 
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, lessonsPerChapter: parseInt(value) }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[2, 3, 4, 5].map(num => (
                                                <SelectItem key={num} value={num.toString()}>
                                                    {num} lessons
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-base font-medium">
                                        Difficulty Level
                                    </Label>
                                    <Select 
                                        value={formData.difficultyLevel || 'intermediate'} 
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, difficultyLevel: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="beginner">Beginner</SelectItem>
                                            <SelectItem value="intermediate">Intermediate</SelectItem>
                                            <SelectItem value="advanced">Advanced</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            {/* Action Buttons */}
                            <div className="flex gap-4">
                                <Button 
                                    type="submit" 
                                    size="lg"
                                    disabled={isGenerating}
                                    className="flex items-center gap-2"
                                >
                                    {isGenerating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <BookOpen className="w-4 h-4" />
                                            Generate Course Structure
                                        </>
                                    )}
                                </Button>
                                
                                <Button 
                                    type="button"
                                    variant="outline"
                                    onClick={handleReset}
                                    disabled={isGenerating}
                                    className="flex items-center gap-2"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reset Form
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {currentStep === 1 && courseStructure && formData && (
                <CourseStructureDisplay
                    courseStructure={courseStructure}
                    formData={formData}
                    onBack={handleBackToForm}
                    onNext={handleNext}
                    onStructureUpdate={() => setCurrentStep(0)}
                />
            )}

            {currentStep === 2 && courseStructure && formData && (
                <CourseGeneration
                    courseStructure={courseStructure}
                    formData={formData}
                    onBack={handleBackToStructure}
                />
            )}
        </div>
    );
};

export default CreateCourse;
