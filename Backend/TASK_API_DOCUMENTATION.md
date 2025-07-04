# Updated Task API Documentation

## Overview
The Task API has been enhanced with bulk operations, queue processing fixes, and group-based filtering capabilities. **🎬 Shared Video Settings (Applied to All Video Tasks):**
- `logo_url` (string, optional) - Logo URL to apply to all video tasks (like /video/generate API)
- `intro_video_url` (string, optional) - Intro video URL to apply to all video tasks  
- `outro_video_url` (string, optional) - Outro video URL to apply to all video tasks
- These settings will be applied to all video tasks unless overridden in individual task `request_data`

**📋 Task Source Fields (Individual per Task):**
- `task_source_name` - Name of the source that created this specific task (optional)
- `task_source_id` - Identifier of the source that created this specific task (optional)  
- `task_source_group_id` - Group identifier for related tasks (optional)
- Each task can have different source information, allowing for flexible organization and tracking

**📝 Request Data Fields by Task Type:**

**Video Tasks:**
- `story_prompt` (required) - The main content prompt for video generation
- `segments` (required) - Integer (1-50) or "maximum" for auto-determination
- `language` (optional) - Content language (default: "English")
- `voice_name` (optional) - Voice for narration
- `image_style` (optional) - Visual style ("realistic", "cartoon", etc.)

**Quiz Tasks:**
- `story_prompt` (required) - The story/prompt content to base quiz questions on
- `difficulty` (required) - "easy", "medium", or "hard"
- `num_questions` (optional) - Integer (1-50), defaults vary by difficulty
- `language` (optional) - Content language (default: "English")
- `question_types` (optional) - Array of types like ["multiple_choice", "true_false"]

# Updated Task API Documentation

## Overview
This Task API has been enhanced with bulk operations, queue processing fixes, and group-based filtering capabilities. This

## Recent Updates (June 2025)

### 🆕 **Task ID Auto-Generation**
- **New Feature**: Bulk upload now supports automatic task ID generation
- **Flexibility**: `task_id` is now optional in bulk requests - UUIDs are auto-generated when not provided
- **Mixed Usage**: Can combine custom task IDs with auto-generated ones in the same request
- **Individual Source Tracking**: Each task now has its own `task_source_name`, `task_source_id`, and `task_source_group_id` fields

### 🆕 **Enhanced Segments Support & Quiz Tasks**
- **Flexible Segments**: Video tasks now support `segments` as integer (1-50) or "maximum" for auto-determination
- **Quiz Task Type**: Added support for quiz generation with story_prompt, difficulty, and num_questions
- **Validation**: Enhanced request_data validation for different task types
- **Enhanced Authentication**: Full API key support across all endpoints with account-based access control

### 🔧 **Critical Fix: Bulk Upload Task Processing**
- **Issue Fixed**: Bulk uploaded tasks were staying in "PENDING" status indefinitely
- **Solution**: Bulk task creation now automatically adds tasks to the processing queue
- **Impact**: All bulk uploaded tasks will now be processed correctly instead of remaining stuck

### 🆕 **New Queue Management Endpoints**
- `POST /task/requeue-pending` - Requeue existing pending tasks
- **Enhanced queue status monitoring and debugging capabilities**

## API Authentication

The Task API supports two authentication methods:

### 1. Bearer Token Authentication (Existing)
Include both the authorization header and account ID:
```bash
curl -X POST "http://localhost:8000/api/tasks/bulk" \
     -H "Authorization: Bearer your_jwt_token_here" \
     -H "X-Account-ID: your_account_id" \
     -H "Content-Type: application/json" \
     -d '{
       "tasks": [
         {
           "task_id": "task_001",
           "task_type": "video",
           "priority": "high",
           "request_data": {"content": "Lesson about mathematics"}
         }
       ]
     }'
```

### 2. API Key Authentication (New)
Use only the API key header (account ID is automatically extracted):
```bash
curl -X POST "http://localhost:8000/api/tasks/bulk" \
     -H "X-API-Key: your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{
       "tasks": [
         {
           "task_id": "task_001", 
           "task_type": "video",
           "priority": "high",
           "request_data": {"content": "Lesson about mathematics"}
         }
       ]
     }'
```

