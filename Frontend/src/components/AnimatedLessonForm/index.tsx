import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
    Play, 
    Volume2, 
    Languages, 
    Settings, 
    FileText,
    Loader2,
    Clock
} from 'lucide-react';
import { getVoiceList, getTaskStatus, generateAnimatedLesson } from '@/services/index';
import { TaskEvent } from '@/interfaces/index';
import { v4 as uuidv4 } from 'uuid';
import { useVideoStore, useAccountStore } from "@/stores/index";
import { toast } from 'sonner';

type RenderMode = 'markdown' | 'mermaid' | 'mixed';

type FieldType = {
    title: string;
    description?: string;
    prompt: string;
    scenes: number;
    language?: string;
    voice_name: string;
    voice_rate: number;
    include_subtitles: boolean;
    render_mode: RenderMode;
    theme: string;
};

type VoiceOption = {
    displayName: string;
    gender: string;
    language: string;
    name: string;
};

const getUniqueLanguageList = (list: VoiceOption[]) => {
    const uniqueLanguageList = list.reduce((acc: string[], item: VoiceOption) => {
        if (!acc.includes(item.language)) {
            acc.push(item.language);
        }
        return acc;
    }, []);
    return uniqueLanguageList;
};

const RenderModePreview: React.FC<{ mode: RenderMode }> = ({ mode }) => {
    if (mode === 'markdown') {
        return (
            <div className="p-4 bg-muted dark:bg-card rounded-lg border">
                <div className="font-mono text-sm space-y-1">
                    <div className="font-bold"># Heading</div>
                    <div><strong>**Bold text**</strong> and <em>*italic text*</em></div>
                    <div>- List item 1</div>
                    <div>- List item 2</div>
                    <div className="bg-muted-foreground/20 px-1 rounded">`code block`</div>
                </div>
            </div>
        );
    }
    
    if (mode === 'mermaid') {
        return (
            <div className="p-4 bg-muted dark:bg-card rounded-lg border">
                <svg width="200" height="100" viewBox="0 0 200 100" className="mx-auto">
                    <rect x="10" y="20" width="60" height="30" fill="#e1f5fe" stroke="#01579b" strokeWidth="2" rx="5"/>
                    <text x="40" y="38" textAnchor="middle" fontSize="12" fill="#01579b">Start</text>
                    <path d="M80,35 L110,35" stroke="#01579b" strokeWidth="2" markerEnd="url(#arrowhead)"/>
                    <rect x="120" y="20" width="60" height="30" fill="#e8f5e8" stroke="#2e7d32" strokeWidth="2" rx="5"/>
                    <text x="150" y="38" textAnchor="middle" fontSize="12" fill="#2e7d32">End</text>
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#01579b"/>
                        </marker>
                    </defs>
                </svg>
                <p className="text-xs text-center mt-1">Mermaid diagrams</p>
            </div>
        );
    }
    
    if (mode === 'mixed') {
        return (
            <div className="p-4 bg-muted dark:bg-card rounded-lg border">
                <div className="text-sm space-y-1">
                    <div className="font-semibold">Combined rendering:</div>
                    <div>📝 Markdown formatting</div>
                    <div>📊 Mermaid diagrams</div>
                    <div>🎨 Interactive animations</div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="p-4 bg-muted dark:bg-card rounded-lg border">
            <p className="text-sm text-muted-foreground">Preview not available for this render mode</p>
        </div>
    );
};

const AnimatedLessonForm: React.FC = () => {
    const { setVideoUrl, setLoading, setError, videoUrl, setTaskStatus, taskStatus } = useVideoStore();
    const { refreshAccountData } = useAccountStore();
    const [allVoiceList, setAllVoiceList] = useState<VoiceOption[]>([]);
    const [nowVoiceList, setNowVoiceList] = useState<VoiceOption[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const pollingIntervalIdRef = useRef<number | null>(null);
    const [selectedRenderMode, setSelectedRenderMode] = useState<RenderMode>('mixed');
    
    // Form state
    const [formData, setFormData] = useState<FieldType>({
        title: '',
        description: '',
        prompt: '',
        scenes: 5,
        language: '',
        voice_name: '',
        voice_rate: 1.0,
        include_subtitles: true,
        render_mode: 'mixed',
        theme: 'light',
    });

    useEffect(() => {
        getVoiceList({ area: [] }).then(res => {
            if (res?.voices?.length > 0) {
                setAllVoiceList(res?.voices as VoiceOption[]);
                // Set initial language to English or first available
                const languageList = getUniqueLanguageList(res?.voices as VoiceOption[]);
                const initialLanguage = languageList.includes('English') ? 'English' : languageList[0];
                
                if (initialLanguage) {
                    const filteredVoices = (res?.voices as VoiceOption[]).filter(v => v.language === initialLanguage);
                    setNowVoiceList(filteredVoices);
                    setFormData(prev => ({
                        ...prev,
                        language: initialLanguage,
                        voice_name: filteredVoices[0]?.name || '',
                    }));
                }
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

    useEffect(() => {
        if (!videoUrl && !isGenerating) {
            setCurrentTaskId(null);
            setTaskStatus(null);
        }
    }, [videoUrl, isGenerating, setTaskStatus]);

    const stopPolling = () => {
        if (pollingIntervalIdRef.current) {
            clearInterval(pollingIntervalIdRef.current);
            pollingIntervalIdRef.current = null;
        }
    };

    const resetGenerationState = () => {
        setIsGenerating(false);
        setLoading(false);
        stopPolling();
        setCurrentTaskId(null);
    };

    const fetchTaskStatus = async (taskId: string) => {
        try {
            const status = await getTaskStatus(taskId);
            
            // Check if this is a status change from the previous state
            const previousStatus = useVideoStore.getState().taskStatus?.status;
            const statusChanged = previousStatus && previousStatus !== status.status;

            // Update local component state
            setTaskStatus(status);
            // Update the global store task status for VideoResult component
            useVideoStore.getState().setTaskStatus(status);

            // Keep loading state while task is in progress
            setLoading(true);

            // If status just changed, show appropriate notification
            if (statusChanged) {
                toast.info(`Task status changed to: ${status.status}`, { duration: 3000 });
            }

            if (status.status === 'COMPLETED' || status.status === 'FAILED') {
                resetGenerationState();
                if (status.status === 'COMPLETED') {
                    toast.success('Animated lesson generated successfully!');
                    // Set content result for rendering
                    if (status.result_url) {
                        setVideoUrl(status.result_url);
                    } else if (status.task_folder_content) {
                        // Find any video URL in the task folder content
                        const videoKeys = Object.keys(status.task_folder_content).filter(key =>
                            key.endsWith('.mp4') || key.endsWith('video.mp4'));
                        if (videoKeys.length > 0) {
                            setVideoUrl(status.task_folder_content[videoKeys[0]]);
                        }
                    }
                } else {
                    const errorMsg = status.error_message || 'Animated lesson generation failed';
                    setError(errorMsg + (status.error_details ? ` Details: ${typeof status.error_details === 'string' ? status.error_details : JSON.stringify(status.error_details)}` : ''));
                    toast.error(`Generation failed: ${errorMsg}`, { duration: 10000 });
                }
            }
        } catch (error: any) {
            console.error('Failed to fetch task status:', error);
            if (error?.response?.status === 404) {
                resetGenerationState();
                setError('Failed to fetch task status: Task ID not found.');
                toast.error('Task not found. It may have been removed.', { duration: 5000 });
                stopPolling();
            }
        }
    };

    const startPolling = (taskId: string) => {
        setCurrentTaskId(taskId);
        setError(null);
        // Clear any global store errors 
        useVideoStore.getState().setError(null);
        fetchTaskStatus(taskId);
        pollingIntervalIdRef.current = window.setInterval(() => fetchTaskStatus(taskId), 2000); // Poll every 2 seconds
    };

    const validateForm = (): boolean => {
        if (!formData.title.trim()) {
            toast.error('Please enter a lesson title');
            return false;
        }
        if (!formData.prompt.trim()) {
            toast.error('Please enter the content prompt');
            return false;
        }
        if (formData.scenes < 1 || formData.scenes > 25) {
            toast.error('Number of scenes must be between 1 and 25');
            return false;
        }
        if (!formData.language) {
            toast.error('Please select a language');
            return false;
        }
        if (!formData.voice_name) {
            toast.error('Please select a voice');
            return false;
        }
        return true;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsGenerating(true);
        setLoading(true);
        setError(null);
        setVideoUrl('');
        setTaskStatus(null);
        setCurrentTaskId(null);
        
        const loadingToast = toast.loading('Initiating animated lesson generation...');

        const taskId = uuidv4();
        
        // Prepare request payload
        const payload = {
            task_id: taskId,
            title: formData.title,
            description: formData.description,
            prompt: formData.prompt,
            scenes: formData.scenes,
            language: formData.language,
            render_mode: formData.render_mode,
            voice_name: formData.voice_name,
            voice_rate: formData.voice_rate,
            include_subtitles: formData.include_subtitles,
            theme: formData.theme,
        };

        try {
            const response = await generateAnimatedLesson(payload);
            toast.dismiss(loadingToast);

            if (!response?.success || !response?.data?.task_id) {
                resetGenerationState();
                const errorMsg = response?.message || 'Failed to initiate animated lesson generation (Invalid response from server)';
                setError(errorMsg);
                toast.error(`Error: ${errorMsg}`, { duration: 10000 });
                return;
            }

            console.log('Animated lesson generation initiated:', response);

            // Refresh account data to update credits
            refreshAccountData();

            // Start polling with the received task_id
            startPolling(response.data.task_id);

            // Display message that the process is running in the background
            toast.info('Animated lesson generation has started in the background. You can track its progress below.', { duration: 5000 });

        } catch (err: any) {
            toast.dismiss(loadingToast);
            resetGenerationState();
            const errorMsg = err?.message || err?.data?.message || 'Generate Animated Lesson Failed (Network/Request Error)';
            setError(errorMsg);
            toast.error(`Generation Failed: ${errorMsg}`, { duration: 10000 });
            console.log('generateAnimatedLesson error:', err);
        }
    };

    const handleRenderModeChange = (value: RenderMode) => {
        setSelectedRenderMode(value);
        setFormData(prev => ({ ...prev, render_mode: value }));
    };

    const handleLanguageChange = (value: string) => {
        const filteredVoiceList = allVoiceList.filter((voice) => {
            return voice.language === value;
        });
        setNowVoiceList(filteredVoiceList);
        setFormData(prev => ({
            ...prev,
            language: value,
            voice_name: filteredVoiceList?.[0]?.name || '',
        }));
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Create Animated Lesson</CardTitle>
                </CardHeader>
                <CardContent>
                    {currentTaskId && (
                        <Card className={`mb-6 ${taskStatus?.status === 'FAILED' ? 'border-red-500' : 'border-blue-500'}`}>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Generation Progress</span>
                                    {isGenerating || (taskStatus && taskStatus.status !== 'COMPLETED' && taskStatus.status !== 'FAILED') ? (
                                        <span className="text-sm font-normal">Processing...</span>
                                    ) : null}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {taskStatus ? (
                                    <div className="space-y-4">
                                        <div>
                                            <p><strong>Task ID:</strong> {currentTaskId}</p>
                                            <p>
                                                <strong>Status:</strong> 
                                                <span className={`font-bold ml-2 ${
                                                    taskStatus.status === 'FAILED' ? 'text-red-600' : 
                                                    taskStatus.status === 'COMPLETED' ? 'text-green-600' : 
                                                    'text-blue-600'
                                                }`}>
                                                    {taskStatus.status}
                                                </span>
                                            </p>
                                        </div>
                                        
                                        <Progress 
                                            value={taskStatus.progress || 0}
                                            className={`w-full ${taskStatus.status === 'FAILED' ? 'text-red-500' : ''}`}
                                        />
                                        
                                        <div>
                                            <h4 className="font-semibold mb-2">Events:</h4>
                                            {taskStatus.events && taskStatus.events.length > 0 ? (
                                                <div className="max-h-48 overflow-y-auto space-y-2">
                                                    {taskStatus.events.slice().reverse().map((event: any, index: number) => (
                                                        <div
                                                            key={`${event.timestamp}-${index}`}
                                                            className={`p-3 rounded-lg border-l-4 ${
                                                                taskStatus.status === 'FAILED' && taskStatus.events.length - 1 - index === 0 && taskStatus.progress < 100
                                                                    ? 'border-red-500 bg-red-50'
                                                                    : 'border-blue-500 bg-blue-50'
                                                            }`}
                                                        >
                                                            <p className="font-medium">
                                                                <Clock className="inline h-4 w-4 mr-1" />
                                                                {new Date(event.timestamp).toLocaleString()}: {event.message}
                                                            </p>
                                                            {event.details && (
                                                                <pre className="text-xs bg-muted dark:bg-card p-2 rounded mt-2 overflow-x-auto">
                                                                    {typeof event.details === 'object' 
                                                                        ? JSON.stringify(event.details, null, 2) 
                                                                        : event.details}
                                                                </pre>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500">No events logged yet. Waiting for processing to start...</p>
                                            )}
                                            
                                            {taskStatus.status === 'FAILED' && taskStatus.error_message && (
                                                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                                    <p className="text-red-800"><strong>Error:</strong> {taskStatus.error_message}</p>
                                                    {taskStatus.error_details && (
                                                        <pre className="text-xs bg-red-100 p-2 rounded mt-2 overflow-x-auto">
                                                            {typeof taskStatus.error_details === 'object' 
                                                                ? JSON.stringify(taskStatus.error_details, null, 2) 
                                                                : taskStatus.error_details}
                                                        </pre>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500">Waiting for task to start and report status...</p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <form onSubmit={onSubmit} className="space-y-6">
                        {/* Lesson Content Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Lesson Content
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="title">Lesson Title *</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Enter a title for your animated lesson"
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Input
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Brief description of the lesson content"
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="prompt">Content Prompt *</Label>
                                    <p className="text-sm text-gray-600 mb-1">
                                        Describe what you want your animated lesson to teach. Be specific and detailed.
                                    </p>
                                    <Textarea
                                        id="prompt"
                                        value={formData.prompt}
                                        onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                                        placeholder="E.g., Create a lesson about photosynthesis that explains how plants convert sunlight into energy. Include definitions, the chemical process, and why it's important."
                                        rows={4}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="scenes">Number of Scenes *</Label>
                                    <p className="text-sm text-gray-600 mb-1">
                                        Each scene represents a segment in your lesson. More scenes allows for more detailed content.
                                    </p>
                                    <Input
                                        id="scenes"
                                        type="number"
                                        min="1"
                                        max="25"
                                        value={formData.scenes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, scenes: parseInt(e.target.value) || 1 }))}
                                        className="mt-1"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Rendering Options Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5" />
                                    Rendering Options
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Content Rendering Mode *</Label>
                                    <p className="text-sm text-gray-600 mb-2">
                                        AI will automatically choose appropriate animations for each content type
                                    </p>
                                    <RadioGroup
                                        value={selectedRenderMode}
                                        onValueChange={handleRenderModeChange}
                                        className="flex flex-wrap gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="markdown" id="markdown" />
                                            <Label htmlFor="markdown">📝 Markdown</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="mermaid" id="mermaid" />
                                            <Label htmlFor="mermaid">📊 Mermaid</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="mixed" id="mixed" />
                                            <Label htmlFor="mixed">🎨 Mixed</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <RenderModePreview mode={selectedRenderMode} />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="theme">Visual Theme</Label>
                                        <Select
                                            value={formData.theme}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, theme: value }))}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Select theme" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="light">Light</SelectItem>
                                                <SelectItem value="dark">Dark</SelectItem>
                                                <SelectItem value="colorful">Colorful</SelectItem>
                                                <SelectItem value="minimal">Minimal</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="subtitles"
                                            checked={formData.include_subtitles}
                                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, include_subtitles: checked }))}
                                        />
                                        <Label htmlFor="subtitles">Include Subtitles</Label>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Language & Voice Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Languages className="h-5 w-5" />
                                    Language & Voice
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="language">Language *</Label>
                                        <Select
                                            value={formData.language}
                                            onValueChange={handleLanguageChange}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Select language" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getUniqueLanguageList(allVoiceList).map((language) => (
                                                    <SelectItem key={language} value={language}>
                                                        <div className="flex items-center gap-2">
                                                            <Languages className="h-4 w-4" />
                                                            {language}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label htmlFor="voice">Voice *</Label>
                                        <Select
                                            value={formData.voice_name}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, voice_name: value }))}
                                            disabled={nowVoiceList.length === 0}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Select voice" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {nowVoiceList.map((voice) => (
                                                    <SelectItem key={voice.name} value={voice.name}>
                                                        <div className="flex items-center justify-between w-full">
                                                            <span className="flex items-center gap-2">
                                                                <Volume2 className="h-4 w-4" />
                                                                {voice.displayName}
                                                            </span>
                                                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                                                                voice.gender === 'Male' 
                                                                    ? 'bg-blue-100 text-blue-800' 
                                                                    : 'bg-pink-100 text-pink-800'
                                                            }`}>
                                                                {voice.gender}
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="voice-rate">Voice Rate (Speed) *</Label>
                                        <Select
                                            value={formData.voice_rate.toString()}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, voice_rate: parseFloat(value) }))}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Select speed" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0.8">Slow (0.8x)</SelectItem>
                                                <SelectItem value="1.0">Normal (1.0x)</SelectItem>
                                                <SelectItem value="1.2">Fast (1.2x)</SelectItem>
                                                <SelectItem value="1.5">Very Fast (1.5x)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="text-center pt-4">
                            <Button
                                type="submit"
                                disabled={isGenerating}
                                size="lg"
                                className="min-w-[200px] h-12"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4" />
                                        Generate Animated Lesson
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AnimatedLessonForm;
