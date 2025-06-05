import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Spin, Empty, Tooltip, Progress, Typography } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, StepBackwardOutlined, StepForwardOutlined } from '@ant-design/icons';
import styles from './index.module.css';

const { Title } = Typography;

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
            <div className={styles.renderer}>
                <div className={styles.loading}>
                    <Spin size="large" />
                    <p>Generating animated lesson...</p>
                </div>
            </div>
        );
    }

    if (!content || content.length === 0) {
        return (
            <div className={styles.renderer}>
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Generate an animated lesson to see the preview"
                />
            </div>
        );
    }

    const themeClass = theme ? styles[`theme_${theme}`] : styles.theme_light;

    return (
        <div className={`${styles.renderer} ${themeClass}`}>
            <div className={styles.header}>
                <Title level={2} className={styles.title}>
                    Animated Lesson Preview
                </Title>
                <div className={styles.progress}>
                    <Progress 
                        percent={Math.round(((activeSection + 1) / content.length) * 100)}
                        size="small"
                        format={() => `${activeSection + 1}/${content.length}`}
                    />
                </div>
            </div>

            <div className={styles.content}>
                {content.map((section: AnimatedLessonSection, index: number) => (
                    <div
                        key={index}
                        className={`${styles.section} ${styles[`section_${section.animation_type || defaultAnimationType}`]} ${
                            index === activeSection ? styles.active : styles.inactive
                        } ${
                            isAnimating[index] ? styles.animating : ''
                        }`}
                        style={{ display: index === activeSection ? 'block' : 'none' }}
                    >
                        <Title level={3} className={styles.sectionTitle}>
                            {section.heading}
                        </Title>
                        <div 
                            className={`${styles.sectionContent} ${
                                section.animation_type === 'fade_in' && isAnimating[index] ? styles.fadeIn :
                                section.animation_type === 'slide_in' && isAnimating[index] ? styles.slideIn : ''
                            }`}
                        >
                            {section.animation_type === 'typing' ? (
                                <span className={styles.typewriter}>
                                    {animatedContent[index] || ''}
                                    {isAnimating[index] && <span className={styles.cursor}>|</span>}
                                </span>
                            ) : section.animation_type === 'drawing' ? (
                                <div className={styles.drawing}>
                                    {animatedContent[index] || ''}
                                    {isAnimating[index] && <span className={styles.drawingCursor}>✏️</span>}
                                </div>
                            ) : (
                                <div>{animatedContent[index] || section.content}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.controls}>
                <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
                    <Button 
                        type="primary"
                        shape="circle"
                        icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                        onClick={handlePlayPause}
                        size="large"
                    />
                </Tooltip>
                
                <Tooltip title="Previous">
                    <Button 
                        shape="circle"
                        icon={<StepBackwardOutlined />}
                        onClick={() => goToSection(activeSection - 1)}
                        disabled={activeSection <= 0}
                    />
                </Tooltip>
                
                <Tooltip title="Next">
                    <Button 
                        shape="circle"
                        icon={<StepForwardOutlined />}
                        onClick={() => goToSection(activeSection + 1)}
                        disabled={activeSection >= content.length - 1}
                    />
                </Tooltip>
            </div>

            <div className={styles.timeline}>
                {content.map((_: AnimatedLessonSection, index: number) => (
                    <div
                        key={index}
                        className={`${styles.timelineItem} ${
                            index === activeSection ? styles.active : ''
                        } ${
                            index < activeSection ? styles.completed : ''
                        }`}
                        onClick={() => goToSection(index)}
                    >
                        <span>{index + 1}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnimatedLessonRenderer;