**Note:** When using API key authentication:
- The account ID is automatically decoded from the API key
- Tasks created via API key will have a special user ID: `api_key_user_{account_id}`
- No X-Account-ID header is required

## New Features Added

### 1. New Task Fields
- `task_source_name`: Name of the source that created the task
- `task_source_id`: Identifier of the source that created the task  
- `task_source_group_id`: Group identifier for related tasks

### 2. Bulk Task Creation
- Create up to 100 tasks in a single API call
- Supports all task fields including individual source fields for each task
- Maintains idempotency - existing tasks are returned without error
- **Auto-generates task IDs**: If `task_id` is not provided or is empty, a UUID will be automatically generated
- **Individual source tracking**: Each task can have its own `task_source_name`, `task_source_id`, and `task_source_group_id`

### 3. Group-based Filtering
- Filter tasks by `task_source_group_id` in all list operations
- Apply group filtering to task counts
- Combine with existing filters (status, account, etc.)

### 4. Supported Task Types
- **video**: Generate educational videos with configurable segments (integer 1-50 or "maximum")
- **quiz**: Generate quizzes with story_prompt, difficulty levels (easy/medium/hard), and num_questions
- **animated_lesson**: Create animated educational content
- **documentation**: Generate documentation content

## API Endpoints

### Create Bulk Tasks
**POST** `/api/tasks/bulk`

Creates multiple tasks in a single request and automatically adds them to the processing queue.

**⚠️ Important**: This endpoint now includes automatic queue processing. All tasks with valid `request_data` will be:
1. Created in the database with "PENDING" status
2. **Automatically added to the processing queue** 
3. Updated to "QUEUED" status when queue processing begins

**Request Body:**
```json
{
  "tasks": [
    {
      "task_id": "task_001",
      "task_type": "video",
      "priority": "high",
      "request_data": {
        "story_prompt": "Create an educational video about basic mathematics concepts including addition and subtraction",
        "segments": 3,
        "language": "English",
        "voice_name": "zh-CN-XiaoxiaoNeural",
        "voice_rate": 1.0,
        "image_style": "realistic",
        "resolution": "1920*1080",
        "include_subtitles": true,
        "theme": "modern"
      },
      "task_source_name": "Course Creator",
      "task_source_id": "course_123",
      "task_source_group_id": "batch_456"
    },{
      "task_type": "quiz",
      "priority": "normal",
      "request_data": {
        "story_prompt": "Once upon a time in ancient Greece, a young mathematician named Pythagoras discovered a fundamental theorem about right triangles that would revolutionize geometry forever.",
        "difficulty": "medium",
        "num_questions": 10,
        "language": "English"
      },
      "task_source_name": "Course Creator",
      "task_source_id": "course_123", 
      "task_source_group_id": "batch_456"
    },
    {
      "task_type": "video",
      "priority": "low",
      "request_data": {
        "story_prompt": "Create a comprehensive video about history",
        "segments": "maximum",
        "language": "English"
      },      "task_source_name": "Auto Generator",
      "task_source_id": "system_001",
      "task_source_group_id": "batch_456"
    }
  ],
  "logo_url": "https://example.com/logo.png",
  "intro_video_url": "https://example.com/intro.mp4",
  "outro_video_url": "https://example.com/outro.mp4"
}
```

