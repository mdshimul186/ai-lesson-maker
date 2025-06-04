# Backend Architecture Migration Guide

## Overview

The backend has been restructured to support a more generic, extensible task queue and processing system that can handle multiple task types beyond just video generation.

## New Architecture

### Key Components

1. **Generic Task Queue Service** (`app/services/task_queue_service.py`)
   - Replaces the old `video_queue_service.py`
   - Supports multiple task types with priority queuing
   - Includes retry logic, cancellation, and cleanup functionality

2. **Task Processor Framework** (`app/processors/`)
   - Base processor class with common functionality
   - Individual processors for each task type
   - Factory pattern for dynamic processor instantiation

3. **Task Type System** (`app/models/task_types.py`)
   - Enum-based task type definitions
   - Configuration for each task type (timeouts, retries, etc.)
   - Extensible for new task types

## Supported Task Types

### Current Implementation
- **VIDEO**: Regular video generation
- **ANIMATED_LESSON**: Browser-based animated lessons
- **DOCUMENTATION**: AI-generated documentation
- **QUIZ**: AI-generated quizzes
- **COURSE_VIDEO**: Course-specific video generation
- **STORY_GENERATION**: AI-powered story creation
- **IMAGE_GENERATION**: AI image generation
- **VOICE_GENERATION**: Text-to-speech synthesis

### Task Type Configurations
Each task type has its own configuration:
- `max_attempts`: Maximum retry attempts
- `timeout_minutes`: Processing timeout
- `priority_weight`: Default priority for queuing
- `description`: Human-readable description

## New API Endpoints

### Task Management
- `GET /api/tasks/queue/status` - Get queue status
- `GET /api/tasks/queue/list` - List queued tasks
- `POST /api/tasks/queue/start` - Start queue processing
- `POST /api/tasks/queue/stop` - Stop queue processing
- `POST /api/tasks/queue/cleanup` - Clean up stuck tasks
- `POST /api/tasks/{task_id}/cancel` - Cancel specific task

### New Task Type Endpoints
- `POST /api/story/generate` - Generate stories
- `POST /api/image/generate` - Generate images
- `POST /api/voice-generation/generate` - Generate voice audio
- `POST /api/documentation/generate` - Generate documentation
- `POST /api/quiz/generate` - Generate quizzes

## Migration Changes

### Files Modified
- `main.py` - Updated to use new task queue service
- `app/api/video.py` - Migrated to new queue system
- `app/api/animated_lesson.py` - Migrated to new queue system
- `app/services/course_service.py` - Updated queue integration
- `test_queue.py` - Updated for new queue system

### Files Added
- `app/services/task_queue_service.py` - Generic queue service
- `app/services/task_processor_factory.py` - Processor factory
- `app/models/task_types.py` - Task type definitions
- `app/processors/` directory with all processors
- New API endpoint files for each task type

### Files Deprecated
- `app/services/video_queue_service.py` - Replaced by generic queue service

## Key Improvements

### 1. Extensibility
- Easy to add new task types by creating a processor and updating the enum
- No need to modify core queue logic for new task types

### 2. Better Error Handling
- Retry logic with exponential backoff
- Proper task cancellation support
- Stuck task cleanup functionality

### 3. Priority Support
- Tasks can be queued with different priorities (urgent, high, normal, low)
- Priority-based queue ordering

### 4. Enhanced Monitoring
- Comprehensive queue status information
- Per-task-type statistics
- Health checks and dashboard endpoints

### 5. Type Safety
- Enum-based task types prevent typos
- Strongly typed request/response models
- Better validation and error messages

## Usage Examples

### Adding a New Task Type

1. **Define the task type** in `app/models/task_types.py`:
```python
class TaskType(str, Enum):
    # ... existing types ...
    NEW_TASK_TYPE = "new_task_type"

TASK_CONFIGS = {
    # ... existing configs ...
    TaskType.NEW_TASK_TYPE: TaskConfig(
        max_attempts=3,
        timeout_minutes=30,
        priority_weight=5,
        description="Description of new task type"
    )
}
```

2. **Create a processor** in `app/processors/new_task_processor.py`:
```python
from app.processors.base_processor import BaseTaskProcessor
from app.models.task_types import TaskType

class NewTaskProcessor(BaseTaskProcessor):
    def __init__(self):
        super().__init__(TaskType.NEW_TASK_TYPE)
    
    async def process_task(self, task_id: str, request_data: Dict[str, Any], user_id: str, account_id: str) -> Dict[str, Any]:
        # Implementation here
        pass
    
    async def estimate_completion_time(self, request_data: Dict[str, Any]) -> int:
        # Return estimated time in minutes
        return 10
```

3. **Register the processor** in `app/services/task_processor_factory.py`:
```python
from app.processors.new_task_processor import NewTaskProcessor

class TaskProcessorFactory:
    _processors: Dict[TaskType, Type[BaseTaskProcessor]] = {
        # ... existing processors ...
        TaskType.NEW_TASK_TYPE: NewTaskProcessor,
    }
```

