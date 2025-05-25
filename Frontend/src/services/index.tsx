import { request } from "../utils/request";
import { cachedApiCall, dedupedApiCall, throttledApiCall } from "../utils/apiUtils";
import { useAccountStore } from "../stores";

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
    queue_position?: number;
}

export async function getTaskStatus(taskId: string): Promise<Task> {
    // Use deduped API call to prevent multiple simultaneous requests for the same task
    return dedupedApiCall(`task_status_${taskId}`, () => 
        request<Task>({
            url: `/api/tasks/${taskId}`,
            method: "get",
        })
    );
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
    // Build query parameters (accountId is now sent via X-Account-ID header automatically)
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
    // Cache key includes current account to prevent cache collisions between accounts
    const currentAccount = useAccountStore.getState().currentAccount;
    const cacheKey = `tasks_list_${currentAccount?.id || 'no_account'}_${queryString}`;
    
    // Use cached API call with a short cache duration of 2 seconds
    // This prevents hammering the server with duplicate requests while
    // still ensuring data is reasonably fresh
    return cachedApiCall(cacheKey, () => 
        request<Task[]>({
            url: `/api/tasks${queryString}`,
            method: "get",
        }), 
        2000 // 2 second cache
    );
}

export async function cancelTask(taskId: string): Promise<{ success: boolean, message: string }> {
    return request<{ success: boolean, message: string }>({
        url: `/api/video/task/${taskId}/cancel`,
        method: "post",
    });
}

export async function getQueueStatus(taskId?: string): Promise<{ success: boolean, data: any }> {
    const url = taskId 
        ? `/api/video/queue/status?task_id=${taskId}`
        : '/api/video/queue/status';
    
    // Throttle queue status checks to prevent too many calls
    const result = await throttledApiCall(`queue_status_${taskId || 'all'}`, () =>
        request<{ success: boolean, data: any }>({
            url,
            method: "get",
        }),
        1000 // Throttle to once per second per taskId
    );
    
    // If throttled, return a default response
    if (result === null) {
        return { 
            success: true, 
            data: { message: "Request throttled, using previous data" } 
        };
    }
    
    return result;
}

// Course API functions
export interface CourseGenerateRequest {
    prompt: string;
    language: string;
    voice_id: string;
    max_chapters: number;
    max_lessons_per_chapter: number;
    target_audience?: string;
    difficulty_level?: string;
    chapters?: any;
    lessons_per_chapter?: number;
    voice?: string;
}

export interface CourseStructureResponse {
    title: string;
    description: string;
    chapters: any[];
}

export interface CourseCreateRequest {
    title: string;
    description?: string;
    prompt: string;
    language: string;
    voice_id: string;
    target_audience?: string;
    difficulty_level?: string;
    chapters: any[];
}

export interface CourseResponse {
    id: string;
    title: string;
    description?: string;
    prompt: string;
    language: string;
    voice_id: string;
    status: string;
    chapters: any[];
    total_lessons: number;
    estimated_duration_minutes: number;
    created_at: string;
    updated_at: string;
}

export async function generateCourseStructure(data: CourseGenerateRequest): Promise<CourseStructureResponse> {
    return request<CourseStructureResponse>({
        url: "/api/courses/generate-structure",
        method: "post",
        data,
    });
}

export async function createCourse(data: CourseCreateRequest): Promise<CourseResponse> {
    return request<CourseResponse>({
        url: "/api/courses/",
        method: "post",
        data,
    });
}

export async function getCourseList(page: number = 1, pageSize: number = 10, status?: string): Promise<any> {
    const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
    });
    
    if (status) {
        params.append('status', status);
    }
    
    return request<any>({
        url: `/api/courses/?${params.toString()}`,
        method: "get",
    });
}

export async function getCourse(courseId: string): Promise<CourseResponse> {
    return request<CourseResponse>({
        url: `/api/courses/${courseId}`,
        method: "get",
    });
}

export async function updateCourse(courseId: string, data: Partial<CourseCreateRequest>): Promise<CourseResponse> {
    return request<CourseResponse>({
        url: `/api/courses/${courseId}`,
        method: "put",
        data,
    });
}

export async function deleteCourse(courseId: string): Promise<{ message: string }> {
    return request<{ message: string }>({
        url: `/api/courses/${courseId}`,
        method: "delete",
    });
}

export async function generateCourseLessons(courseId: string, chapterIds?: string[]): Promise<any> {
    return request<any>({
        url: `/api/courses/${courseId}/generate-lessons`,
        method: "post",
        data: { course_id: courseId, chapter_ids: chapterIds },
    });
}

export async function getCourseProgress(courseId: string): Promise<any> {
    return request<any>({
        url: `/api/courses/${courseId}/progress`,
        method: "get",
    });
}