**📋 Task ID Handling:**
- `task_id` is **optional** - if not provided or empty, a UUID will be automatically generated
- In the example above, the first task has a custom `task_id`, others will get auto-generated UUIDs
- Auto-generated task IDs follow the format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` (UUID4)

**📋 Example Features Demonstrated:**
- Task 1: Video with specific segments (3)
- Task 2: Quiz with required fields (story_prompt, difficulty)  
- Task 3: Video with "maximum" segments for auto-determination

**� Task Source Fields (Individual per Task):**
- `task_source_name` - Name of the source that created this specific task (optional)
- `task_source_id` - Identifier of the source that created this specific task (optional)  
- `task_source_group_id` - Group identifier for related tasks (optional)
- Each task can have different source information, allowing for flexible organization and tracking

**�📝 Required `request_data` fields for video tasks:**
- `story_prompt` (string) - The main content prompt for video generation
- `segments` (integer, 1-50) - Number of video segments to create

**📝 Optional `request_data` fields:**
- `language` - Content language (default: "English")
- `voice_name` - Voice for narration
- `image_style` - Visual style ("realistic", "cartoon", etc.)
- `resolution` - Video resolution (default: "1920*1080")
- `include_subtitles` - Whether to include subtitles
- `theme` - Visual theme ("modern", "elegant", etc.)
- All other video generation parameters from the `/api/video/generate` endpoint

**Response:**
```json
[
  {
    "task_id": "task_001",
    "user_id": "user_123",
    "account_id": "account_456",
    "task_type": "video",
    "priority": "high",
    "status": "QUEUED",
    "progress": 1.0,
    "created_at": "2025-06-15T10:30:00Z",
    "updated_at": "2025-06-15T10:30:00Z",
    "task_source_name": "Course Creator",
    "task_source_id": "course_123",
    "task_source_group_id": "batch_456",
    "events": [
      {
        "timestamp": "2025-06-15T10:30:00Z",
        "message": "Task pending"
      },
      {
        "timestamp": "2025-06-15T10:30:01Z",
        "message": "Task added to video processing queue"
      }
    ]
  },  {
    "task_id": "7b2e4f1a-9c8d-4e3a-b2f1-8a9c7d6e5f4g",
    "user_id": "user_123", 
    "account_id": "account_456",
    "task_type": "video",
    "priority": "normal",
    "status": "QUEUED",
    "progress": 1.0,
    "created_at": "2025-06-15T10:30:00Z",
    "updated_at": "2025-06-15T10:30:00Z",
    "task_source_name": "Course Creator",
    "task_source_id": "course_123",
    "task_source_group_id": "batch_456",
    "events": [
      {
        "timestamp": "2025-06-15T10:30:00Z",
        "message": "Task pending"
      },      {
        "timestamp": "2025-06-15T10:30:01Z",
        "message": "Task added to video processing queue"
      }
    ]
  }
]
```

**Note**: Tasks without `request_data` will be created but not queued for processing.

## Task ID Auto-Generation Feature

The bulk upload endpoint now supports automatic task ID generation for enhanced flexibility:

### How It Works
- If `task_id` is not provided or is an empty string, a UUID4 will be automatically generated
- Generated IDs follow the format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- You can mix explicit task IDs with auto-generated ones in the same bulk request
- All task IDs (provided + generated) are validated for uniqueness within the request

### Use Cases
- **Rapid prototyping**: Create tasks without worrying about ID generation
- **Batch processing**: Auto-generate IDs for large batches of similar tasks
- **Migration**: Import tasks from systems that don't use UUIDs
- **Mixed workflows**: Use custom IDs for important tasks, auto-generate for others

### Example with Mixed IDs and Individual Source Fields
```json
{
  "tasks": [
    {
      "task_id": "important_task_001",
      "task_type": "video",
      "task_source_name": "Manual Upload",
      "task_source_id": "user_session_123",
      "task_source_group_id": "batch_456",
      "request_data": {...}
    },
    {
      "task_type": "video",
      "task_source_name": "API Integration",
      "task_source_id": "external_system_789",
      "task_source_group_id": "batch_789",
      "request_data": {...}
    }
  ]
}
```

The second task will receive an auto-generated UUID like `7b2e4f1a-9c8d-4e3a-b2f1-8a9c7d6e5f4g`, and each task has its own source tracking information.

### Get All Tasks (Updated)
**GET** `/api/tasks`

Now supports filtering by group ID, source IDs, and specific task IDs.

**Query Parameters:**
- `task_source_group_id`: Filter tasks by group ID
- `task_source_ids`: Filter tasks by comma-separated list of source IDs (e.g., "course_123,course_456,course_789")
- `task_ids`: Filter tasks by comma-separated list of specific task IDs (e.g., "uuid-1234,uuid-5678")
- `status`: Filter by task status
- `limit`: Number of tasks to return (default: 100, max: 1000)
- `skip`: Number of tasks to skip for pagination
- All existing parameters remain the same

**Examples:**
```
# Filter by group ID
GET /api/tasks?task_source_group_id=batch_456&status=PENDING&limit=50

