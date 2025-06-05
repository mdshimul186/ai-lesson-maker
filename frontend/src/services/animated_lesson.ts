
import { request } from '../utils/request';

// Content block interface for individual animated elements
export interface ContentBlock {
    content: string;
    content_type: 'text' | 'list' | 'code' | 'mermaid' | 'paragraph';
    animation_type: 'typing' | 'fade_in' | 'slide_in' | 'drawing';
    duration?: number;
    language?: string; // For code blocks
    mermaid_diagram?: string; // For mermaid diagrams
}

// Section interface with multiple content blocks
export interface AnimatedSection {
    heading: string;
    content_blocks: ContentBlock[];
    duration: number;
}

export interface AnimatedLessonRequest {
    task_id?: string;
    title: string;
    description?: string;
    prompt: string;
    language?: string;
    render_mode: 'markdown' | 'mermaid' | 'mixed';
    voice_name: string;
    voice_rate?: number;
    include_subtitles?: boolean;
    theme?: string;
    font_family?: string;
    background_color?: string;
    text_color?: string;
    scenes?: number;
}

export interface AnimatedLessonResponse {
    success: boolean;
    data?: {
        task_id: string;
        content?: AnimatedSection[];
        video_url?: string;
        task_folder_content?: Record<string, string>;
    };
    message?: string;
}

export async function generateAnimatedLesson(payload: AnimatedLessonRequest): Promise<AnimatedLessonResponse> {
    try {
        return await request<AnimatedLessonResponse>({
            url: '/api/animated-lesson/generate',
            method: 'POST',
            data: payload
        });
    } catch (error) {
        console.error('Error generating animated lesson:', error);
        throw error;
    }
}
