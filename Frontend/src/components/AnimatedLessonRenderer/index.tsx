import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Loader2,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AnimationType = 'typing' | 'drawing' | 'fade_in' | 'slide_in';

interface AnimatedLessonSection {
    heading: string;
    content: string;
    animation_type: AnimationType;
}

interface AnimatedLessonRendererProps {
    taskResult?: {
        content?: AnimatedLessonSection[];
        animation_type?: AnimationType;
        theme?: string;
        include_subtitles?: boolean;
        [key: string]: any;
    } | Record<string, any>;
    isLoading?: boolean;
}

const AnimatedLessonRenderer: React.FC<AnimatedLessonRendererProps> = ({ 
    taskResult, 
    isLoading = false 
}) => {
    const [activeSection, setActiveSection] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [hasStarted, setHasStarted] = useState<boolean>(false);
    const [animatedContent, setAnimatedContent] = useState<{ [key: number]: string }>({});
    const [isAnimating, setIsAnimating] = useState<{ [key: number]: boolean }>({});
    
    const timerRef = useRef<number | null>(null);
    const animationRefs = useRef<{ [key: number]: number }>({});
    
    // Get content and settings from task result
    const content = taskResult?.content || [];
    const theme = taskResult?.theme || 'light';
    const defaultAnimationType = taskResult?.animation_type || 'typing';

    // Enhanced typing animation
    const startTypingAnimation = useCallback((sectionIndex: number, text: string, duration: number = 2000) => {
        setAnimatedContent(prev => ({ ...prev, [sectionIndex]: '' }));
        setIsAnimating(prev => ({ ...prev, [sectionIndex]: true }));
        
        const chars = text.split('');
        const delay = Math.max(duration / chars.length, 30); // Minimum 30ms per character
        
        let currentIndex = 0;
        const interval = window.setInterval(() => {
            if (currentIndex < chars.length) {
                setAnimatedContent(prev => ({ 
                    ...prev, 
                    [sectionIndex]: chars.slice(0, currentIndex + 1).join('') 
                }));
                currentIndex++;
            } else {
                clearInterval(interval);
                setIsAnimating(prev => ({ ...prev, [sectionIndex]: false }));
                delete animationRefs.current[sectionIndex];
            }
        }, delay);
        
        animationRefs.current[sectionIndex] = interval;
        return interval;
    }, []);

    // Enhanced drawing animation (progressive word reveal)
    const startDrawingAnimation = useCallback((sectionIndex: number, text: string, duration: number = 3000) => {
        setAnimatedContent(prev => ({ ...prev, [sectionIndex]: '' }));
        setIsAnimating(prev => ({ ...prev, [sectionIndex]: true }));
        
        const words = text.split(' ');
        const delay = Math.max(duration / words.length, 100); // Minimum 100ms per word
        
        let currentIndex = 0;
        const interval = window.setInterval(() => {
            if (currentIndex < words.length) {
                setAnimatedContent(prev => ({ 
                    ...prev, 
                    [sectionIndex]: words.slice(0, currentIndex + 1).join(' ') 
                }));
                currentIndex++;
            } else {
                clearInterval(interval);
                setIsAnimating(prev => ({ ...prev, [sectionIndex]: false }));
                delete animationRefs.current[sectionIndex];
            }
        }, delay);
        
        animationRefs.current[sectionIndex] = interval;
        return interval;
    }, []);

    // Start animation for current section
    const startSectionAnimation = useCallback((sectionIndex: number) => {
        const section = content[sectionIndex];
        if (!section) return;

        // Clear any existing animation for this section
        if (animationRefs.current[sectionIndex]) {
            clearInterval(animationRefs.current[sectionIndex]);
        }

        const animationType = section.animation_type || defaultAnimationType;
        const duration = 2000; // Default 2 seconds

        switch (animationType) {
            case 'typing':
                startTypingAnimation(sectionIndex, section.content, duration);
                break;
            case 'drawing':
                startDrawingAnimation(sectionIndex, section.content, duration);
                break;
            case 'fade_in':
            case 'slide_in':
                setAnimatedContent(prev => ({ ...prev, [sectionIndex]: section.content }));
                setIsAnimating(prev => ({ ...prev, [sectionIndex]: true }));
                setTimeout(() => {
                    setIsAnimating(prev => ({ ...prev, [sectionIndex]: false }));
                }, duration);
                break;
            default:
                setAnimatedContent(prev => ({ ...prev, [sectionIndex]: section.content }));
                setIsAnimating(prev => ({ ...prev, [sectionIndex]: false }));
        }
    }, [content, defaultAnimationType, startTypingAnimation, startDrawingAnimation]);

    // Handle play/pause
    const handlePlayPause = useCallback(() => {
        if (!hasStarted) {
            setHasStarted(true);
            setIsPlaying(true);
            startSectionAnimation(0);
        } else {
            setIsPlaying(!isPlaying);
        }
    }, [hasStarted, isPlaying, startSectionAnimation]);

    // Handle section navigation
    const goToSection = useCallback((sectionIndex: number) => {
        if (sectionIndex >= 0 && sectionIndex < content.length) {
            setActiveSection(sectionIndex);
            startSectionAnimation(sectionIndex);
        }
    }, [content.length, startSectionAnimation]);

    // Auto-advance to next section
    useEffect(() => {
        if (isPlaying && !isAnimating[activeSection] && hasStarted) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            
            timerRef.current = window.setTimeout(() => {
                if (activeSection < content.length - 1) {
                    const nextSection = activeSection + 1;
                    setActiveSection(nextSection);
                    startSectionAnimation(nextSection);
                } else {
                    setIsPlaying(false);
                }
            }, 1500); // Wait 1.5 seconds after animation completes
        }
        
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [isPlaying, isAnimating, activeSection, hasStarted, content.length, startSectionAnimation]);

    // Cleanup animations on unmount
    useEffect(() => {
        return () => {
            Object.values(animationRefs.current).forEach(interval => {
                clearInterval(interval);
            });
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    if (isLoading) {
        return (
            <Card className="w-full h-[600px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <CardContent className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <p className="text-slate-600">Generating animated lesson...</p>
                </CardContent>
            </Card>
        );
    }

    if (!content || content.length === 0) {
        return (
            <Card className="w-full h-[600px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <CardContent className="flex flex-col items-center gap-4 text-center">
                    <BookOpen className="h-16 w-16 text-slate-400" />
                    <p className="text-slate-600 text-lg">Generate an animated lesson to see the preview</p>
                </CardContent>
            </Card>
        );
    }

    const getThemeClasses = () => {
        switch (theme) {
            case 'dark':
                return 'bg-gradient-to-br from-slate-800 to-slate-900 text-white';
            case 'colorful':
                return 'bg-gradient-to-br from-purple-400 to-blue-500 text-white';
            case 'minimal':
                return 'bg-background text-foreground';
            default:
                return 'bg-gradient-to-br from-muted to-blue-50 dark:from-card dark:to-card text-foreground';
        }
    };

    const getSectionContentClasses = (section: AnimatedLessonSection, index: number) => {
        const baseClasses = "p-6 rounded-xl shadow-lg min-h-[200px] flex items-center justify-center transition-all duration-500";
        
        if (theme === 'dark') {
            return `${baseClasses} bg-slate-700/80 backdrop-blur-sm`;
        } else if (theme === 'colorful') {
            return `${baseClasses} bg-background/95 text-foreground`;
        } else if (theme === 'minimal') {
            return `${baseClasses} bg-muted border border-border`;
        }
        
        // Default theme with section type variations
        let sectionBg = "bg-background/80 dark:bg-card/80";
        if (section.animation_type === 'drawing') {
            sectionBg = "bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-orange-400";
        }
        
        return `${baseClasses} ${sectionBg} backdrop-blur-sm`;
    };

    return (
        <Card className={cn("w-full h-[700px] overflow-hidden", getThemeClasses())}>
            {/* Header */}
            <CardHeader className="flex flex-row items-center justify-between p-6 bg-background/95 dark:bg-card/95 backdrop-blur-sm border-b">
                <CardTitle className="text-2xl font-semibold text-foreground">
                    Animated Lesson Preview
                </CardTitle>
                <div className="flex items-center gap-2 min-w-[150px]">
                    <Progress 
                        value={Math.round(((activeSection + 1) / content.length) * 100)}
                        className="flex-1"
                    />
                    <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
                        {activeSection + 1}/{content.length}
                    </span>
                </div>
            </CardHeader>

            {/* Content */}
            <CardContent className="flex-1 flex items-center justify-center p-8 overflow-hidden">
                <div className="w-full max-w-4xl text-center">
                    {content.map((section: AnimatedLessonSection, index: number) => (
                        <div
                            key={index}
                            className={cn(
                                "transition-all duration-600 ease-in-out",
                                index === activeSection 
                                    ? "opacity-100 transform translate-y-0" 
                                    : "opacity-0 transform translate-y-4 absolute"
                            )}
                            style={{ display: index === activeSection ? 'block' : 'none' }}
                        >
                            <h3 className="text-3xl font-semibold mb-8 text-foreground">
                                {section.heading}
                            </h3>
                            <div className={getSectionContentClasses(section, index)}>
                                {section.animation_type === 'typing' ? (
                                    <span className="font-mono text-lg leading-relaxed">
                                        {animatedContent[index] || ''}
                                        {isAnimating[index] && (
                                            <span className="animate-pulse ml-1 font-bold text-blue-600">|</span>
                                        )}
                                    </span>
                                ) : section.animation_type === 'drawing' ? (
                                    <div className="text-lg leading-relaxed font-medium relative">
                                        {animatedContent[index] || ''}
                                        {isAnimating[index] && (
                                            <span className="ml-2 animate-bounce">✏️</span>
                                        )}
                                    </div>
                                ) : (
                                    <div 
                                        className={cn(
                                            "text-lg leading-relaxed",
                                            section.animation_type === 'fade_in' && isAnimating[index] && "animate-in fade-in duration-2000",
                                            section.animation_type === 'slide_in' && isAnimating[index] && "animate-in slide-in-from-left duration-2000"
                                        )}
                                    >
                                        {animatedContent[index] || section.content}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>

            {/* Controls */}
            <div className="p-6 bg-background/95 dark:bg-card/95 backdrop-blur-sm border-t">
                <div className="flex justify-center items-center gap-4 mb-6">
                    <Button
                        onClick={handlePlayPause}
                        size="lg"
                        className="w-14 h-14 rounded-full"
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? (
                            <Pause className="h-6 w-6" />
                        ) : (
                            <Play className="h-6 w-6" />
                        )}
                    </Button>
                    
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToSection(activeSection - 1)}
                        disabled={activeSection <= 0}
                        className="w-10 h-10 rounded-full"
                        title="Previous"
                    >
                        <SkipBack className="h-4 w-4" />
                    </Button>
                    
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToSection(activeSection + 1)}
                        disabled={activeSection >= content.length - 1}
                        className="w-10 h-10 rounded-full"
                        title="Next"
                    >
                        <SkipForward className="h-4 w-4" />
                    </Button>
                </div>

                {/* Timeline */}
                <div className="flex justify-center items-center gap-2 flex-wrap">
                    {content.map((_: AnimatedLessonSection, index: number) => (
                        <button
                            key={index}
                            className={cn(
                                "w-10 h-10 rounded-full border-2 flex items-center justify-center font-medium transition-all duration-300 hover:scale-110",
                                index === activeSection 
                                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/40" 
                                    : index < activeSection
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200"
                            )}
                            onClick={() => goToSection(index)}
                        >
                            {index + 1}
                        </button>
                    ))}
                </div>
            </div>
        </Card>
    );
};

export default AnimatedLessonRenderer;
