import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Settings2,
  Loader2,
  FileText
} from 'lucide-react';
import { marked } from 'marked';
import mermaid from 'mermaid';
import { AnimatedSection, ContentBlock } from '../../services/animated_lesson';
import { cn } from '@/lib/utils';

interface DivLessonRendererProps {
    sections: AnimatedSection[];
    isLoading?: boolean;
}

const DivLessonRenderer: React.FC<DivLessonRendererProps> = ({ sections, isLoading }) => {
    const [currentSection, setCurrentSection] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [animationProgress, setAnimationProgress] = useState(0);
    const [theme, setTheme] = useState<'light' | 'dark' | 'colorful' | 'minimal'>('light');
    const [fontSize, setFontSize] = useState([18]);
    const [animationSpeed, setAnimationSpeed] = useState([1]);
    const [autoProgress, setAutoProgress] = useState(true);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize mermaid
    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: theme === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose',
        });
    }, [theme]);

    // Auto-advance to next section when current section completes
    useEffect(() => {
        if (isPlaying && animationProgress >= 100 && autoProgress) {
            timeoutRef.current = setTimeout(() => {
                if (currentSection < sections.length - 1) {
                    setCurrentSection(currentSection + 1);
                    setAnimationProgress(0);
                } else {
                    setIsPlaying(false);
                }
            }, 1000); // Wait 1 second before advancing
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [animationProgress, isPlaying, currentSection, sections.length, autoProgress]);

    // Animation engine
    useEffect(() => {
        if (!isPlaying || !sections[currentSection]) return;
        
        const section = sections[currentSection];
        const duration = (section.duration || 4) * 1000 / animationSpeed[0];
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / duration) * 100, 100);
            
            setAnimationProgress(progress);
            
            if (progress < 100) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                setAnimationProgress(100);
            }
        };
        
        animationRef.current = requestAnimationFrame(animate);
        
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
        
    }, [isPlaying, currentSection, sections, animationSpeed]);

    const handlePlay = () => {
        setIsPlaying(true);
    };

    const handlePause = () => {
        setIsPlaying(false);
    };

    const handlePrevious = () => {
        if (currentSection > 0) {
            setCurrentSection(currentSection - 1);
            setAnimationProgress(0);
            setIsPlaying(false);
        }
    };

    const handleNext = () => {
        if (currentSection < sections.length - 1) {
            setCurrentSection(currentSection + 1);
            setAnimationProgress(0);
            setIsPlaying(false);
        }
    };

    const getThemeClasses = () => {
        switch (theme) {
            case 'dark':
                return 'bg-slate-800 text-white';
            case 'colorful':
                return 'bg-gradient-to-br from-purple-500 to-blue-600 text-white';
            case 'minimal':
                return 'bg-background text-foreground border border-border';
            default:
                return 'bg-gradient-to-br from-blue-50 to-muted dark:from-card dark:to-background text-foreground';
        }
    };

    const renderContent = () => {
        if (!sections[currentSection]) return null;
        
        const section = sections[currentSection];
        const progress = animationProgress / 100;
        
        return (
            <div 
                ref={containerRef}
                className={cn(
                    "p-8 rounded-lg min-h-[400px] aspect-video flex flex-col",
                    getThemeClasses()
                )}
                style={{ fontSize: `${fontSize[0]}px` }}
            >
                {/* Title */}
                <h1 className="text-3xl font-bold mb-6 text-center">
                    {section.heading}
                </h1>
                
                {/* Content */}
                <div className="flex-1 space-y-4">
                    {renderContentBlocks(section, progress)}
                </div>
            </div>
        );
    };

    const renderContentBlocks = (section: AnimatedSection, progress: number) => {
        if (!section.content_blocks) return null;
        
        return section.content_blocks.map((block, blockIndex) => {
            // Calculate individual block progress based on overall progress
            const blockProgress = Math.max(0, Math.min(1, (progress * section.content_blocks!.length) - blockIndex));
            
            return (
                <div key={blockIndex} className="transition-all duration-500">
                    {renderContentBlock(block, blockProgress, blockIndex, section.content_blocks!.length)}
                </div>
            );
        });
    };

    const renderContentBlock = (block: ContentBlock, progress: number, blockIndex: number, totalBlocks: number) => {
        switch (block.content_type) {
            case 'paragraph':
                return (
                    <AnimatedText 
                        text={block.content} 
                        animationType="typing"
                        progress={progress}
                        partIndex={blockIndex}
                        totalParts={totalBlocks}
                        theme={theme}
                    />
                );
            case 'list':
                return renderAnimatedList(block.content, progress);
            
            case 'code':
                return (
                    <AnimatedCodeBlock
                        language={block.language || 'javascript'}
                        code={block.content}
                        animationType={block.animation_type}
                        progress={progress}
                        partIndex={blockIndex}
                        totalParts={totalBlocks}
                        theme={theme}
                    />
                );
            
            case 'mermaid':
                return (
                    <div 
                        className="flex justify-center transition-opacity duration-500" 
                        style={{ opacity: progress }}
                    >
                        <MermaidDiagram code={block.mermaid_diagram || block.content} />
                    </div>
                );
            
            case 'text':
            default:
                return (
                    <AnimatedText 
                        text={block.content} 
                        animationType={block.animation_type}
                        progress={progress}
                        partIndex={blockIndex}
                        totalParts={totalBlocks}
                        theme={theme}
                    />
                );
        }
    };

    const renderAnimatedList = (content: string, progress: number) => {
        // Parse markdown-style list
        const lines = content.split('\n').filter(line => line.trim());
        const listItems = lines.map(line => line.replace(/^[-*+]\s*/, '').trim());
        
        return (
            <div className="space-y-2">
                {listItems.map((item, itemIndex) => {
                    // Each list item slides in sequentially
                    const itemProgress = Math.max(0, Math.min(1, (progress * listItems.length) - itemIndex));
                    
                    return (
                        <div 
                            key={itemIndex} 
                            className="flex items-start gap-3 transition-all duration-500"
                            style={{
                                transform: `translateX(${(1 - itemProgress) * 50}px)`,
                                opacity: itemProgress
                            }}
                        >
                            <span className="text-blue-500 font-bold">•</span>
                            <span>{item}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (isLoading) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Generating Animated Lesson...</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 py-8">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <p className="text-slate-600">Creating your animated lesson content...</p>
                </CardContent>
            </Card>
        );
    }

    if (!sections.length) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Lesson Renderer</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 py-8">
                    <FileText className="h-16 w-16 text-slate-400" />
                    <p className="text-slate-600">No lesson content available. Generate a lesson to see the animation preview.</p>
                </CardContent>
            </Card>
        );
    }

    const currentSectionData = sections[currentSection];

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Animated Lesson - Section {currentSection + 1} of {sections.length}</CardTitle>
                <div className="flex items-center gap-2">
                    <Select value={theme} onValueChange={(value: 'light' | 'dark' | 'colorful' | 'minimal') => setTheme(value)}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="colorful">Colorful</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                        </SelectContent>
                    </Select>
                    <Settings2 className="h-4 w-4 text-slate-500" />
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Main lesson display */}
                <div className="border rounded-lg overflow-hidden shadow-lg">
                    {renderContent()}
                </div>
                
                {/* Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline"
                            size="sm"
                            onClick={handlePrevious}
                            disabled={currentSection === 0}
                        >
                            <SkipBack className="h-4 w-4" />
                        </Button>
                        
                        <Button 
                            onClick={isPlaying ? handlePause : handlePlay}
                            size="lg"
                            className="px-6"
                        >
                            {isPlaying ? (
                                <>
                                    <Pause className="h-5 w-5 mr-2" />
                                    Pause
                                </>
                            ) : (
                                <>
                                    <Play className="h-5 w-5 mr-2" />
                                    Play
                                </>
                            )}
                        </Button>
                        
                        <Button 
                            variant="outline"
                            size="sm"
                            onClick={handleNext}
                            disabled={currentSection === sections.length - 1}
                        >
                            <SkipForward className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600">Progress:</span>
                        <div className="w-48">
                            <Progress value={animationProgress} className="h-2" />
                        </div>
                        <span className="text-sm font-medium">{Math.round(animationProgress)}%</span>
                    </div>
                </div>
                
                <Separator />
                
                {/* Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Font Size</label>
                        <Slider 
                            value={fontSize}
                            onValueChange={setFontSize}
                            min={14}
                            max={28}
                            step={1}
                            className="w-full"
                        />
                        <div className="text-xs text-slate-500">{fontSize[0]}px</div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Animation Speed</label>
                        <Slider 
                            value={animationSpeed}
                            onValueChange={setAnimationSpeed}
                            min={0.5}
                            max={3}
                            step={0.1}
                            className="w-full"
                        />
                        <div className="text-xs text-slate-500">{animationSpeed[0]}x</div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Auto-advance</label>
                        <div className="flex items-center space-x-2">
                            <Switch 
                                checked={autoProgress}
                                onCheckedChange={setAutoProgress}
                            />
                            <span className="text-sm">{autoProgress ? 'ON' : 'OFF'}</span>
                        </div>
                    </div>
                </div>
                
                {/* Section info */}
                {currentSectionData && (
                    <div className="bg-slate-50 rounded-lg p-4">
                        <h3 className="font-semibold mb-2">{currentSectionData.heading}</h3>
                        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                            <Badge variant="secondary">
                                {currentSectionData.content_blocks?.length || 0} blocks
                            </Badge>
                            <Badge variant="secondary">
                                {currentSectionData.duration || 4}s duration
                            </Badge>
                            {currentSectionData.content_blocks && (
                                <Badge variant="secondary">
                                    {[...new Set(currentSectionData.content_blocks.map(block => block.content_type))].join(', ')}
                                </Badge>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// Animated text component
interface AnimatedTextProps {
    text: string;
    animationType: string;
    progress: number;
    partIndex: number;
    totalParts: number;
    theme: string;
}

const AnimatedText: React.FC<AnimatedTextProps> = ({ 
    text, 
    animationType, 
    progress, 
    partIndex, 
    totalParts,
    theme 
}) => {
    const partProgress = Math.max(0, Math.min(1, (progress * totalParts) - partIndex));
    
    // Convert markdown to HTML
    const htmlContent = marked(text) as string;
    
    const getAnimationStyle = () => {
        switch (animationType) {
            case 'typing':
                return {
                    overflow: 'hidden',
                    whiteSpace: 'pre-wrap' as const
                };
            case 'fade_in':
                return {
                    opacity: partProgress,
                    transition: 'opacity 0.3s ease'
                };
            case 'slide_in':
                return {
                    transform: `translateX(${(1 - partProgress) * -50}px)`,
                    opacity: partProgress,
                    transition: 'all 0.3s ease'
                };
            default:
                return { opacity: partProgress };
        }
    };

    if (animationType === 'typing') {
        const chars = Math.floor(text.length * partProgress);
        const visibleText = text.substring(0, chars);
        return (
            <div style={getAnimationStyle()} className="font-mono">
                <div dangerouslySetInnerHTML={{ __html: marked(visibleText) as string }} />
                {partProgress > 0 && partProgress < 1 && (
                    <span className="animate-pulse ml-1 font-bold text-blue-600">|</span>
                )}
            </div>
        );
    }

    return (
        <div style={getAnimationStyle()}>
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>
    );
};

// Animated code block component
interface AnimatedCodeBlockProps {
    language: string;
    code: string;
    animationType: string;
    progress: number;
    partIndex: number;
    totalParts: number;
    theme: string;
}

const AnimatedCodeBlock: React.FC<AnimatedCodeBlockProps> = ({ 
    language, 
    code, 
    animationType, 
    progress, 
    partIndex, 
    totalParts,
    theme
}) => {
    const partProgress = Math.max(0, Math.min(1, (progress * totalParts) - partIndex));
    const lines = code.trim().split('\n');
    
    const getVisibleLines = () => {
        if (animationType === 'typing') {
            const totalChars = code.length;
            const visibleChars = Math.floor(totalChars * partProgress);
            let currentChars = 0;
            const visibleLines = [];
            
            for (const line of lines) {
                if (currentChars + line.length <= visibleChars) {
                    visibleLines.push(line);
                    currentChars += line.length + 1; // +1 for newline
                } else if (currentChars < visibleChars) {
                    const remainingChars = visibleChars - currentChars;
                    visibleLines.push(line.substring(0, remainingChars));
                    break;
                } else {
                    break;
                }
            }
            return visibleLines;
        }
        
        const visibleLineCount = Math.floor(lines.length * partProgress);
        return lines.slice(0, visibleLineCount);
    };

    const isDark = theme === 'dark';

    return (
        <div 
            className={cn(
                "rounded-lg border overflow-hidden transition-opacity duration-300",
                isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"
            )}
            style={{ opacity: partProgress > 0.2 ? 1 : 0 }}
        >
            <div className={cn(
                "px-4 py-2 border-b text-sm font-medium",
                isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"
            )}>
                {language.toUpperCase()}
            </div>
            <pre className={cn(
                "p-4 font-mono text-sm overflow-x-auto",
                isDark ? "text-slate-300" : "text-slate-700"
            )}>
                <code>
                    {getVisibleLines().map((line, index) => (
                        <div key={index} className="min-h-[1.2em]">
                            {line}
                            {animationType === 'typing' && 
                             index === getVisibleLines().length - 1 && 
                             partProgress > 0 && 
                             partProgress < 1 && 
                             <span className="animate-pulse ml-1 font-bold text-blue-600">|</span>
                            }
                        </div>
                    ))}
                </code>
            </pre>
        </div>
    );
};

// Mermaid diagram component
interface MermaidDiagramProps {
    code: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code }) => {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const renderDiagram = async () => {
            try {
                const { svg } = await mermaid.render('mermaid-diagram', code);
                setSvg(svg);
                setError('');
            } catch (err) {
                setError('Failed to render diagram');
                console.error('Mermaid render error:', err);
            }
        };

        renderDiagram();
    }, [code]);

    if (error) {
        return (
            <div className="text-red-600 p-4 bg-red-50 rounded-lg">
                Error rendering diagram: {error}
            </div>
        );
    }

    return (
        <div className="max-w-full overflow-auto">
            <div dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
    );
};

export default DivLessonRenderer;
