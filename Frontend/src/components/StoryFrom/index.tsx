import React, { useState, useEffect, useRef } from 'react';
import {
    Play,
    Languages,
    Highlighter,
    Settings,
    Image as ImageIcon,
    Monitor,
    Smartphone,
    Square,
    Upload,
    Video,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Wand2,
    Volume2,
    ChevronDown,
    Check,
    Palette,
    Sparkles,
    Eye
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getVoiceList, generateVideo, uploadFile, getTaskStatus, VideoGenerateReq, TaskEvent } from '../../services/index';
import { v4 as uuidv4 } from 'uuid';
import styles from './index.module.css';
import { useVideoStore, useAccountStore } from "../../stores/index";
import { Task } from '../../interfaces';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
    resolution: z.string().optional(),
    segments: z.number().min(1).max(50),
    language: z.string().min(1, "Language is required"),
    story_prompt: z.string().min(1, "Story prompt is required"),
    voice_name: z.string().min(1, "Voice name is required"),
    include_subtitles: z.boolean(),
    visual_content_in_language: z.boolean(),
    theme: z.string().optional(),
    logo_url: z.string().optional(),
    intro_video_url: z.string().optional(),
    outro_video_url: z.string().optional(),
});

type FieldType = z.infer<typeof formSchema>;

type voiceList = {
    displayName: string;
    gender: string;
    language: string;
    name: string;
};

const getUniqueLanguageList = (list: voiceList[]) => {
    const uniqueLanguageList = list.reduce((acc: string[], item: voiceList) => {
        if (!acc.includes(item.language)) {
            acc.push(item.language);
        }
        return acc;
    }, []);
    return uniqueLanguageList;
};

const resolutionOptions = [
    {
        type: 'landscape',
        icon: <Monitor className="h-4 w-4" />,
        label: 'Landscape',
        options: [
            { value: '1280*720', label: 'HD (1280×720)', quality: 'HD' },
            { value: '1920*1080', label: 'Full HD (1920×1080)', quality: 'FHD' },
        ]
    },
    {
        type: 'portrait',
        icon: <Smartphone className="h-4 w-4" />,
        label: 'Portrait',
        options: [
            { value: '720*1280', label: 'HD (720×1280)', quality: 'HD' },
            { value: '1080*1920', label: 'Full HD (1080×1920)', quality: 'FHD' },
        ]
    },
    {
        type: 'square',
        icon: <Square className="h-4 w-4" />,
        label: 'Square',
        options: [
            { value: '720*720', label: 'HD (720×720)', quality: 'HD' },
            { value: '1080*1080', label: 'HD (1080×1080)', quality: 'HD' },
        ]
    }
];

const themeOptions = [
    {
        id: 'modern',
        name: 'Modern',
        description: 'Clean, minimalist design with contemporary typography',
        colors: {
            primary: '#3B82F6',
            secondary: '#E5E7EB',
            accent: '#F59E0B',
            background: '#FFFFFF'
        },
        preview: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 50%, #1E40AF 100%)'
    },
    {
        id: 'professional',
        name: 'Professional',
        description: 'Corporate-friendly with dark blues and subtle gradients',
        colors: {
            primary: '#1E40AF',
            secondary: '#F8FAFC',
            accent: '#059669',
            background: '#FFFFFF'
        },
        preview: 'linear-gradient(135deg, #1E40AF 0%, #1E3A8A 50%, #312E81 100%)'
    },
    {
        id: 'creative',
        name: 'Creative',
        description: 'Vibrant colors and dynamic layouts for engaging content',
        colors: {
            primary: '#7C3AED',
            secondary: '#FEF3C7',
            accent: '#F59E0B',
            background: '#FEFEFE'
        },
        preview: 'linear-gradient(135deg, #7C3AED 0%, #C026D3 50%, #EC4899 100%)'
    },
    {
        id: 'education',
        name: 'Education',
        description: 'Friendly and approachable design perfect for learning',
        colors: {
            primary: '#059669',
            secondary: '#DBEAFE',
            accent: '#DC2626',
            background: '#FFFFFF'
        },
        preview: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065F46 100%)'
    },
    {
        id: 'tech',
        name: 'Tech',
        description: 'Futuristic design with dark themes and neon accents',
        colors: {
            primary: '#6366F1',
            secondary: '#111827',
            accent: '#10B981',
            background: '#000000'
        },
        preview: 'linear-gradient(135deg, #111827 0%, #374151 50%, #6366F1 100%)'
    },
    {
        id: 'warm',
        name: 'Warm',
        description: 'Cozy and inviting with earth tones and soft gradients',
        colors: {
            primary: '#DC2626',
            secondary: '#FEF2F2',
            accent: '#F59E0B',
            background: '#FFFBEB'
        },
        preview: 'linear-gradient(135deg, #DC2626 0%, #EA580C 50%, #F59E0B 100%)'
    }
];

