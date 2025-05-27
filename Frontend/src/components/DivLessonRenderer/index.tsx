import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Space, Typography, Progress, Select, Slider } from 'antd';
import {
    PlayCircleOutlined,
    PauseCircleOutlined,
    StepBackwardOutlined,
    StepForwardOutlined,
    SettingOutlined
} from '@ant-design/icons';
import { marked } from 'marked';
import mermaid from 'mermaid';
import styles from './index.module.css';

const { Text } = Typography;
const { Option } = Select;

interface Section {
    heading: string;
    content: string;
    duration: number;
    animation_type: string;
    content_type: string;
    render_mode: string;
    mermaid_diagram?: string;
}

interface DivLessonRendererProps {
    sections: Section[];
    isLoading?: boolean;
}

const DivLessonRenderer: React.FC<DivLessonRendererProps> = ({ sections, isLoading }) => {
    const [currentSection, setCurrentSection] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [animationProgress, setAnimationProgress] = useState(0);
    const [theme, setTheme] = useState<'light' | 'dark' | 'colorful' | 'minimal'>('light');
    const [fontSize, setFontSize] = useState(18);
    const [animationSpeed, setAnimationSpeed] = useState(1);
    const [autoProgress, setAutoProgress] = useState(true);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>();
    const timeoutRef = useRef<number>();

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
        const duration = (section.duration || 4) * 1000 / animationSpeed;
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

    const renderContent = () => {
        if (!sections[currentSection]) return null;
        
        const section = sections[currentSection];
        const progress = animationProgress / 100;
        
        return (
            <div 
                ref={containerRef}
                className={`${styles.lessonContainer} ${styles[theme]}`}
                style={{ fontSize: `${fontSize}px` }}
            >
                {/* Title - always visible immediately */}
                <div className={styles.title}>
                    {section.heading}
                </div>
                
                {/* Content with animation */}
                <div className={styles.content}>
                    {renderAnimatedContent(section, progress)}
                </div>
                
                {/* Mermaid diagram if present */}
                {section.mermaid_diagram && section.render_mode !== 'markdown' && (
                    <div className={styles.mermaidContainer} style={{ opacity: progress }}>
                        <MermaidDiagram code={section.mermaid_diagram} />
                    </div>
                )}
            </div>
        );
    };

    const renderAnimatedContent = (section: Section, progress: number) => {
        const content = section.content;
        const animationType = section.animation_type || 'fade_in';
        
        // Extract code blocks
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        
        while ((match = codeBlockRegex.exec(content)) !== null) {
            // Add text before code block
            if (match.index > lastIndex) {
                parts.push({
                    type: 'text',
                    content: content.slice(lastIndex, match.index)
                });
            }
            
            // Add code block
            parts.push({
                type: 'code',
                language: match[1] || 'text',
                content: match[2]
            });
            
            lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text
        if (lastIndex < content.length) {
            parts.push({
                type: 'text',
                content: content.slice(lastIndex)
            });
        }
        
        return parts.map((part, index) => (
            <div key={index} className={styles.contentPart}>
                {part.type === 'text' ? (
                    <AnimatedText 
                        text={part.content} 
                        animationType={animationType}
                        progress={progress}
                        partIndex={index}
                        totalParts={parts.length}
                    />
                ) : (
                    <AnimatedCodeBlock
                        language={part.language || 'text'}
                        code={part.content}
                        animationType={animationType}
                        progress={progress}
                        partIndex={index}
                        totalParts={parts.length}
                    />
                )}
            </div>
        ));
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <Card title="Generating Animated Lesson...">
                    <div className={styles.loadingState}>
                        <Progress type="circle" percent={25} />
                        <Text>Creating your animated lesson content...</Text>
                    </div>
                </Card>
            </div>
        );
    }

    if (!sections.length) {
        return (
            <div className={styles.container}>
                <Card title="Lesson Renderer">
                    <div className={styles.emptyState}>
                        <Text>No lesson content available. Generate a lesson to see the animation preview.</Text>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Card 
                title={`Animated Lesson - Section ${currentSection + 1} of ${sections.length}`}
                extra={
                    <Space>
                        <Select value={theme} onChange={setTheme} style={{ width: 100 }}>
                            <Option value="light">Light</Option>
                            <Option value="dark">Dark</Option>
                            <Option value="colorful">Colorful</Option>
                            <Option value="minimal">Minimal</Option>
                        </Select>
                        <SettingOutlined />
                    </Space>
                }
            >
                {/* Main lesson display - 1280x720 aspect ratio */}
                <div className={styles.lessonDisplay}>
                    {renderContent()}
                </div>
                
                {/* Controls */}
                <div className={styles.controls}>
                    <Space size="large">
                        <Space>
                            <Button 
                                icon={<StepBackwardOutlined />} 
                                onClick={handlePrevious}
                                disabled={currentSection === 0}
                            />
                            <Button 
                                type="primary"
                                icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                                onClick={isPlaying ? handlePause : handlePlay}
                                size="large"
                            >
                                {isPlaying ? 'Pause' : 'Play'}
                            </Button>
                            <Button 
                                icon={<StepForwardOutlined />} 
                                onClick={handleNext}
                                disabled={currentSection === sections.length - 1}
                            />
                        </Space>
                        
                        <div className={styles.progressContainer}>
                            <Text>Progress:</Text>
                            <Progress 
                                percent={Math.round(animationProgress)} 
                                size="small" 
                                style={{ width: 200 }}
                                strokeColor={theme === 'dark' ? '#40a9ff' : '#1890ff'}
                            />
                        </div>
                    </Space>
                </div>
                
                {/* Settings */}
                <div className={styles.settings}>
                    <Space size="large">
                        <Space>
                            <Text>Font Size:</Text>
                            <Slider 
                                min={14} 
                                max={28} 
                                value={fontSize} 
                                onChange={setFontSize}
                                style={{ width: 100 }}
                            />
                        </Space>
                        <Space>
                            <Text>Speed:</Text>
                            <Slider 
                                min={0.5} 
                                max={3} 
                                step={0.1}
                                value={animationSpeed} 
                                onChange={setAnimationSpeed}
                                style={{ width: 100 }}
                            />
                        </Space>
                        <Space>
                            <Text>Auto-advance:</Text>
                            <Button 
                                type={autoProgress ? 'primary' : 'default'}
                                size="small"
                                onClick={() => setAutoProgress(!autoProgress)}
                            >
                                {autoProgress ? 'ON' : 'OFF'}
                            </Button>
                        </Space>
                    </Space>
                </div>

                {/* Section info */}
                {sections[currentSection] && (
                    <div className={styles.sectionInfo}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Text strong>{sections[currentSection].heading}</Text>
                            <Text type="secondary">
                                Animation: {sections[currentSection].animation_type || 'default'} | 
                                Type: {sections[currentSection].content_type || 'text'} |
                                Mode: {sections[currentSection].render_mode || 'mixed'}
                            </Text>
                        </Space>
                    </div>
                )}
            </Card>
        </div>
    );
};

// Animated text component
interface AnimatedTextProps {
    text: string;
    animationType: string;
    progress: number;
    partIndex: number;
    totalParts: number;
}

const AnimatedText: React.FC<AnimatedTextProps> = ({ text, animationType, progress, partIndex, totalParts }) => {
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
            <div style={getAnimationStyle()}>
                <div dangerouslySetInnerHTML={{ __html: marked(visibleText) as string }} />
                {partProgress > 0 && partProgress < 1 && <span className={styles.cursor}>|</span>}
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
}

const AnimatedCodeBlock: React.FC<AnimatedCodeBlockProps> = ({ 
    language, 
    code, 
    animationType, 
    progress, 
    partIndex, 
    totalParts 
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

    return (
        <div className={styles.codeBlock} style={{ opacity: partProgress > 0.2 ? 1 : 0 }}>
            <div className={styles.codeHeader}>
                <span className={styles.codeLanguage}>{language.toUpperCase()}</span>
            </div>
            <pre className={styles.codeContent}>
                <code>
                    {getVisibleLines().map((line, index) => (
                        <div key={index} className={styles.codeLine}>
                            {line}
                            {animationType === 'typing' && 
                             index === getVisibleLines().length - 1 && 
                             partProgress > 0 && 
                             partProgress < 1 && 
                             <span className={styles.cursor}>|</span>
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
            <div className={styles.mermaidError}>
                <Text type="danger">Error rendering diagram: {error}</Text>
            </div>
        );
    }

    return (
        <div className={styles.mermaidDiagram}>
            <div dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
    );
};

export default DivLessonRenderer;