# Filter by multiple source IDs
GET /api/tasks?task_source_ids=course_123,course_456,course_789&status=COMPLETED

# Get specific tasks by their IDs
GET /api/tasks?task_ids=uuid-1234,uuid-5678,uuid-9012

# Combine multiple filters
GET /api/tasks?task_source_group_id=batch_456&task_source_ids=course_123,course_456&status=PROCESSING

# Get specific tasks with status filter
GET /api/tasks?task_ids=uuid-1234,uuid-5678&status=COMPLETED
```

## Querying by Source IDs - Complete Examples

### Basic Source ID Filtering

**Get tasks from a single source:**
```bash
GET /api/tasks?task_source_ids=course_123
```

**Get tasks from multiple sources:**
```bash
GET /api/tasks?task_source_ids=course_123,course_456,course_789
```

### Combined Filtering Examples

**Get completed tasks from specific courses:**
```bash
GET /api/tasks?task_source_ids=course_123,course_456&status=COMPLETED
```

**Get pending tasks from courses in a specific batch:**
```bash
GET /api/tasks?task_source_group_id=batch_456&task_source_ids=course_123,course_789&status=PENDING
```

**Pagination with source filtering:**
```bash
GET /api/tasks?task_source_ids=course_123,course_456&limit=20&skip=0
```

### Real-World Use Cases

**1. Course Management Dashboard**
```bash
# Get all tasks for courses you're managing
GET /api/tasks?task_source_ids=math_101,science_102,history_103

# Check progress of specific courses
GET /api/tasks?task_source_ids=math_101,science_102&status=PROCESSING
```

**2. Batch Processing Monitoring**
```bash
# Monitor specific courses in a batch
GET /api/tasks?task_source_group_id=evening_batch&task_source_ids=course_001,course_002,course_003

# Count failed tasks for specific courses
GET /api/tasks/count/total?task_source_ids=course_001,course_002&status=FAILED
```

**3. Error Investigation**
```bash
# Find all failed tasks from problematic sources
GET /api/tasks?task_source_ids=buggy_course_1,buggy_course_2&status=FAILED

# Get detailed view of recent failures
GET /api/tasks?task_source_ids=course_123&status=FAILED&limit=10
```

### Response Examples

**Request:**
```bash
GET /api/tasks?task_source_ids=course_123,course_456&status=COMPLETED&limit=2
```

**Response:**
```json
{
  "tasks": [
    {
      "task_id": "uuid-1234",
      "task_source_id": "course_123",
      "task_source_name": "Mathematics 101",
      "task_source_group_id": "batch_456",
      "status": "COMPLETED",
      "task_type": "video",
      "progress": 100,
      "created_at": "2025-06-16T10:00:00Z",
      "result_url": "https://example.com/result1.mp4"
    },
    {
      "task_id": "uuid-5678",
      "task_source_id": "course_456", 
      "task_source_name": "Science 102",
      "task_source_group_id": "batch_456",
      "status": "COMPLETED",
      "task_type": "quiz",
      "progress": 100,
      "created_at": "2025-06-16T11:00:00Z",
      "result_url": "https://example.com/result2.json"
    }
  ],
  "total": 15,
  "limit": 2,
  "skip": 0
}
```

### JavaScript/Frontend Examples

**Using fetch:**
```javascript
// Get tasks from multiple courses
const response = await fetch('/api/tasks?task_source_ids=course_123,course_456,course_789');
const data = await response.json();