4. **Create API endpoints** in `app/api/new_task.py` and add to router.

### Queuing a Task
```python
await task_queue_service.add_to_queue(
    task_id=task_id,
    request_data=request_data,
    user_id=user_id,
    account_id=account_id,
    task_type=TaskType.NEW_TASK_TYPE.value,
    priority="normal"  # or "urgent", "high", "low"
)
```

## Testing

### Running the Queue System Test
```bash
cd Backend
python test_queue.py
```

### Manual Testing
1. Start the backend server
2. Use the new API endpoints to submit tasks
3. Monitor queue status via `/api/tasks/queue/status`
4. Check task progress via existing task endpoints

## Performance Considerations

### Queue Processing
- The queue processes one task at a time to avoid resource conflicts
- Tasks are ordered by priority, then by creation time
- Failed tasks are automatically retried with exponential backoff

### Resource Management
- Each processor can implement its own resource management
- Timeout handling prevents hung tasks
- Cleanup functionality removes stuck tasks

## Security Notes

### Admin Endpoints
Some endpoints are intended for admin use:
- Queue start/stop/cleanup operations
- Should be protected with proper authorization in production

### Task Access Control
- Tasks are isolated by user and account
- Users can only access their own tasks
- Account-level isolation is enforced

## Future Enhancements

### Planned Features
1. **Batch Processing**: Support for processing multiple related tasks
2. **Webhook Support**: Notify external systems when tasks complete
3. **Resource Pools**: Different processing pools for different task types
4. **Advanced Scheduling**: Time-based task scheduling
5. **Metrics & Analytics**: Detailed performance and usage metrics

### Scalability Considerations
1. **Horizontal Scaling**: Queue service can be distributed across multiple instances
2. **Database Optimization**: Indexes on queue status and timestamps
3. **Caching**: Redis integration for queue state caching
4. **Load Balancing**: Task distribution across processor instances

## Troubleshooting

### Common Issues

1. **Tasks stuck in PROCESSING**
   - Use the cleanup endpoint: `POST /api/tasks/queue/cleanup`
   - Check processor logs for errors

2. **Queue not processing**
   - Check queue status: `GET /api/tasks/queue/status`
   - Restart processing: `POST /api/tasks/queue/start`

3. **Import errors with new processors**
   - Ensure all processor files are properly created
   - Check the factory registration

### Monitoring Commands
```python
# Get queue status
status = await task_queue_service.get_queue_status()

# Get specific task status
task_status = await task_queue_service.get_queue_status(task_id)

# List recent tasks
tasks = await task_queue_service.get_queue_list(limit=10)

# Clean up stuck tasks
result = await task_queue_service.cleanup_stuck_tasks(max_processing_time_minutes=30)
```

## Migration Checklist

- [x] Replace video_queue_service imports with task_queue_service
- [x] Update main.py startup/shutdown hooks
- [x] Update API endpoints to use new queue service
- [x] Create processors for all task types
- [x] Add new API endpoints for additional task types
- [x] Update course service integration
- [x] Test queue functionality
- [x] Update test scripts
- [x] Create documentation
- [x] Update frontend API service layer
- [x] Add new generation API functions to frontend
- [x] Update TypeScript interfaces for new task types

## Frontend Updates

### Updated API Service Layer (`Frontend/src/services/index.tsx`)

1. **Updated Queue Status Endpoint**:
   - Changed from `/api/video/queue/status` to `/api/tasks/queue/status`
   - Maintains the same interface for frontend components

2. **Added New API Functions**:
   - `generateStory()` - For story generation tasks
   - `generateImage()` - For image generation tasks
   - `generateVoice()` - For voice generation tasks
   - `getQueueList()` - Enhanced queue management
   - `getSupportedTaskTypes()` - Get available task types

3. **Updated Type Definitions** (`Frontend/src/interfaces/index.d.ts`):
   - Added `Task` and `TaskEvent` interfaces
   - Added request/response interfaces for new generation services
   - Consolidated all task-related type definitions

### Frontend API Compatibility

The frontend has been updated to use the new backend endpoints while maintaining backward compatibility for existing components:

- **Task Management**: All task-related operations now use `/api/tasks/` endpoints
- **Queue Status**: Updated to use the generic task queue status endpoint
- **New Services**: Added support for story, image, and voice generation
- **Type Safety**: Enhanced with proper TypeScript interfaces for all new services

### Components Updated

- **TasksList Component**: Already compatible with the new task structure
- **StoryForm Component**: Ready to use new task-based generation system
- **API Service Layer**: Fully updated to use new backend endpoints

All existing frontend functionality remains intact while gaining support for the new task types and improved queue management capabilities.

## Conclusion

This migration provides a solid foundation for handling multiple task types in a scalable, maintainable way. The new architecture is more flexible, better tested, and easier to extend for future requirements.
