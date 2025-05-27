
import { request } from '../utils/request';

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
}

export interface AnimatedLessonResponse {
    success: boolean;
    data?: {
        task_id: string;
        content?: any[];
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
