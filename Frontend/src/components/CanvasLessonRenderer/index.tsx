import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Settings,
  Loader2
} from 'lucide-react';
import mermaid from 'mermaid';

interface Section {
    heading: string;
    content: string;
    content_type?: string;
    animation_type?: string;
    render_mode?: string;
    mermaid_diagram?: string;
    duration?: number;
}

interface CanvasLessonRendererProps {
    taskResult?: {
        content?: Section[];
        theme?: string;
        render_mode?: string;
    };    isLoading?: boolean;
}

const CanvasLessonRenderer: React.FC<CanvasLessonRendererProps> = ({ taskResult, isLoading }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [currentSection, setCurrentSection] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [animationProgress, setAnimationProgress] = useState(0);
    const [theme, setTheme] = useState('light');
    const [fontSize, setFontSize] = useState(18);
    const [animationSpeed, setAnimationSpeed] = useState(1.0);
    
    const sections = useMemo(() => taskResult?.content || [], [taskResult]);
    
    // Initialize mermaid
    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose',
        });
    }, [theme]);    // Canvas setup and theme management
    useEffect(() => {
        if (!canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const resizeCanvas = () => {
            // Set canvas size to 16:9 ratio
            const container = canvas.parentElement;
            if (container) {
                const containerWidth = Math.min(container.clientWidth - 40, 1200); // Max width 1200px
                const aspectRatio = 16 / 9;
                
                // Set actual canvas resolution
                canvas.width = containerWidth;
                canvas.height = containerWidth / aspectRatio;
                
                // Set display size with CSS to maintain aspect ratio
                canvas.style.width = `${containerWidth}px`;
                canvas.style.height = `${containerWidth / aspectRatio}px`;
                
                // Enable high DPI support
                const dpr = window.devicePixelRatio || 1;
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);
                
                // Apply theme after resize
                applyTheme();
            }
        };
        
        const applyTheme = () => {
            const themes = {
                light: { bg: '#ffffff', text: '#333333', accent: '#1890ff', code: '#f6f8fa', codeBorder: '#e1e4e8' },
                dark: { bg: '#1f1f1f', text: '#ffffff', accent: '#40a9ff', code: '#2d3748', codeBorder: '#4a5568' },
                colorful: { bg: '#f0f9ff', text: '#1e40af', accent: '#3b82f6', code: '#fef3c7', codeBorder: '#f59e0b' },
                minimal: { bg: '#fafafa', text: '#666666', accent: '#8c8c8c', code: '#f5f5f5', codeBorder: '#d9d9d9' }
            };
            
            const currentTheme = themes[theme as keyof typeof themes] || themes.light;
            
            // Clear canvas with theme background
            ctx.fillStyle = currentTheme.bg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Set default font with better rendering
            ctx.textBaseline = 'top';
            ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
            ctx.fillStyle = currentTheme.text;
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
        
    }, [theme, fontSize]);

    // Animation engine
    useEffect(() => {
        if (!isPlaying || !sections[currentSection] || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const section = sections[currentSection];
        const duration = (section.duration || 4) * 1000 / animationSpeed; // Convert to milliseconds and apply speed
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            setAnimationProgress(progress * 100);
            
            // Clear canvas
            const themes = {
                light: { bg: '#ffffff', text: '#333333', accent: '#1890ff' },
                dark: { bg: '#1f1f1f', text: '#ffffff', accent: '#40a9ff' },
                colorful: { bg: '#f0f9ff', text: '#1e40af', accent: '#3b82f6' },
                minimal: { bg: '#fafafa', text: '#666666', accent: '#8c8c8c' }
            };
            
            const currentTheme = themes[theme as keyof typeof themes] || themes.light;
            ctx.fillStyle = currentTheme.bg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Render content based on animation type
            renderSectionContent(ctx, section, progress, currentTheme);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete
                setIsPlaying(false);
                setAnimationProgress(100);
            }
        };
        
        animate();
        
    }, [isPlaying, currentSection, sections, theme, fontSize, animationSpeed]);    const renderSectionContent = (ctx: CanvasRenderingContext2D, section: Section, progress: number, theme: any) => {
        const { width } = ctx.canvas;
        const padding = 40;
        const animationType = section.animation_type || 'fade_in';
        
        // Parse content and separate code blocks
        const content = section.content;
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const codeBlocks: Array<{match: string, language: string, code: string, index: number}> = [];
        let match;
        
        while ((match = codeBlockRegex.exec(content)) !== null) {
            codeBlocks.push({
                match: match[0],
                language: match[1] || 'text',
                code: match[2],
                index: match.index
            });
        }        // Remove code blocks from content for text rendering
        const textContent = content.replace(codeBlockRegex, '[CODE_BLOCK]');
        // Simple markdown parsing for canvas - just strip markdown syntax
        const cleanTextContent = textContent
            .replace(/^#+\s*/gm, '') // Remove headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/`([^`]*)`/g, '$1') // Remove inline code
            .replace(/^\s*[-*+]\s+/gm, '• '); // Convert lists to bullets
          ctx.font = `bold ${fontSize + 6}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        ctx.fillStyle = theme.accent;
        
        // Render heading immediately (no animation - always visible)
        const headingY = padding + 35;
        ctx.fillText(section.heading, padding, headingY);
        
        // Render content
        ctx.font = `${fontSize}px 'Segoe UI', sans-serif`;
        const contentStartY = headingY + 50;
        let currentY = contentStartY;
        const lineHeight = fontSize + 8;
        const maxWidth = width - padding * 2;
        
        // Split content into parts (text and code blocks)
        const parts = cleanTextContent.split('[CODE_BLOCK]');
        let codeBlockIndex = 0;
        
        parts.forEach((part, partIndex) => {
            if (part.trim()) {
                // Render text part
                currentY = renderTextContent(ctx, part.trim(), padding, currentY, maxWidth, lineHeight, theme, animationType, progress, partIndex, parts.length);
            }
            
            // Render code block if exists
            if (codeBlockIndex < codeBlocks.length && partIndex < parts.length - 1) {
                const codeBlock = codeBlocks[codeBlockIndex];
                currentY = renderCodeBlock(ctx, codeBlock, padding, currentY, maxWidth, theme, animationType, progress);
                codeBlockIndex++;
            }
        });
        
        // Render mermaid diagram if present
        if (section.mermaid_diagram && section.render_mode !== 'markdown') {
            renderMermaidDiagram(ctx, section.mermaid_diagram, progress, theme, currentY + 30);
        }
    };

    const renderTextContent = (ctx: CanvasRenderingContext2D, text: string, x: number, startY: number, maxWidth: number, lineHeight: number, _theme: any, animationType: string, progress: number, partIndex: number, totalParts: number) => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        if (currentLine) lines.push(currentLine);
        
        // Calculate progress for this part
        const partProgress = Math.max(0, Math.min(1, (progress * totalParts) - partIndex));
        
        // Render lines with animation
        lines.forEach((line, index) => {
            const y = startY + index * lineHeight;
            
            if (animationType === 'typing') {
                const lineProgress = Math.max(0, (partProgress * lines.length) - index);
                const chars = Math.floor(line.length * Math.min(lineProgress, 1));
                ctx.fillText(line.substring(0, chars), x, y);
                
                // Add cursor for current line
                if (lineProgress > 0 && lineProgress < 1) {
                    const textWidth = ctx.measureText(line.substring(0, chars)).width;
                    ctx.fillText('|', x + textWidth, y);
                }
            } else if (animationType === 'drawing') {
                // Word-by-word reveal with drawing effect
                const lineWords = line.split(' ');
                const lineProgress = Math.max(0, (partProgress * lines.length) - index);
                const wordsToShow = Math.floor(lineWords.length * Math.min(lineProgress, 1));
                
                lineWords.slice(0, wordsToShow).forEach((word, wordIndex) => {
                    const wordX = x + ctx.measureText(lineWords.slice(0, wordIndex).join(' ') + (wordIndex > 0 ? ' ' : '')).width;
                    ctx.fillText(word, wordX, y);
                });
                
                // Add drawing cursor
                if (lineProgress > 0 && lineProgress < 1 && wordsToShow < lineWords.length) {
                    const cursorX = x + ctx.measureText(lineWords.slice(0, wordsToShow).join(' ') + (wordsToShow > 0 ? ' ' : '')).width;
                    ctx.fillText('✏️', cursorX, y);
                }
            } else if (animationType === 'slide_in') {
                const lineProgress = Math.max(0, (partProgress * lines.length) - index);
                const slideX = x + (1 - Math.min(lineProgress, 1)) * -300;
                ctx.fillText(line, slideX, y);
            } else if (animationType === 'fade_in') {
                const lineProgress = Math.max(0, (partProgress * lines.length) - index);
                ctx.globalAlpha = Math.min(lineProgress, 1);
                ctx.fillText(line, x, y);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillText(line, x, y);
            }
        });
        
        return startY + lines.length * lineHeight;
    };    const renderCodeBlock = (ctx: CanvasRenderingContext2D, codeBlock: any, x: number, startY: number, maxWidth: number, theme: any, animationType: string, progress: number) => {
        const codeLines = codeBlock.code.trim().split('\n');
        const lineHeight = fontSize + 6;
        const codePadding = 20;
        const blockHeight = (codeLines.length * lineHeight) + (codePadding * 2) + 30; // Extra space for language label
        
        // Apply animation alpha
        const blockProgress = Math.min(progress * 1.5, 1); // Code blocks appear slightly faster
        ctx.globalAlpha = blockProgress;
        
        // Draw code block background with rounded corners
        ctx.fillStyle = theme.code;
        ctx.fillRect(x, startY, maxWidth, blockHeight);
        
        // Draw border
        ctx.strokeStyle = theme.codeBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, startY, maxWidth, blockHeight);
        
        // Draw language label with background
        const labelHeight = 25;
        ctx.fillStyle = theme.accent;
        ctx.fillRect(x, startY, maxWidth, labelHeight);
        
        // Language text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fontSize - 2}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(`${codeBlock.language.toUpperCase() || 'CODE'}`, x + codePadding, startY + labelHeight / 2);
        
        // Reset text baseline and prepare for code
        ctx.textBaseline = 'top';
        ctx.fillStyle = theme.text;
        ctx.font = `${fontSize - 1}px 'Consolas', 'Fira Code', 'Monaco', monospace`;
        
        // Draw code lines with proper spacing
        codeLines.forEach((line: string, index: number) => {
            const y = startY + labelHeight + codePadding + (index * lineHeight);
            
            if (animationType === 'typing' && blockProgress > 0.3) {
                // Start typing animation after block appears
                const typingProgress = Math.max(0, (blockProgress - 0.3) / 0.7);
                const lineProgress = Math.max(0, (typingProgress * codeLines.length) - index);
                const chars = Math.floor(line.length * Math.min(lineProgress, 1));
                const visibleText = line.substring(0, chars);
                
                // Add syntax highlighting colors for common keywords
                const coloredLine = highlightSyntax(visibleText, theme);
                ctx.fillText(coloredLine.text, x + codePadding, y);
                
                // Add typing cursor
                if (lineProgress > 0 && lineProgress < 1) {
                    const textWidth = ctx.measureText(visibleText).width;
                    ctx.fillStyle = theme.accent;
                    ctx.fillText('|', x + codePadding + textWidth, y);
                    ctx.fillStyle = theme.text;
                }
            } else if (blockProgress > 0.2) {
                // Show full line after block appears
                const coloredLine = highlightSyntax(line, theme);
                ctx.fillText(coloredLine.text, x + codePadding, y);
            }
        });
        
        ctx.globalAlpha = 1;
        
        // Reset font for next content
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        
        return startY + blockHeight + 20;
    };
    
    // Simple syntax highlighting helper
    const highlightSyntax = (line: string, theme: any) => {
        // This is a simplified version - you could expand this for better highlighting
        return { text: line, color: theme.text };
    };    const renderMermaidDiagram = (ctx: CanvasRenderingContext2D, mermaidCode: string, progress: number, theme: any, startY: number) => {
        const diagramWidth = Math.min(500, ctx.canvas.width - 100);
        const diagramHeight = 200;
        const x = (ctx.canvas.width - diagramWidth) / 2;
        
        ctx.globalAlpha = progress;
        
        // Draw diagram container
        ctx.fillStyle = theme.code;
        ctx.fillRect(x, startY, diagramWidth, diagramHeight);
        ctx.strokeStyle = theme.codeBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, startY, diagramWidth, diagramHeight);
        
        // Parse and render based on mermaid type
        const mermaidType = detectMermaidType(mermaidCode);
        
        switch (mermaidType) {
            case 'flowchart':
                renderFlowchartDiagram(ctx, x, startY, diagramWidth, diagramHeight, theme, progress);
                break;
            case 'sequence':
                renderSequenceDiagram(ctx, x, startY, diagramWidth, diagramHeight, theme, progress);
                break;
            case 'gantt':
                renderGanttDiagram(ctx, x, startY, diagramWidth, diagramHeight, theme, progress);
                break;
            default:
                renderGenericDiagram(ctx, x, startY, diagramWidth, diagramHeight, theme, progress, mermaidType);
        }
        
        ctx.globalAlpha = 1;
    };
    
    const detectMermaidType = (code: string): string => {
        const firstLine = code.trim().split('\n')[0].toLowerCase();
        if (firstLine.includes('flowchart') || firstLine.includes('graph')) return 'flowchart';
        if (firstLine.includes('sequencediagram')) return 'sequence';
        if (firstLine.includes('gantt')) return 'gantt';
        if (firstLine.includes('classDiagram')) return 'class';
        if (firstLine.includes('pie')) return 'pie';
        return 'flowchart'; // default
    };
    
    const renderFlowchartDiagram = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, theme: any, progress: number) => {
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const nodeWidth = 100;
        const nodeHeight = 40;
        
        // Title
        ctx.fillStyle = theme.accent;
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('📊 Flowchart Diagram', centerX, y + 25);
        
        // Node 1
        const node1Y = centerY - 30;
        if (progress > 0.3) {
            ctx.fillStyle = theme.accent;
            ctx.fillRect(centerX - nodeWidth/2 - 80, node1Y, nodeWidth, nodeHeight);
            ctx.fillStyle = '#ffffff';
            ctx.font = `${fontSize - 2}px sans-serif`;
            ctx.fillText('Start', centerX - 80, node1Y + nodeHeight/2 + 5);
        }
        
        // Arrow 1
        if (progress > 0.5) {
            ctx.strokeStyle = theme.accent;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX - 80 + nodeWidth/2, node1Y + nodeHeight/2);
            ctx.lineTo(centerX - nodeWidth/2, node1Y + nodeHeight/2);
            ctx.stroke();
            
            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(centerX - nodeWidth/2 - 8, node1Y + nodeHeight/2 - 5);
            ctx.lineTo(centerX - nodeWidth/2, node1Y + nodeHeight/2);
            ctx.lineTo(centerX - nodeWidth/2 - 8, node1Y + nodeHeight/2 + 5);
            ctx.stroke();
        }
        
        // Node 2 (Decision)
        if (progress > 0.7) {
            ctx.fillStyle = theme.accent;
            ctx.beginPath();
            ctx.moveTo(centerX, node1Y - 10);
            ctx.lineTo(centerX + 50, node1Y + nodeHeight/2);
            ctx.lineTo(centerX, node1Y + nodeHeight + 10);
            ctx.lineTo(centerX - 50, node1Y + nodeHeight/2);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Process', centerX, node1Y + nodeHeight/2 + 5);
        }
        
        // Arrow 2
        if (progress > 0.9) {
            ctx.strokeStyle = theme.accent;
            ctx.beginPath();
            ctx.moveTo(centerX + 50, node1Y + nodeHeight/2);
            ctx.lineTo(centerX + 80, node1Y + nodeHeight/2);
            ctx.stroke();
            
            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(centerX + 80 - 8, node1Y + nodeHeight/2 - 5);
            ctx.lineTo(centerX + 80, node1Y + nodeHeight/2);
            ctx.lineTo(centerX + 80 - 8, node1Y + nodeHeight/2 + 5);
            ctx.stroke();
        }
        
        // Node 3
        if (progress > 0.9) {
            ctx.fillStyle = theme.accent;
            ctx.fillRect(centerX + 80 - nodeWidth/2, node1Y, nodeWidth, nodeHeight);
            ctx.fillStyle = '#ffffff';
            ctx.fillText('End', centerX + 80, node1Y + nodeHeight/2 + 5);
        }
        
        ctx.textAlign = 'left';
    };
    
    const renderSequenceDiagram = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, theme: any, progress: number) => {
        const centerX = x + width / 2;
        
        // Title
        ctx.fillStyle = theme.accent;
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('📋 Sequence Diagram', centerX, y + 25);
        
        // Actors
        const actorY = y + 50;
        const actor1X = x + 80;
        const actor2X = x + width - 80;
        
        if (progress > 0.3) {
            ctx.fillStyle = theme.accent;
            ctx.fillRect(actor1X - 30, actorY, 60, 30);
            ctx.fillStyle = '#ffffff';
            ctx.font = `${fontSize - 2}px sans-serif`;
            ctx.fillText('User', actor1X, actorY + 20);
            
            ctx.fillStyle = theme.accent;
            ctx.fillRect(actor2X - 30, actorY, 60, 30);
            ctx.fillStyle = '#ffffff';
            ctx.fillText('System', actor2X, actorY + 20);
        }
        
        // Lifelines
        if (progress > 0.5) {
            ctx.strokeStyle = theme.codeBorder;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(actor1X, actorY + 30);
            ctx.lineTo(actor1X, y + height - 20);
            ctx.moveTo(actor2X, actorY + 30);
            ctx.lineTo(actor2X, y + height - 20);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Message arrows
        if (progress > 0.7) {
            const messageY = actorY + 60;
            ctx.strokeStyle = theme.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(actor1X, messageY);
            ctx.lineTo(actor2X - 10, messageY);
            ctx.stroke();
            
            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(actor2X - 15, messageY - 5);
            ctx.lineTo(actor2X - 5, messageY);
            ctx.lineTo(actor2X - 15, messageY + 5);
            ctx.stroke();
            
            ctx.fillStyle = theme.text;
            ctx.font = `${fontSize - 3}px sans-serif`;
            ctx.fillText('Request', actor1X + 20, messageY - 5);
        }
        
        ctx.textAlign = 'left';
    };
    
    const renderGanttDiagram = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, _height: number, theme: any, progress: number) => {
        const centerX = x + width / 2;
        
        // Title
        ctx.fillStyle = theme.accent;
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('📅 Gantt Chart', centerX, y + 25);
        
        const chartY = y + 50;
        const barHeight = 25;
        const barSpacing = 35;
        
        // Tasks
        const tasks = ['Design', 'Development', 'Testing'];
        tasks.forEach((task, index) => {
            const taskY = chartY + index * barSpacing;
            
            if (progress > 0.3 + index * 0.2) {
                // Task label
                ctx.fillStyle = theme.text;
                ctx.font = `${fontSize - 2}px sans-serif`;
                ctx.textAlign = 'left';
                ctx.fillText(task, x + 20, taskY + barHeight/2 + 5);
                
                // Task bar
                const barX = x + 100;
                const barWidth = (width - 140) * (0.3 + index * 0.2);
                ctx.fillStyle = theme.accent;
                ctx.fillRect(barX, taskY, barWidth, barHeight);
                
                // Progress indicator
                const progressWidth = barWidth * Math.min(progress * 2, 1);
                ctx.fillStyle = theme.text;
                ctx.fillRect(barX, taskY, progressWidth, barHeight);
            }
        });
        
        ctx.textAlign = 'left';
    };
    
    const renderGenericDiagram = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, theme: any, progress: number, type: string) => {
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        
        // Title
        ctx.fillStyle = theme.accent;
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`📊 ${type.charAt(0).toUpperCase() + type.slice(1)} Diagram`, centerX, y + 25);
        
        // Generic visualization
        if (progress > 0.3) {
            ctx.fillStyle = theme.accent;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI * progress);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = `${fontSize - 2}px sans-serif`;
            ctx.fillText('Interactive', centerX, centerY + 5);
        }
        
        ctx.textAlign = 'left';
    };

    const handlePlay = () => {
        setIsPlaying(true);
        setAnimationProgress(0);
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

    if (isLoading) {
        return (
            <div className="w-full h-full p-5">
                <Card>
                    <CardHeader>
                        <CardTitle>Generating Animated Lesson...</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center gap-5 py-15 text-center">
                            <div className="relative">
                                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                            </div>
                            <span className="text-gray-600">Creating your animated lesson content...</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!sections.length) {
        return (
            <div className="w-full h-full p-5">
                <Card>
                    <CardHeader>
                        <CardTitle>Canvas Lesson Renderer</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-center items-center py-15 text-center">
                            <span className="text-gray-500">No lesson content available. Generate a lesson to see the animation preview.</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full h-full p-5">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Canvas Lesson Renderer - Section {currentSection + 1} of {sections.length}</CardTitle>
                    <div className="flex items-center gap-2">
                        <Select value={theme} onValueChange={setTheme}>
                            <SelectTrigger className="w-24">
                                <SelectValue placeholder="Theme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="colorful">Colorful</SelectItem>
                                <SelectItem value="minimal">Minimal</SelectItem>
                            </SelectContent>
                        </Select>
                        <Settings className="h-4 w-4 text-gray-500" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-5 flex justify-center items-center w-full max-w-5xl mx-auto">
                        <canvas 
                            ref={canvasRef}
                            className="w-full h-auto aspect-video max-w-full shadow-lg bg-background dark:bg-card rounded-lg border-2 border-border"
                        />
                    </div>
                    
                    <div className="flex justify-center items-center p-5 border-t border-b border-gray-100">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2">
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
                                    size="sm"
                                >
                                    {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                                    {isPlaying ? 'Pause' : 'Play'}
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
                            
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Progress:</span>
                                <div className="w-48">
                                    <Progress 
                                        value={animationProgress}
                                        className="h-2"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-center items-center p-4 bg-muted dark:bg-card rounded-md mt-4">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Font Size:</span>
                                <div className="w-24">
                                    <Slider 
                                        min={12} 
                                        max={32} 
                                        value={[fontSize]} 
                                        onValueChange={(values) => setFontSize(values[0])}
                                        className="w-24"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Speed:</span>
                                <div className="w-24">
                                    <Slider 
                                        min={0.5} 
                                        max={3} 
                                        step={0.1}
                                        value={[animationSpeed]} 
                                        onValueChange={(values) => setAnimationSpeed(values[0])}
                                        className="w-24"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {sections[currentSection] && (
                        <div className="mt-5 p-4 bg-blue-50 rounded-md border-l-4 border-blue-500">
                            <div className="space-y-2">
                                <h3 className="font-semibold text-foreground">{sections[currentSection].heading}</h3>
                                <p className="text-sm text-gray-600">
                                    Animation: {sections[currentSection].animation_type || 'default'} | 
                                    Type: {sections[currentSection].content_type || 'text'} |
                                    Mode: {sections[currentSection].render_mode || 'mixed'}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default CanvasLessonRenderer;