const App: React.FC = () => {
    const { setVideoUrl, setLoading, setError, videoUrl, setTaskStatus, taskStatus } = useVideoStore();
    const { refreshAccountData } = useAccountStore();
    const { t } = useTranslation();
    const form = useForm<FieldType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            resolution: '1280*720',
            segments: 5,
            language: '',
            story_prompt: '',
            voice_name: '',
            include_subtitles: true,
            visual_content_in_language: true,
            theme: 'modern',
            logo_url: undefined,
            intro_video_url: undefined,
            outro_video_url: undefined,
        }
    });
    
    const [allVoiceList, setAllVoiceList] = useState<voiceList[]>([]);
    const [nowVoiceList, setNowVoiceList] = useState<voiceList[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [resolutionType, setResolutionType] = useState('landscape');
    const [selectedResolution, setSelectedResolution] = useState('1280*720');
    const [selectedTheme, setSelectedTheme] = useState('modern');
    const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
    const [introVideoUrl, setIntroVideoUrl] = useState<string | undefined>(undefined);
    const [outroVideoUrl, setOutroVideoUrl] = useState<string | undefined>(undefined);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingIntro, setUploadingIntro] = useState(false);
    const [uploadingOutro, setUploadingOutro] = useState(false);

    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const [languageOpen, setLanguageOpen] = useState(false);
    const [voiceOpen, setVoiceOpen] = useState(false);
    const pollingIntervalIdRef = useRef<number | null>(null);

    useEffect(() => {
        getVoiceList({ area: [] }).then(res => {
            if (res?.voices?.length > 0) {
                setAllVoiceList(res?.voices as any[]);
            }
        }).catch(err => {
            console.log(err);
            toast.error("Failed to load voice list.");
        });

        return () => {
            if (pollingIntervalIdRef.current) {
                clearInterval(pollingIntervalIdRef.current);
            }
        };
    }, []);

    const resetGenerationState = () => {
        setIsGenerating(false);
        setLoading(false);
        setCurrentTaskId(null);
        stopPolling();
    };

    const stopPolling = () => {
        if (pollingIntervalIdRef.current) {
            clearInterval(pollingIntervalIdRef.current);
            pollingIntervalIdRef.current = null;
        }
    };

    const fetchTaskStatus = async (taskId: string) => {
        try {
            const status = await getTaskStatus(taskId);
            console.log('Task status:', status);

            if (status) {
                setTaskStatus(status);
                useVideoStore.getState().setTaskStatus(status);

                if (status.status === 'COMPLETED') {
                    stopPolling();
                    setIsGenerating(false);
                    setLoading(false);
                    toast.success('Video generated successfully!');
                    
                    if (status.result_url) {
                        setVideoUrl(status.result_url);
                    } else if (status.task_folder_content) {
                        const videoKeys = Object.keys(status.task_folder_content).filter(key =>
                            key.endsWith('.mp4') || key.endsWith('video.mp4'));
                        if (videoKeys.length > 0) {
                            setVideoUrl(status.task_folder_content[videoKeys[0]]);
                        }
                    }
                } else if (status.status === 'FAILED') {
                    stopPolling();
                    setIsGenerating(false);
                    setLoading(false);
                    const errorMsg = status.error_message || 'Video generation failed';
                    setError(errorMsg);
                    toast.error(`Video generation failed: ${errorMsg}`);
                }
            }
        } catch (error: any) {
            console.error('Failed to fetch task status:', error);
            if (error?.response?.status === 404) {
                resetGenerationState();
                setError('Failed to fetch task status: Task ID not found.');
                toast.error('Failed to fetch task status: Task ID not found.');
            } else {
                toast.warning('Could not fetch task status, will retry...');
            }
        }
    };

    const startPolling = (taskId: string) => {
        stopPolling();

        const initialStatus: Partial<Task> = {
            task_id: taskId,
            status: 'PENDING',
            progress: 0,
            events: [
                {
                    timestamp: new Date().toISOString(),
                    message: 'Task created, waiting for server to start processing...'
                },
                {
                    timestamp: new Date().toISOString(),
                    message: 'Initializing video generation pipeline...'
                }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        setTaskStatus(initialStatus as Task);
        useVideoStore.getState().setTaskStatus(initialStatus as Task);
        setCurrentTaskId(taskId);
        setError(null);
        useVideoStore.getState().setError(null);
        fetchTaskStatus(taskId);
        pollingIntervalIdRef.current = window.setInterval(() => fetchTaskStatus(taskId), 2000);
    };

    const onFinish = (values: FieldType) => {
        setIsGenerating(true);
        setLoading(true);
        setError(null);
        setVideoUrl('');
        setTaskStatus(null);
        setCurrentTaskId(null);
        toast.loading('Initiating video generation...');

        const taskId = uuidv4();
        const payload = {
            story_prompt: values.story_prompt,
            segments: values.segments,
            voice_name: values.voice_name,
            task_id: taskId,
            resolution: selectedResolution,
            theme: selectedTheme,
            logo_url: logoUrl,
            intro_video_url: introVideoUrl,
            outro_video_url: outroVideoUrl,
            video_language: values.language,
            subtitle_enabled: values.include_subtitles,
            visual_content_in_language: values.visual_content_in_language,
        } as VideoGenerateReq; 
        
        generateVideo(payload).then(res => {
            toast.dismiss();
            if (!res?.success || !res?.data?.task_id) {
                resetGenerationState();
                const errorMsg = res?.message || 'Failed to initiate video generation (Invalid response from server)';
                setError(errorMsg);
                toast.error(`Error: ${errorMsg}`);
                return;
            }
            console.log('Video generation initiated:', res);
            refreshAccountData();
            startPolling(res.data.task_id);
            toast.success('Video generation has started in the background. You can track its progress below.');
        }).catch(error => {
            toast.dismiss();
            resetGenerationState();
            const errorMsg = error?.response?.data?.message || error?.message || 'Failed to initiate video generation';
            setError(errorMsg);
            toast.error(`Generate Video Failed: ${errorMsg}`);
        });
    };

    const handleResolutionTypeChange = (value: string) => {
        setResolutionType(value);
        const selectedType = resolutionOptions.find(opt => opt.type === value);
        const defaultResolution = selectedType?.options[0]?.value;
        setSelectedResolution(defaultResolution || '1920*1080');
        form.setValue('resolution', defaultResolution || '1920*1080');
    };

    const handleFileUpload = async (file: File, type: 'logo' | 'intro' | 'outro') => {
        if (type === 'logo' && !file.type.startsWith('image/')) {
            toast.error('Logo must be an image file.');
            return;
        }
        if ((type === 'intro' || type === 'outro') && !file.type.startsWith('video/')) {
            toast.error(`${type === 'intro' ? 'Intro' : 'Outro'} must be a video file.`);
            return;
        }

        const setUploading = type === 'logo' ? setUploadingLogo : type === 'intro' ? setUploadingIntro : setUploadingOutro;
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await uploadFile(formData);
            if (response && response.url) {
                if (type === 'logo') {
                    setLogoUrl(response.url);
                } else if (type === 'intro') {
                    setIntroVideoUrl(response.url);
                } else {
                    setOutroVideoUrl(response.url);
                }
                toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`);
            } else {
                toast.error(`Failed to upload ${type}.`);
            }
        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            toast.error(`Error uploading ${type}.`);
        } finally {
            setUploading(false);
        }
    };

    const renderProgressCard = () => {
        if (!currentTaskId) return null;

        return (
            <Card className="mb-4 border border-border bg-background/95 dark:bg-card/95">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                            <Video className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-lg">Video Generation Progress</span>
                        {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-blue-600 ml-2" />}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {taskStatus ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-foreground">Task ID:</span> 
                                    <span className="ml-2 text-muted-foreground font-mono text-xs">{currentTaskId}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Status:</span>
                                    <Badge 
                                        variant={
                                            taskStatus.status === 'FAILED' ? 'destructive' :
                                            taskStatus.status === 'COMPLETED' ? 'default' : 'secondary'
                                        }
                                        className="flex items-center gap-1"
                                    >
                                        {taskStatus.status === 'FAILED' && <XCircle className="h-3 w-3" />}
                                        {taskStatus.status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3" />}
                                        {taskStatus.status === 'PENDING' && <Clock className="h-3 w-3" />}
                                        {taskStatus.status}
                                    </Badge>
                                </div>
                            </div>
                            
                            <Progress 
                                value={taskStatus.progress || 0} 
                                className={`h-2 ${taskStatus.status === 'FAILED' ? 'bg-red-100' : 'bg-blue-100'}`}
                            />
                            
                            <div>
                                <h4 className="font-medium mb-2 text-foreground">Recent Events:</h4>
                                <div className="max-h-32 overflow-y-auto space-y-2">
                                    {taskStatus.events && taskStatus.events.length > 0 ? (
                                        taskStatus.events.slice().reverse().map((event: TaskEvent, index: number) => (
                                            <div 
                                                key={`${event.timestamp}-${index}`}
                                                className="border-l-2 border-blue-200 pl-4 py-2 text-sm bg-muted/50 dark:bg-card/50 rounded-r-lg"
                                            >
                                                <p className="text-foreground">{event.message}</p>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(event.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-muted-foreground text-sm">No events recorded yet...</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Waiting for task to start and report status...</p>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="h-full overflow-y-auto bg-background dark:bg-card">
            <div className="max-w-4xl mx-auto p-6 space-y-6">
                {renderProgressCard()}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onFinish)} className="space-y-6">
                        {/* Enhanced Scene Details Card */}
                        <Card className="border border-border bg-background/95 dark:bg-card/95 hover:shadow-sm transition-all duration-300">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-3 text-foreground">
                                    <div className="p-2 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-lg">
                                        <Highlighter className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <span className="text-lg">Lesson Content</span>
                                        <p className="text-sm text-muted-foreground font-normal mt-1">Define your lesson topic and structure</p>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="story_prompt"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-foreground font-semibold text-base flex items-center gap-2 mb-2">
                                                <ImageIcon className="h-4 w-4 text-blue-500" />
                                                Lesson Topic & Instructions
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    placeholder="Describe what you want to teach. E.g., 'Create a comprehensive Docker tutorial covering containers, images, and deployment with real-world examples'"
                                                    rows={5}
                                                    className="bg-background/90 dark:bg-card/90 border-border focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300 resize-none text-base rounded-xl shadow-sm"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                                Be specific about your learning objectives and target audience for better results
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="segments"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-foreground font-semibold text-base flex items-center gap-2 mb-2">
                                                <Video className="h-4 w-4 text-purple-500" />
                                                Number of Scenes (1-50)
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    min="1" 
                                                    max="50"
                                                    className="bg-background/90 dark:bg-card/90 border-border focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-300 text-base rounded-xl shadow-sm h-12"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                />
                                            </FormControl>
                                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                                More scenes create longer, more detailed video content. Recommended: 5-15 scenes
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {/* Video Configuration Card */}
                        <Card className="border border-border bg-background/95 dark:bg-card/95 hover:shadow-sm transition-all duration-300">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                                        <Settings className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="text-lg">Video Configuration</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <Label className="text-foreground font-semibold mb-3 block flex items-center gap-2">
                                        <Monitor className="h-4 w-4" />
                                        Video Format & Quality
                                    </Label>
                                    <RadioGroup 
                                        value={resolutionType} 
                                        onValueChange={handleResolutionTypeChange}
                                        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"
                                    >
                                        {resolutionOptions.map((option) => (
                                            <div key={option.type} className="flex items-center space-x-3 p-4 border border-border rounded-xl hover:border-blue-400/70 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all duration-300 cursor-pointer">
                                                <RadioGroupItem value={option.type} id={option.type} className="text-blue-600" />
                                                <Label htmlFor={option.type} className="flex items-center gap-3 cursor-pointer">
                                                    {option.icon}
                                                    <span className="text-sm font-semibold">{option.label}</span>
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                    
                                    <Select value={selectedResolution} onValueChange={setSelectedResolution}>
                                        <SelectTrigger className="bg-background/80 dark:bg-card/80 border-border h-12 rounded-xl text-base">
                                            <SelectValue placeholder="Select resolution" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {resolutionOptions
                                                .find(opt => opt.type === resolutionType)
                                                ?.options.map((res) => (
                                                    <SelectItem key={res.value} value={res.value}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{res.label}</span>
                                                            <Badge variant="outline" className="text-xs">{res.quality}</Badge>
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Theme Selection Card */}
                        <Card className="border border-border bg-background/95 dark:bg-card/95 hover:shadow-sm transition-all duration-300">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
                                        <Palette className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <span className="text-lg">Visual Theme</span>
                                        <p className="text-sm text-muted-foreground font-normal mt-1">Choose the visual style for your lesson</p>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="theme"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-foreground font-semibold mb-3 block flex items-center gap-2">
                                                <Sparkles className="h-4 w-4" />
                                                Select Theme Style
                                            </FormLabel>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {themeOptions.map((theme) => (
                                                    <div
                                                        key={theme.id}
                                                        className={`relative cursor-pointer rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                                                            selectedTheme === theme.id
                                                                ? 'border-blue-500 shadow-lg shadow-blue-500/25'
                                                                : 'border-border hover:border-blue-300'
                                                        }`}
                                                        onClick={() => {
                                                            setSelectedTheme(theme.id);
                                                            field.onChange(theme.id);
                                                        }}
                                                    >
                                                        {/* Theme Preview */}
                                                        <div className="relative overflow-hidden rounded-t-xl">
                                                            <div
                                                                className="h-20 w-full"
                                                                style={{ background: theme.preview }}
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                                                            {selectedTheme === theme.id && (
                                                                <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                                                                    <Check className="h-3 w-3 text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Theme Info */}
                                                        <div className="p-4">
                                                            <h4 className="font-semibold text-foreground mb-1">{theme.name}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">{theme.description}</p>
                                                            
                                                            {/* Color Palette Preview */}
                                                            <div className="flex items-center gap-1 mt-3">
                                                                <div 
                                                                    className="w-4 h-4 rounded-full border border-border" 
                                                                    style={{ backgroundColor: theme.colors.primary }}
                                                                />
                                                                <div 
                                                                    className="w-4 h-4 rounded-full border border-border" 
                                                                    style={{ backgroundColor: theme.colors.accent }}
                                                                />
                                                                <div 
                                                                    className="w-4 h-4 rounded-full border border-border" 
                                                                    style={{ backgroundColor: theme.colors.secondary }}
                                                                />
                                                                <span className="text-xs text-muted-foreground ml-2">Colors</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <FormControl>
                                                <input className="hidden" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                {/* Theme Preview Section */}
                                {selectedTheme && (
                                    <div className="mt-6 p-4 bg-muted/30 dark:bg-card/30 rounded-xl border border-border">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium text-foreground">Preview</span>
                                        </div>
                                        <div className="space-y-3">
                                            {/* Selected Theme Details */}
                                            <div className="text-sm">
                                                <span className="font-medium text-foreground">Selected: </span>
                                                <span className="text-muted-foreground">
                                                    {themeOptions.find(t => t.id === selectedTheme)?.name} - {themeOptions.find(t => t.id === selectedTheme)?.description}
                                                </span>
                                            </div>
                                            
                                            {/* Mini Layout Preview */}
                                            <div className="relative bg-background border border-border rounded-lg p-3 overflow-hidden">
                                                <div 
                                                    className="absolute top-0 left-0 right-0 h-1"
                                                    style={{ background: themeOptions.find(t => t.id === selectedTheme)?.preview }}
                                                />
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div 
                                                        className="w-3 h-3 rounded"
                                                        style={{ backgroundColor: themeOptions.find(t => t.id === selectedTheme)?.colors.primary }}
                                                    />
                                                    <div className="text-xs font-medium text-foreground">Lesson Title</div>
                                                </div>
                                                <div className="text-xs text-muted-foreground mb-1">Sample lesson content with styled elements</div>
                                                <div className="flex gap-1">
                                                    <div 
                                                        className="w-2 h-2 rounded"
                                                        style={{ backgroundColor: themeOptions.find(t => t.id === selectedTheme)?.colors.accent }}
                                                    />
                                                    <div 
                                                        className="w-2 h-2 rounded"
                                                        style={{ backgroundColor: themeOptions.find(t => t.id === selectedTheme)?.colors.secondary }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Language & Voice Card */}
                        <Card className="border border-border bg-background/95 dark:bg-card/95 hover:shadow-sm transition-all duration-300">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                                        <Languages className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="text-lg">Language & Voice</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Language Combobox */}
                                    <FormField
                                        control={form.control}
                                        name="language"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-foreground font-semibold mb-2 flex items-center gap-2">
                                                    <Languages className="h-4 w-4" />
                                                    Video Language
                                                </FormLabel>
                                                <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={languageOpen}
                                                            className="w-full justify-between bg-background/80 dark:bg-card/80 border-border text-left font-normal h-12 rounded-xl"
                                                        >
                                                            {field.value ? field.value : "Select language..."}
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
                                                                                field.onChange(currentValue);
                                                                                const filteredVoiceList = allVoiceList.filter(v => v.language === currentValue);
                                                                                setNowVoiceList(filteredVoiceList);
                                                                                form.setValue('voice_name', filteredVoiceList?.[0]?.name || '');
                                                                                setLanguageOpen(false);
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={`mr-2 h-4 w-4 ${
                                                                                    field.value === language ? "opacity-100" : "opacity-0"
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
                                                <FormControl>
                                                    <input 
                                                        className="hidden" 
                                                        {...field} 
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Voice Combobox */}
                                    <FormField
                                        control={form.control}
                                        name="voice_name"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-foreground font-semibold mb-2 flex items-center gap-2">
                                                    <Volume2 className="h-4 w-4" />
                                                    Voice
                                                </FormLabel>
                                                <Popover open={voiceOpen} onOpenChange={setVoiceOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={voiceOpen}
                                                            className="w-full justify-between bg-background/80 dark:bg-card/80 border-border text-left font-normal h-12 rounded-xl"
                                                            disabled={!form.watch('language')}
                                                        >
                                                            {field.value ? nowVoiceList.find((voice) => voice.name === field.value)?.displayName : "Select voice..."}
                                                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                                        <Command className="rounded-lg border border-border">
                                                            <CommandInput placeholder="Search voices..." className="h-9" />
                                                            <CommandList>
                                                                <CommandEmpty>
                                                                    {nowVoiceList.length === 0 ? "Select a language first." : "No voice found."}
                                                                </CommandEmpty>
                                                                <CommandGroup className="max-h-[200px] overflow-auto">
                                                                    {nowVoiceList.map((voice) => (
                                                                        <CommandItem
                                                                            key={voice.name}
                                                                            value={`${voice.displayName} ${voice.gender}`}
                                                                            onSelect={() => {
                                                                                field.onChange(voice.name);
                                                                                setVoiceOpen(false);
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={`mr-2 h-4 w-4 ${
                                                                                    field.value === voice.name ? "opacity-100" : "opacity-0"
                                                                                }`}
                                                                            />
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-xs px-2 py-1 bg-muted rounded">{voice.gender}</span>
                                                                                <span className="truncate">{voice.displayName}</span>
                                                                            </div>
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormControl>
                                                    <input 
                                                        className="hidden" 
                                                        {...field} 
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Additional Options Card */}
                        <Card className="border border-border bg-background/95 dark:bg-card/95 hover:shadow-sm transition-all duration-300">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg">
                                        <Settings className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="text-lg">Additional Options</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Upload Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Logo Upload */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4 text-blue-500" />
                                            Logo (Optional)
                                        </Label>
                                        <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-blue-400/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-all duration-300 min-h-[110px] flex flex-col justify-center">
                                            {logoUrl ? (
                                                <div className="space-y-3">
                                                    <img src={logoUrl} alt="Logo" className="w-full h-14 object-contain rounded-lg mx-auto bg-background/50" />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setLogoUrl(undefined)}
                                                        className="w-full text-xs h-8 hover:bg-destructive hover:text-destructive-foreground"
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
                                                    <div>
                                                        <Input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleFileUpload(file, 'logo');
                                                            }}
                                                            disabled={uploadingLogo}
                                                            className="hidden"
                                                            id="logo-upload"
                                                        />
                                                        <Label
                                                            htmlFor="logo-upload"
                                                            className="cursor-pointer text-xs text-muted-foreground hover:text-blue-600 transition-colors font-medium"
                                                        >
                                                            {uploadingLogo ? (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                    Uploading...
                                                                </div>
                                                            ) : (
                                                                "Click to upload image"
                                                            )}
                                                        </Label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Intro Video Upload */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold flex items-center gap-2">
                                            <Video className="w-4 h-4 text-green-500" />
                                            Intro Video (Optional)
                                        </Label>
                                        <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-green-400/50 hover:bg-green-50/50 dark:hover:bg-green-950/10 transition-all duration-300 min-h-[110px] flex flex-col justify-center">
                                            {introVideoUrl ? (
                                                <div className="space-y-3">
                                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mx-auto w-fit">
                                                        <Video className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <p className="text-xs text-foreground font-medium">Video uploaded</p>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setIntroVideoUrl(undefined)}
                                                        className="w-full text-xs h-8 hover:bg-destructive hover:text-destructive-foreground"
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
                                                    <div>
                                                        <Input
                                                            type="file"
                                                            accept="video/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleFileUpload(file, 'intro');
                                                            }}
                                                            disabled={uploadingIntro}
                                                            className="hidden"
                                                            id="intro-upload"
                                                        />
                                                        <Label
                                                            htmlFor="intro-upload"
                                                            className="cursor-pointer text-xs text-muted-foreground hover:text-green-600 transition-colors font-medium"
                                                        >
                                                            {uploadingIntro ? (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                    Uploading...
                                                                </div>
                                                            ) : (
                                                                "Click to upload video"
                                                            )}
                                                        </Label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Outro Video Upload */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold flex items-center gap-2">
                                            <Video className="w-4 h-4 text-purple-500" />
                                            Outro Video (Optional)
                                        </Label>
                                        <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-purple-400/50 hover:bg-purple-50/50 dark:hover:bg-purple-950/10 transition-all duration-300 min-h-[110px] flex flex-col justify-center">
                                            {outroVideoUrl ? (
                                                <div className="space-y-3">
                                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mx-auto w-fit">
                                                        <Video className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                                    </div>
                                                    <p className="text-xs text-foreground font-medium">Video uploaded</p>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setOutroVideoUrl(undefined)}
                                                        className="w-full text-xs h-8 hover:bg-destructive hover:text-destructive-foreground"
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
                                                    <div>
                                                        <Input
                                                            type="file"
                                                            accept="video/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleFileUpload(file, 'outro');
                                                            }}
                                                            disabled={uploadingOutro}
                                                            className="hidden"
                                                            id="outro-upload"
                                                        />
                                                        <Label
                                                            htmlFor="outro-upload"
                                                            className="cursor-pointer text-xs text-muted-foreground hover:text-purple-600 transition-colors font-medium"
                                                        >
                                                            {uploadingOutro ? (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                    Uploading...
                                                                </div>
                                                            ) : (
                                                                "Click to upload video"
                                                            )}
                                                        </Label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Settings Switches */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Settings className="h-4 w-4 text-gray-600" />
                                        <h4 className="font-semibold text-sm text-foreground">Video Settings</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="include_subtitles"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-5 bg-background/60 dark:bg-card/60 hover:bg-background/80 dark:hover:bg-card/80 transition-all duration-300">
                                                    <div className="space-y-1">
                                                        <FormLabel className="text-base font-semibold">Include Subtitles</FormLabel>
                                                        <div className="text-sm text-muted-foreground">
                                                            Add captions to your video for accessibility
                                                        </div>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                            className="ml-4"
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="visual_content_in_language"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-5 bg-background/60 dark:bg-card/60 hover:bg-background/80 dark:hover:bg-card/80 transition-all duration-300">
                                                    <div className="space-y-1">
                                                        <FormLabel className="text-base font-semibold">Localize Visuals</FormLabel>
                                                        <div className="text-sm text-muted-foreground">
                                                            Generate visuals in selected language
                                                        </div>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                            className="ml-4"
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Enhanced Generate Button */}
                        <div className="pt-6">
                            <Button 
                                type="submit" 
                                disabled={isGenerating}
                                className="w-full h-16 text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.02] rounded-2xl border-0"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                                        <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                                            Generating Your Amazing Lesson...
                                        </span>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <Wand2 className="h-6 w-6" />
                                        <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                                            Create AI Lesson
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 bg-background rounded-full animate-pulse"></div>
                                            <div className="w-2 h-2 bg-background/80 dark:bg-card/80 rounded-full animate-pulse delay-150"></div>
                                            <div className="w-2 h-2 bg-background/60 dark:bg-card/60 rounded-full animate-pulse delay-300"></div>
                                        </div>
                                    </div>
                                )}
                            </Button>
                            
                            {/* Enhanced Info Text */}
                            <p className="text-center text-sm text-muted-foreground mt-4 leading-relaxed">
                                🚀 Your lesson will be generated using advanced AI technology. 
                                <br />
                                <span className="font-medium text-foreground">Estimated time: 2-5 minutes</span>
                            </p>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
};

export default App;