// Filter by status and sources
const completedTasks = await fetch('/api/tasks?task_source_ids=course_123,course_456&status=COMPLETED');

// Count tasks from specific sources
const countResponse = await fetch('/api/tasks/count/total?task_source_ids=course_123,course_456');
const { total } = await countResponse.json();
```

**Using axios:**
```javascript
// Get tasks with parameters
const { data } = await axios.get('/api/tasks', {
  params: {
    task_source_ids: 'course_123,course_456,course_789',
    status: 'PROCESSING',
    limit: 50
  }
});

// Build dynamic source IDs list
const sourceIds = ['course_123', 'course_456', 'course_789'];
const response = await axios.get('/api/tasks', {
  params: {
    task_source_ids: sourceIds.join(','),
    status: 'COMPLETED'
  }
});
```

### Important Notes

- **Comma-separated format:** Use commas without spaces: `course_123,course_456`
- **URL encoding:** Special characters in source IDs will be automatically URL-encoded
- **Empty values filtered:** `course_123,,course_456` becomes `course_123,course_456`
- **Combine with other filters:** Can be used with `status`, `task_source_group_id`, `limit`, `skip`
- **Case sensitive:** Source IDs are matched exactly as stored in the database

## Bulk Regenerate Tasks

### Regenerate Multiple Tasks
**POST** `/api/tasks/bulk-regenerate`

Regenerate multiple tasks by their IDs. This endpoint will reset the specified tasks and add them back to the processing queue for regeneration.

**Request Body:**
```json
{
  "task_ids": ["uuid-1234", "uuid-5678", "uuid-9012"],
  "reset_to_pending": true,
  "force": false,
  "logo_url": "https://example.com/new-logo.png",
  "intro_video_url": "https://example.com/new-intro.mp4",
  "outro_video_url": "https://example.com/new-outro.mp4"
}
```

**Request Parameters:**
- `task_ids`: Array of task IDs to regenerate (required, max 100 tasks)
- `reset_to_pending`: Whether to reset tasks to PENDING status before regenerating (default: true)
- `force`: Force regeneration even if tasks are currently processing (default: false)
- **🎬 Video Task Overrides (like /video/generate API):**
  - `logo_url`: Override logo URL for video tasks (optional)
  - `intro_video_url`: Override intro video URL for video tasks (optional)
  - `outro_video_url`: Override outro video URL for video tasks (optional)

**Use Cases:**
1. **Re-process failed tasks:** Regenerate tasks that failed due to temporary issues
2. **Update content:** Regenerate tasks with updated requirements or settings
3. **Batch retry:** Regenerate multiple tasks that need to be reprocessed
4. **Quality improvements:** Regenerate tasks to apply new processing algorithms

**Examples:**

**Basic regeneration:**
```bash
curl -X POST "/api/tasks/bulk-regenerate" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer your-token" \
-H "X-Account-ID: your-account-id" \
-d '{
  "task_ids": ["uuid-1234", "uuid-5678", "uuid-9012"]
}'
```

**Force regeneration of processing tasks:**
```bash
curl -X POST "/api/tasks/bulk-regenerate" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer your-token" \
-H "X-Account-ID: your-account-id" \
-d '{
  "task_ids": ["uuid-1234", "uuid-5678"],
  "force": true,
  "reset_to_pending": true
}'
```

**Regenerate without resetting status:**
```bash
curl -X POST "/api/tasks/bulk-regenerate" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer your-token" \
-H "X-Account-ID: your-account-id" \
-d '{
  "task_ids": ["uuid-1234", "uuid-5678"],
  "reset_to_pending": false
}'
```

**Regenerate with intro/outro/logo overrides:**
```bash
curl -X POST "/api/tasks/bulk-regenerate" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer your-token" \
-H "X-Account-ID: your-account-id" \
-d '{
  "task_ids": ["uuid-1234", "uuid-5678"],
  "reset_to_pending": true,
  "logo_url": "https://example.com/updated-logo.png",
  "intro_video_url": "https://example.com/new-intro.mp4",
  "outro_video_url": "https://example.com/new-outro.mp4"
}'
```

**Response:**
```json
{
  "success": true,
  "message": "Regenerated 2 tasks, 1 failures",
  "regenerated_count": 2,
  "failed_count": 1,
  "not_found_count": 0,
  "not_found_ids": [],
  "total_requested": 3,
  "details": [
    {
      "task_id": "uuid-1234",
      "status": "regenerated",
      "reason": "Successfully queued for regeneration"
    },
    {
      "task_id": "uuid-5678",
      "status": "regenerated", 
      "reason": "Successfully queued for regeneration"
    },
    {
      "task_id": "uuid-9012",
      "status": "skipped",
      "reason": "Task is currently processing. Use force=true to override."
    }
  ]
}
```

**Error Responses:**

**Empty task IDs list:**
```json
{
  "detail": "task_ids list cannot be empty"
}
```

**Too many tasks:**
```json
{
  "detail": "Cannot regenerate more than 100 tasks at once"
}
```

**Unauthorized access:**
```json
{
  "detail": "Task uuid-1234 does not belong to the specified account"
}
```

**Task status meanings:**
- `regenerated`: Task was successfully queued for regeneration
- `skipped`: Task was skipped (e.g., already processing, already in queue)
- `failed`: Task regeneration failed due to an error

**Important Notes:**
- Tasks must belong to the authenticated account
- Tasks must have `request_data` to be regenerated
- Processing tasks will be skipped unless `force=true` is used
- Tasks already in the queue will be skipped to prevent duplicates
- Maximum 100 tasks can be regenerated in a single request
- Each task's regeneration result is provided in the `details` array

## Bulk Cancel Tasks

### Cancel Multiple Tasks
**POST** `/api/tasks/bulk-cancel`

Cancel multiple tasks by their IDs. This endpoint will cancel the specified tasks that are pending or processing, and mark them as failed with cancellation details.

**Request Body:**
```json
{
  "task_ids": ["uuid-1234", "uuid-5678", "uuid-9012"],
  "reason": "User requested cancellation"
}
```

**Request Parameters:**
- `task_ids`: Array of task IDs to cancel (required, max 100 tasks)
- `reason`: Optional reason for cancellation (default: "Bulk cancellation requested")

**Use Cases:**
1. **Stop unwanted tasks:** Cancel tasks that are no longer needed
2. **Emergency stop:** Quickly cancel multiple tasks during system maintenance
3. **Resource management:** Free up processing resources by cancelling queued tasks
4. **Error recovery:** Cancel tasks that are stuck or causing issues

**Examples:**

**Basic cancellation:**
```bash
curl -X POST "/api/tasks/bulk-cancel" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer your-token" \
-H "X-Account-ID: your-account-id" \
-d '{
  "task_ids": ["uuid-1234", "uuid-5678", "uuid-9012"]
}'
```

**Cancellation with custom reason:**
```bash
curl -X POST "/api/tasks/bulk-cancel" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer your-token" \
-H "X-Account-ID: your-account-id" \
-d '{
  "task_ids": ["uuid-1234", "uuid-5678"],
  "reason": "Project requirements changed"
}'
```

**Cancel all tasks from a specific source:**
```javascript
// First get tasks by source ID
const tasksResponse = await fetch('/api/tasks?task_source_ids=course_123');
const { tasks } = await tasksResponse.json();

