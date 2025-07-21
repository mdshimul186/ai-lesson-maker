import { request } from "../utils/request";
import { cachedApiCall, dedupedApiCall, throttledApiCall } from "../utils/apiUtils";
import { useAccountStore } from "../stores";
import { 
    Task, 
    StoryGenerationRequest, 
    StoryGenerationResponse,
    ImageGenerationRequest,
    ImageGenerationResponse,
    VoiceGenerationRequest,
    VoiceGenerationResponse
} from "../interfaces";

export * from './account';  // Export account and payment services
export * from './animated_lesson';  // Export animated lesson services

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

export type TaskEvent = any

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

    // Theme and customization
    theme?: string;
    custom_colors?: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
    };

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
}

// =============================================================================
// TASK-BASED API FUNCTIONS (NEW APPROACH)
// =============================================================================
// All content generation now uses the unified task system. This provides:
// - Better progress tracking
// - Unified queue management  
// - Consistent error handling
// - Support for bulk operations
// - Real-time status updates

export interface CreateTaskRequest {
    task_id: string;
    task_type: string;
    priority?: 'low' | 'normal' | 'high';
    request_data: Record<string, any>;
}

export interface CreateTaskResponse {
    success: boolean;
    task_id: string;
    message: string;
}

export async function createTask(data: CreateTaskRequest): Promise<CreateTaskResponse> {
    return request<CreateTaskResponse>({
        url: "/api/tasks",
        method: "post",
        data,
    });
}

export async function createBulkTasks(tasks: CreateTaskRequest[]): Promise<{ success: boolean; results: CreateTaskResponse[] }> {
    return request<{ success: boolean; results: CreateTaskResponse[] }>({
        url: "/api/tasks/bulk",
        method: "post",
        data: { tasks },
    });
}

// Helper function to create video task using task API
export async function createVideoTask(data: VideoGenerateReq): Promise<CreateTaskResponse> {
    const taskRequest: CreateTaskRequest = {
        task_id: data.task_id || '',
        task_type: 'video',
        priority: 'normal',
        request_data: {
            story_prompt: data.story_prompt,
            segments: data.segments,
            voice_name: data.voice_name,
            resolution: data.resolution,
            theme: data.theme,
            custom_colors: data.custom_colors,
            logo_url: data.logo_url,
            intro_video_url: data.intro_video_url,
            outro_video_url: data.outro_video_url,
            video_language: data.video_language,
            subtitle_enabled: data.subtitle_enabled,
            visual_content_in_language: data.visual_content_in_language,
            voice_rate: data.voice_rate,
            voice_volume: data.voice_volume,
            bgm_type: data.bgm_type,
            bgm_file: data.bgm_file,
            bgm_volume: data.bgm_volume,
            subtitle_position: data.subtitle_position,
            custom_position: data.custom_position,
            font_name: data.font_name,
            text_fore_color: data.text_fore_color,
            text_background_color: data.text_background_color,
            font_size: data.font_size,
            stroke_color: data.stroke_color,
            stroke_width: data.stroke_width,
            image_style: data.image_style,
            video_terms: data.video_terms,
            video_aspect: data.video_aspect,
            video_concat_mode: data.video_concat_mode,
            video_clip_duration: data.video_clip_duration,
            video_count: data.video_count,
            video_source: data.video_source,
            n_threads: data.n_threads,
        }
    };

    return createTask(taskRequest);
}

// Helper function to create quiz task using task API
export interface QuizGenerateRequest {
    task_id: string;
    content: string;
    num_questions?: number;
    question_types?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    language?: string;
    topic?: string;
}

export async function createQuizTask(data: QuizGenerateRequest): Promise<CreateTaskResponse> {
    const taskRequest: CreateTaskRequest = {
        task_id: data.task_id,
        task_type: 'quiz',
        priority: 'normal',
        request_data: {
            content: data.content,
            num_questions: data.num_questions || 5,
            question_types: data.question_types || ['multiple_choice', 'true_false'],
            difficulty: data.difficulty || 'medium',
            language: data.language || 'English',
            topic: data.topic,
        }
    };

    return createTask(taskRequest);
}

// Helper function to create animated lesson task
export interface AnimatedLessonRequest {
    task_id: string;
    lesson_content: string;
    animation_style?: string;
    duration?: number;
    voice_name?: string;
    language?: string;
    resolution?: string;
}

export async function createAnimatedLessonTask(data: AnimatedLessonRequest): Promise<CreateTaskResponse> {
    const taskRequest: CreateTaskRequest = {
        task_id: data.task_id,
        task_type: 'animated_lesson',
        priority: 'normal',
        request_data: {
            lesson_content: data.lesson_content,
            animation_style: data.animation_style || 'modern',
            duration: data.duration || 60,
            voice_name: data.voice_name,
            language: data.language || 'English',
            resolution: data.resolution || '1920*1080',
        }
    };

    return createTask(taskRequest);
}

// Helper function to create documentation task
export interface DocumentationRequest {
    task_id: string;
    topic: string;
    content_type?: string;
    format?: string;
    language?: string;
    depth?: 'basic' | 'intermediate' | 'advanced';
}

