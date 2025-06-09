import React, { useState, useEffect } from 'react';
import { 
    BookOpen, 
    Languages, 
    Volume2,
    Play,
    Settings,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Check,
    Loader2
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
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
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [allVoiceList, setAllVoiceList] = useState<VoiceOption[]>([]);
    const [filteredVoiceList, setFilteredVoiceList] = useState<VoiceOption[]>([]);
    const [courseStructure, setCourseStructure] = useState<CourseStructure | null>(null);
    const [languageOpen, setLanguageOpen] = useState(false);
    const [voiceOpen, setVoiceOpen] = useState(false);
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
        setIsLoadingVoices(true);
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
        } finally {
            setIsLoadingVoices(false);
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
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Progress Steps */}
            <div className="w-full">
                <div className="flex items-center justify-between mb-6">
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
                <Card className="w-full backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
                    <CardHeader className="pb-6">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                                <Settings className="w-5 h-5 text-white" />
                            </div>
                            Course Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleFormSubmit} className="space-y-8">
                            {/* Course Topic */}
                            <div className="space-y-3">
                                <Label htmlFor="prompt" className="text-base font-semibold flex items-center gap-2">
                                    <div className="p-1 bg-gradient-to-br from-green-500 to-emerald-600 rounded">
                                        <BookOpen className="w-3 h-3 text-white" />
                                    </div>
                                    Course Topic *
                                </Label>
                                <Textarea
                                    id="prompt"
                                    value={formData.prompt}
                                    onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                                    placeholder="Describe what you want to teach in this course. Be specific about the topics, target audience, and learning objectives..."
                                    rows={4}
                                    className="resize-none bg-background/50 border-border/70 focus:border-primary/50 transition-all duration-200"
                                    required
                                />
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-muted-foreground">
                                        {formData.prompt.length}/1000 characters (minimum 10 required)
                                    </p>
                                    {formData.prompt.length >= 10 && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                            ✓ Valid
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Language and Voice */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <div className="p-1 bg-gradient-to-br from-purple-500 to-pink-600 rounded">
                                        <Languages className="w-3 h-3 text-white" />
                                    </div>
                                    Language & Voice Settings
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Language Combobox */}
                                    <div className="space-y-3">
                                        <Label className="text-base font-medium flex items-center gap-2">
                                            <Languages className="w-4 h-4 text-blue-600" />
                                            Language *
                                        </Label>
                                        {isLoadingVoices ? (
                                            <div className="h-10 px-3 py-2 border border-border rounded-md bg-background/80 flex items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                                Loading languages...
                                            </div>
                                        ) : (
                                            <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={languageOpen}
                                                        className="w-full justify-between bg-background/80 dark:bg-card/80 border-border/70 text-left font-normal h-11 hover:border-primary/50 transition-all duration-200"
                                                    >
                                                        {formData.language ? formData.language : "Select language..."}
                                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                                    <Command className="rounded-lg border border-border">
                                                        <CommandInput placeholder="Search languages..." className="h-9" />
                                                        <CommandList>
                                                            <CommandEmpty>No language found.</CommandEmpty>
                                                            <CommandGroup className="max-h-[200px] overflow-auto">
                                                                {getUniqueLanguageList(allVoiceList).map((language) => (
                                                                    <CommandItem
                                                                        key={language}
                                                                        value={language}
                                                                        onSelect={(currentValue) => {
                                                                            handleLanguageChange(currentValue);
                                                                            setLanguageOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={`mr-2 h-4 w-4 ${
                                                                                formData.language === language ? "opacity-100" : "opacity-0"
                                                                            }`}
                                                                        />
                                                                        {language}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    </div>

                                    {/* Voice Combobox */}
                                    <div className="space-y-3">
                                        <Label className="text-base font-medium flex items-center gap-2">
                                            <Volume2 className="w-4 h-4 text-indigo-600" />
                                            Voice *
                                        </Label>
                                        {isLoadingVoices ? (
                                            <div className="h-10 px-3 py-2 border border-border rounded-md bg-background/80 flex items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                                Loading voices...
                                            </div>
                                        ) : (
                                            <Popover open={voiceOpen} onOpenChange={setVoiceOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={voiceOpen}
                                                        className="w-full justify-between bg-background/80 dark:bg-card/80 border-border/70 text-left font-normal h-11 hover:border-primary/50 transition-all duration-200"
                                                        disabled={!formData.language}
                                                    >
                                                        {formData.voice ? filteredVoiceList.find((voice) => voice.name === formData.voice)?.displayName : "Select voice..."}
                                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                                    <Command className="rounded-lg border border-border">
                                                        <CommandInput placeholder="Search voices..." className="h-9" />
                                                        <CommandList>
                                                            <CommandEmpty>
                                                                {filteredVoiceList.length === 0 ? "Select a language first." : "No voice found."}
                                                            </CommandEmpty>
                                                            <CommandGroup className="max-h-[200px] overflow-auto">
                                                                {filteredVoiceList.map((voice) => (
                                                                    <CommandItem
                                                                        key={voice.name}
                                                                        value={`${voice.displayName} ${voice.gender}`}
                                                                        onSelect={() => {
                                                                            setFormData(prev => ({ ...prev, voice: voice.name }));
                                                                            setVoiceOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={`mr-2 h-4 w-4 ${
                                                                                formData.voice === voice.name ? "opacity-100" : "opacity-0"
                                                                            }`}
                                                                        />
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge variant="secondary" className="text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 dark:from-blue-900 dark:to-indigo-900 dark:text-blue-300">
                                                                                {voice.gender}
                                                                            </Badge>
                                                                            <span className="truncate">{voice.displayName}</span>
                                                                        </div>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Course Structure Settings */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <div className="p-1 bg-gradient-to-br from-orange-500 to-red-600 rounded">
                                        <Settings className="w-3 h-3 text-white" />
                                    </div>
                                    Course Structure
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-3">
                                        <Label className="text-base font-medium">
                                            Number of Chapters *
                                        </Label>
                                        <Select 
                                            value={formData.chapters.toString()} 
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, chapters: parseInt(value) }))}
                                        >
                                            <SelectTrigger className="bg-background/80 border-border/70 hover:border-primary/50 transition-all duration-200">
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

                                    <div className="space-y-3">
                                        <Label className="text-base font-medium">
                                            Lessons per Chapter
                                        </Label>
                                        <Select 
                                            value={formData.lessonsPerChapter?.toString() || '3'} 
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, lessonsPerChapter: parseInt(value) }))}
                                        >
                                            <SelectTrigger className="bg-background/80 border-border/70 hover:border-primary/50 transition-all duration-200">
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

                                    <div className="space-y-3">
                                        <Label className="text-base font-medium">
                                            Difficulty Level
                                        </Label>
                                        <Select 
                                            value={formData.difficultyLevel || 'intermediate'} 
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, difficultyLevel: value }))}
                                        >
                                            <SelectTrigger className="bg-background/80 border-border/70 hover:border-primary/50 transition-all duration-200">
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
                            </div>

                            <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-4">
                                <Button 
                                    type="submit" 
                                    size="lg"
                                    disabled={isGenerating || !formData.prompt || formData.prompt.length < 10 || !formData.language || !formData.voice}
                                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 min-w-[200px]"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
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
                                    className="flex items-center gap-2 backdrop-blur-sm bg-background/80 border-border/50 hover:bg-background/90 transition-all duration-200"
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
