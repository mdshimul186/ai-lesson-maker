# Updated Task API Documentation

## Overview
The Task API has been enhanced with bulk operations, queue processing fixes, and group-based filtering capabilities. **📋 Task Source Fields (Individual per Task):**
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
    },      {
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
      },
      "task_source_name": "Auto Generator",
      "task_source_id": "system_001",
      "task_source_group_id": "batch_456"
    }
  ]
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
