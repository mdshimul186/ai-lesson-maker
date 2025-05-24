import { request } from "../utils/request";

export * from './account';  // Export account and payment services

export async function getVoiceList(data: {area: string[]}): Promise<any> {
    return request<any>({
        url: "/api/voice/voices",
        method: "post",
        data,
    });
}

export async function getLLMProviders(): Promise<any> {
    return request<any>({
        url: "/api/llm/providers",
        method: "get",
    });
}

// Define the structure for the video generation request payload
export interface VideoGenerateReq {
    // Core content
    story_prompt?: string;
    segments: number;

    // Video structure and sources
    video_terms?: string | string[];
    resolution?: string; 
    video_aspect?: string; 
    video_concat_mode?: string;
    video_clip_duration?: number;
    video_count?: number;
    video_source?: string;
    video_language?: string;

    // Voice settings
    voice_name: string;
    voice_volume?: number;
    voice_rate?: number; 

    // Background Music
    bgm_type?: string;
    bgm_file?: string;
    bgm_volume?: number;

    // Subtitles and Text
    subtitle_enabled?: boolean; 
    subtitle_position?: string;
    custom_position?: number;
    font_name?: string;
    text_fore_color?: string;
    text_background_color?: boolean | string;
    font_size?: number;
    stroke_color?: string;
    stroke_width?: number;
    
    // Image and Visuals
    image_style?: string;
    visual_content_in_language?: boolean;

    // Technical
    n_threads?: number;
    task_id: string;

    // Assets
    logo_url?: string;
    intro_video_url?: string;
    outro_video_url?: string;

    // Allow additional properties as needed
    [key: string]: any;
}

// Define the structure of the data part of the video generation response
export interface VideoGenerateDataFrontend {
    task_id: string;
    status: string; // Initial status from backend (e.g., PENDING, RECEIVED)
    video_url?: string; // This might be populated if generation is super fast or for direct links
    task_folder_content?: Record<string, any>;
    message?: string;
}

// Define the overall structure of the video generation API response
export interface VideoGenerateRes {
    success: boolean;
    data?: VideoGenerateDataFrontend;
    message?: string;
    // code?: number; // If your API includes a status code
}

export async function generateVideo(data: VideoGenerateReq): Promise<VideoGenerateRes> {
    return request<VideoGenerateRes>({
        url: "/api/video/generate",
        method: "post",
        data,
    });
}

export interface TaskEvent {
    timestamp: string;
    message: string;
    details?: any;
}

export interface Task {
    task_id: string;
    status: string;
    progress: number;
    events: TaskEvent[];
    created_at: string;
    updated_at: string;
    result_url?: string;
    error_message?: string;
    error_details?: any;
    task_folder_content?: Record<string, any>;
}

export async function getTaskStatus(taskId: string): Promise<Task> {
    return request<Task>({
        url: `/api/tasks/${taskId}`,
        method: "get",
    });
}

export async function uploadFile(formData: FormData): Promise<{ success: boolean, message?: string, url?: string }> {
    return request<{ success: boolean, message?: string, url?: string }>({
        url: "/api/files/upload/", // Matches the backend router prefix and endpoint
        method: "post",
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
}

export async function getAllTasks(params?: { limit?: number, skip?: number, status?: string }): Promise<Task[]> {
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (params?.limit) {
        queryParams.append('limit', params.limit.toString());
    }
    if (params?.skip) {
        queryParams.append('skip', params.skip.toString());
    }
    if (params?.status) {
        queryParams.append('status', params.status);
    }
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    return request<Task[]>({
        url: `/api/tasks${queryString}`,
        method: "get",
    });
}