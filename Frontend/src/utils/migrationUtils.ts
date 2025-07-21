/**
 * Migration utilities for transitioning from direct API calls to task-based API
 * This file provides helper functions to ease the migration process
 */

import { 
    createVideoTask, 
    createQuizTask, 
    createAnimatedLessonTask,
    createDocumentationTask,
    createCustomTask,
    createBulkTasks,
    VideoGenerateReq,
    QuizGenerateRequest,
    AnimatedLessonRequest,
    DocumentationRequest,
    CreateTaskResponse 
} from '../services';

// Type definitions for legacy API responses
interface LegacyVideoResponse {
    success: boolean;
    data?: {
        task_id: string;
        video_url?: string;
    };
    message?: string;
}

interface LegacyQuizResponse {
    success: boolean;
    data?: {
        task_id: string;
        quiz_url?: string;
    };
    message?: string;
}

/**
 * Migration wrapper for video generation
 * Converts old generateVideo() response format to new task format
 */
export async function migrateVideoGeneration(data: VideoGenerateReq): Promise<LegacyVideoResponse> {
    try {
        const response = await createVideoTask(data);
        
        // Convert new response format to legacy format for backward compatibility
        return {
            success: !!response.task_id,
            data: response.task_id ? {
                task_id: response.task_id,
                video_url: undefined // Will be populated when task completes
            } : undefined,
            message: response.task_id ? 'Task created successfully' : 'Failed to create task'
        };
    } catch (error: any) {
        return {
            success: false,
            message: error?.message || 'Failed to create video task'
        };
    }
}

/**
 * Migration wrapper for quiz generation
 * Provides the same interface as a hypothetical legacy quiz API
 */
export async function migrateQuizGeneration(data: QuizGenerateRequest): Promise<LegacyQuizResponse> {
    try {
        const response = await createQuizTask(data);
        
        return {
            success: !!response.task_id,
            data: response.task_id ? {
                task_id: response.task_id,
                quiz_url: undefined // Will be populated when task completes
            } : undefined,
            message: response.task_id ? 'Task created successfully' : 'Failed to create task'
        };
    } catch (error: any) {
        return {
            success: false,
            message: error?.message || 'Failed to create quiz task'
        };
    }
}

/**
 * Generic migration helper for any content type
 * Allows migration of arbitrary legacy APIs to task-based system
 */
export async function migrateToTaskAPI(
    taskType: string,
    taskId: string,
    requestData: Record<string, any>,
    priority: 'low' | 'normal' | 'high' = 'normal'
): Promise<{ success: boolean; task_id?: string; message: string }> {
    try {
        const response = await createCustomTask(taskType, taskId, requestData, priority);
        
        return {
            success: !!response.task_id,
            task_id: response.task_id || undefined,
            message: response.task_id ? 'Task created successfully' : 'Failed to create task'
        };
    } catch (error: any) {
        return {
            success: false,
            message: error?.message || `Failed to create ${taskType} task`
        };
    }
}

/**
 * Batch migration helper
 * Converts multiple legacy API calls to a single bulk task creation
 */
export interface BatchMigrationItem {
    taskType: string;
    taskId: string;
    requestData: Record<string, any>;
    priority?: 'low' | 'normal' | 'high';
}

export async function migrateBatchOperations(
    items: BatchMigrationItem[]
): Promise<{ success: boolean; results: Array<{ task_id: string; success: boolean; message: string }> }> {
    try {
        const taskRequests = items.map(item => ({
            task_id: item.taskId,
            task_type: item.taskType,
            priority: item.priority || 'normal' as const,
            request_data: item.requestData
        }));

        const response = await createBulkTasks(taskRequests);
        
        // Transform CreateTaskResponse[] to the expected format
        const results = response.results ? response.results.map(taskResponse => ({
            task_id: taskResponse.task_id,
            success: !!taskResponse.task_id,
            message: taskResponse.task_id ? 'Task created successfully' : 'Failed to create task'
        })) : [];
        
        return {
            success: response.success,
            results
        };
    } catch (error: any) {
        return {
            success: false,
            results: items.map(item => ({
                task_id: item.taskId,
                success: false,
                message: error?.message || 'Failed to create batch tasks'
            }))
        };
    }
}