// Extract task IDs of pending/processing tasks
const taskIds = tasks
  .filter(task => ['PENDING', 'PROCESSING'].includes(task.status))
  .map(task => task.task_id);

// Cancel them
const cancelResponse = await fetch('/api/tasks/bulk-cancel', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task_ids: taskIds,
    reason: 'Course cancelled'
  })
});
```

**Response:**
```json
{
  "success": true,
  "message": "Cancelled 2 tasks, 1 failures",
  "cancelled_count": 2,
  "failed_count": 1,
  "not_found_count": 0,
  "not_found_ids": [],
  "total_requested": 3,
  "cancellation_reason": "User requested cancellation",
  "details": [
    {
      "task_id": "uuid-1234",
      "status": "cancelled",
      "reason": "Successfully cancelled: User requested cancellation",
      "queue_result": "Task cancelled from queue"
    },
    {
      "task_id": "uuid-5678",
      "status": "cancelled",
      "reason": "Successfully cancelled: User requested cancellation",
      "queue_result": "Not in queue"
    },
    {
      "task_id": "uuid-9012",
      "status": "skipped",
      "reason": "Task already in final state: COMPLETED"
    }
  ]
}
```

**Error Responses:**

**Empty task IDs list:**
```json
{
  "detail": "task_ids list cannot be empty"
}
```

**Too many tasks:**
```json
{
  "detail": "Cannot cancel more than 100 tasks at once"
}
```

**Unauthorized access:**
```json
{
  "detail": "Task uuid-1234 does not belong to the specified account"
}
```

**Task status meanings:**
- `cancelled`: Task was successfully cancelled
- `skipped`: Task was skipped (e.g., already completed, failed, or cancelled)
- `failed`: Task cancellation failed due to an error

**Cancellation Behavior:**
1. **Queue cancellation**: Tasks in the processing queue are removed
2. **Status update**: Task status is set to "CANCELLED" 
3. **Error details**: Cancellation reason and timestamp are recorded
4. **Event logging**: Cancellation event is added to task history
5. **Final state**: Task is marked as failed with cancellation details

**Important Notes:**
- Tasks must belong to the authenticated account
- Only PENDING and PROCESSING tasks can be cancelled
- Completed, failed, or already cancelled tasks will be skipped
- Maximum 100 tasks can be cancelled in a single request
- Each task's cancellation result is provided in the `details` array
- Cancelled tasks cannot be restarted (use bulk regenerate instead)
- Queue cancellation is attempted but may not always succeed for currently processing tasks

**Integration with Other Endpoints:**
- Use with `GET /api/tasks?task_source_ids=...` to cancel tasks from specific sources
- Use with `GET /api/tasks?status=PENDING` to cancel all pending tasks
- Combine with bulk regenerate to cancel and restart tasks with new parameters

## Queue Management Endpoints

### Get Queue Status
**GET** `/api/tasks/queue/status`

Get the current status of the task queue and processing system.

**Response:**
```json
{
  "success": true,
  "queue_processing_active": true,
  "current_processing_task": "task-123",
  "overall_queue_status": {
    "total_queued": 5,
    "processing": 1,
    "by_priority": {
      "urgent": 1,
      "high": 2,
      "normal": 2
    }
  },
  "account_task_counts": {
    "pending": 3,
    "queued": 2, 
    "processing": 1
  },
  "pending_task_ids": ["task-456", "task-789"],
  "queued_task_ids": ["task-123", "task-234"]
}
```

### Restart Queue Processing
**POST** `/api/tasks/queue/restart`

Manually restart the queue processing system if it has stopped.

**Response:**
```json
{
  "success": true,
  "message": "Queue processing restarted",
  "was_processing_before": false,
  "is_processing_now": true
}
```

### Process Pending Tasks
**POST** `/api/tasks/queue/process-pending`

Force queue all PENDING tasks for the current account. Useful when tasks get stuck in PENDING status after bulk regeneration.

**Response:**
```json
{
  "success": true,
  "message": "Queued 3 tasks, 0 failures",
  "queued_count": 3,
  "failed_count": 0,
  "total_pending": 3,
  "details": [
    {
      "task_id": "task-456",
      "status": "queued",
      "reason": "Successfully added to processing queue"
    },
    {
      "task_id": "task-789", 
      "status": "queued",
      "reason": "Successfully added to processing queue"
    },
    {
      "task_id": "task-101",
      "status": "queued", 
      "reason": "Successfully added to processing queue"
    }
  ]
}
```

**Use Cases:**
- Check if queue processing is working properly
- Restart queue processing if it gets stuck
- Force queue tasks that are stuck in PENDING status after bulk regeneration