export async function createDocumentationTask(data: DocumentationRequest): Promise<CreateTaskResponse> {
    const taskRequest: CreateTaskRequest = {
        task_id: data.task_id,
        task_type: 'documentation',
        priority: 'normal',
        request_data: {
            topic: data.topic,
            content_type: data.content_type || 'tutorial',
            format: data.format || 'markdown',
            language: data.language || 'English',
            depth: data.depth || 'intermediate',
        }
    };

    return createTask(taskRequest);
}

// Generic task creation with custom data
export async function createCustomTask(taskType: string, taskId: string, requestData: Record<string, any>, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<CreateTaskResponse> {
    const taskRequest: CreateTaskRequest = {
        task_id: taskId,
        task_type: taskType,
        priority,
        request_data: requestData
    };

    return createTask(taskRequest);
}

// Generate individual lesson video
export interface GenerateLessonVideoReq {
    courseId: string;
    lessonId: string;
}

export interface GenerateLessonVideoRes {
    task_id: string;
    message: string;
    lesson_id: string;
}

export async function generateLessonVideo(data: GenerateLessonVideoReq): Promise<GenerateLessonVideoRes> {
    return request<GenerateLessonVideoRes>({
        url: `/api/courses/${data.courseId}/lessons/${data.lessonId}/generate-video`,
        method: "post",
        data: {},
    });
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
        url: "/api/files/upload/",
        method: "post",
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
}

export async function getAllTasks(params?: { limit?: number, skip?: number, status?: string }): Promise<{ tasks: Task[], total: number, limit: number, skip: number }> {
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
    const currentAccount = useAccountStore.getState().currentAccount;
    const cacheKey = `tasks_list_${currentAccount?.id || 'no_account'}_${queryString}`;
    
    return cachedApiCall(cacheKey, () => 
        request<{ tasks: Task[], total: number, limit: number, skip: number }>({
            url: `/api/tasks${queryString}`,
            method: "get",
        }), 
        2000 // 2 second cache
    );
}

export async function cancelTask(taskId: string): Promise<{ success: boolean, message: string }> {
    return request<{ success: boolean, message: string }>({
        url: `/api/tasks/${taskId}/cancel`,
        method: "post",
    });
}

export async function getQueueStatus(taskId?: string): Promise<{ success: boolean, data: any }> {
    const url = taskId 
        ? `/api/tasks/queue/status?task_id=${taskId}`
        : '/api/tasks/queue/status';
    
    const result = await throttledApiCall(`queue_status_${taskId || 'all'}`, () =>
        request<{ success: boolean, data: any }>({
            url,
            method: "get",
        }),
        1000 // Throttle to once per second per taskId
    );
    
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

// Story Generation API
export async function generateStory(data: StoryGenerationRequest): Promise<StoryGenerationResponse> {
    return request<StoryGenerationResponse>({
        url: "/api/story/generate",
        method: "post",
        data,
    });
}

// Image Generation API
export async function generateImage(data: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    return request<ImageGenerationResponse>({
        url: "/api/image/generate",
        method: "post",
        data,
    });
}

// Voice Generation API
export async function generateVoice(data: VoiceGenerationRequest): Promise<VoiceGenerationResponse> {
    return request<VoiceGenerationResponse>({
        url: "/api/voice-generation/generate",
        method: "post",
        data,
    });
}

// Additional Queue Management Functions
export async function getQueueList(params?: { 
    limit?: number; 
    skip?: number; 
    task_type?: string; 
    status?: string 
}): Promise<{ success: boolean, data: any }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) {
        queryParams.append('limit', params.limit.toString());
    }
    if (params?.skip) {
        queryParams.append('skip', params.skip.toString());
    }
    if (params?.task_type) {
        queryParams.append('task_type', params.task_type);
    }
    if (params?.status) {
        queryParams.append('status', params.status);
    }
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    return request<{ success: boolean, data: any }>({
        url: `/api/tasks/queue/list${queryString}`,
        method: "get",
    });
}

export async function getSupportedTaskTypes(): Promise<{ success: boolean, data: any }> {
    return request<{ success: boolean, data: any }>({
        url: "/api/tasks/types",
        method: "get",
    });
}

export async function getTaskCount(params?: { status?: string }): Promise<{ total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.status) {
        queryParams.append('status', params.status);
    }
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    return request<{ total: number }>({
        url: `/api/tasks/count/total${queryString}`,
        method: "get",
    });
}

// =============================================================================
// LEGACY/DEPRECATED FUNCTIONS - TO BE REMOVED
// =============================================================================
// These functions are kept for backward compatibility but should not be used 
// in new code. Use the task-based functions above instead.

// DEPRECATED: Use createVideoTask instead
export async function generateVideo(data: VideoGenerateReq): Promise<VideoGenerateRes> {
    console.warn('DEPRECATED: generateVideo() is deprecated. Use createVideoTask() instead.');
    return request<VideoGenerateRes>({
        url: "/api/video/generate",
        method: "post",
        data,
    });
}