/**
 * API compatibility layer for legacy code
 * Provides a drop-in replacement for old functions
 */
export const LegacyAPI = {
    /**
     * Drop-in replacement for old generateVideo() function
     * @deprecated Use createVideoTask() directly instead
     */
    generateVideo: migrateVideoGeneration,
    
    /**
     * Drop-in replacement for hypothetical old generateQuiz() function
     * @deprecated Use createQuizTask() directly instead
     */
    generateQuiz: migrateQuizGeneration,
    
    /**
     * Generic legacy API wrapper
     * @deprecated Use createCustomTask() directly instead
     */
    generateContent: migrateToTaskAPI,
    
    /**
     * Batch operation wrapper
     * @deprecated Use createBulkTasks() directly instead
     */
    batchGenerate: migrateBatchOperations
};

/**
 * Migration validator
 * Checks if old API calls can be safely migrated to task API
 */
export function validateMigration(oldApiCall: string, newTaskType: string): { 
    canMigrate: boolean; 
    warnings: string[]; 
    recommendations: string[] 
} {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let canMigrate = true;

    // Check for common migration issues
    if (oldApiCall.includes('synchronous') || oldApiCall.includes('immediate')) {
        warnings.push('Old API appears to be synchronous, new task API is asynchronous');
        recommendations.push('Implement task polling for status updates');
    }

    if (oldApiCall.includes('bulk') && newTaskType !== 'bulk') {
        warnings.push('Old API appears to handle bulk operations');
        recommendations.push('Consider using createBulkTasks() instead of individual task creation');
    }

    if (!['video', 'quiz', 'animated_lesson', 'documentation', 'story', 'image', 'voice_generation'].includes(newTaskType)) {
        warnings.push(`Task type '${newTaskType}' may not be supported by backend`);
        recommendations.push('Check backend task types with getSupportedTaskTypes()');
    }

    return {
        canMigrate,
        warnings,
        recommendations
    };
}

/**
 * Migration progress tracker
 * Helps track which components have been migrated
 */
export class MigrationTracker {
    private migratedComponents: Set<string> = new Set();
    private pendingComponents: Set<string> = new Set();

    addPendingComponent(componentName: string): void {
        this.pendingComponents.add(componentName);
    }

    markComponentMigrated(componentName: string): void {
        this.pendingComponents.delete(componentName);
        this.migratedComponents.add(componentName);
        console.log(`✅ ${componentName} successfully migrated to task API`);
    }

    getMigrationStatus(): {
        total: number;
        migrated: number;
        pending: number;
        progress: number;
        migratedList: string[];
        pendingList: string[];
    } {
        const migrated = this.migratedComponents.size;
        const pending = this.pendingComponents.size;
        const total = migrated + pending;
        
        return {
            total,
            migrated,
            pending,
            progress: total > 0 ? (migrated / total) * 100 : 0,
            migratedList: Array.from(this.migratedComponents),
            pendingList: Array.from(this.pendingComponents)
        };
    }

    printStatus(): void {
        const status = this.getMigrationStatus();
        console.log(`\n📊 Task API Migration Status:`);
        console.log(`   Progress: ${status.progress.toFixed(1)}% (${status.migrated}/${status.total})`);
        console.log(`   ✅ Migrated: ${status.migratedList.join(', ') || 'None'}`);
        console.log(`   ⏳ Pending: ${status.pendingList.join(', ') || 'None'}`);
    }
}

// Global migration tracker instance
export const migrationTracker = new MigrationTracker();

// Initialize with known components
migrationTracker.addPendingComponent('LessonForm'); // ✅ Already migrated
migrationTracker.addPendingComponent('CourseGenerator');
migrationTracker.addPendingComponent('StoryGenerator');
migrationTracker.addPendingComponent('VoiceGenerator');

// Mark LessonForm as migrated since we just updated it
migrationTracker.markComponentMigrated('LessonForm');

export default {
    migrateVideoGeneration,
    migrateQuizGeneration,
    migrateToTaskAPI,
    migrateBatchOperations,
    LegacyAPI,
    validateMigration,
    MigrationTracker,
    migrationTracker
};
