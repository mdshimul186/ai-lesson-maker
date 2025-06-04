# Video Queue System Documentation

## Overview

The video queue system ensures that video generation tasks are processed one at a time to prevent resource overload and system crashes. This queue-based approach provides better reliability, monitoring, and recovery capabilities.

## Key Features

### 1. Queue-Based Processing
- Only one video is processed at a time
- Other requests are queued with status tracking
- FIFO (First In, First Out) processing order
- Automatic retry mechanism for failed tasks

### 2. Server Restart Recovery
- On server restart, automatically detects stuck/processing tasks
- Marks interrupted tasks as failed or requeues them for retry
- Resumes queue processing automatically

### 3. Status Tracking
- **PENDING**: Task created, credits deducted
- **QUEUED**: Task added to processing queue
- **PROCESSING**: Task currently being processed
- **COMPLETED**: Task finished successfully
- **FAILED**: Task failed permanently (after max retries)

### 4. Retry Mechanism
- Failed tasks are automatically retried (default: 3 attempts)
- Each retry increments the attempt counter
- Tasks exceeding max attempts are marked as permanently failed

### 5. Request Data Storage
- **Complete Request Preservation**: Full request body is stored in task record
- **Debugging Support**: Easy access to original parameters for troubleshooting
- **Replay Capability**: Ability to rerun failed tasks with exact same parameters
- **Audit Trail**: Complete history of what was requested for each video generation

## API Endpoints

### Video Generation
```
POST /video/generate
```
- Adds video generation request to queue
- Returns task ID immediately
- Deducts credits before queueing

### Queue Status
```
GET /video/queue/status?task_id={optional}
```
- Get overall queue status or specific task status
- Returns queue position, processing status, etc.

### Queue Dashboard
```
GET /video/queue/dashboard
```
- Comprehensive queue information
- Statistics on queued, processing, completed, failed tasks
- Health status indicators

### Queue Management (Admin)
```
POST /video/queue/start      # Start queue processing
POST /video/queue/stop       # Stop queue processing
POST /video/queue/resume     # Resume after restart
GET  /video/queue/health     # Health check
POST /video/queue/cleanup    # Clean up stuck tasks
GET  /video/queue/list       # List all queue items
```

### Request Data Management
```
GET /video/task/{task_id}/request  # Get original request data for a task
```
- Retrieve the complete original request body used for video generation
- Useful for debugging, auditing, and potential task replay functionality
- Access controlled by user/account ownership

## Database Collections

### Tasks Collection
Standard task tracking with events, progress, status, etc.
```json
{
  "task_id": "uuid",
  "user_id": "user_id", 
  "account_id": "account_id",
  "status": "PENDING|QUEUED|PROCESSING|COMPLETED|FAILED",
  "events": [...],
  "progress": 0.0,
  "created_at": "datetime",
  "updated_at": "datetime",
  "result_url": "s3_url",
  "task_folder_content": {},
  "error_message": "error_text",
  "error_details": {},
  "request_data": {
    "story_prompt": "...",
    "segments": 5,
    "language": "en",
    "voice_name": "...",
    "resolution": "1080p",
    // ... complete original request
  }
}
```

### Video Queue Collection
Specialized queue management:
```json
{
  "task_id": "uuid",
  "user_id": "user_id",
  "account_id": "account_id", 
  "request_data": {}, // Serialized VideoGenerateRequest
  "status": "QUEUED|PROCESSING|COMPLETED|FAILED",
  "created_at": "datetime",
  "updated_at": "datetime",
  "processing_started_at": "datetime", // When processing began
  "attempts": 0,
  "max_attempts": 3,
  "last_error": "error message"
}
```

## Queue Processing Flow

1. **Request Received**
   - Deduct credits
   - Create task record
   - Add to video queue
   - Return task ID

2. **Queue Processing**
   - Get oldest queued item
   - Mark as PROCESSING
   - Generate video
   - Upload to S3
   - Mark as COMPLETED
   - Clean up local files

3. **Error Handling**
   - Increment attempt counter
   - If under max attempts: requeue
   - If max attempts reached: mark as FAILED
   - Save partial results to S3 if possible

4. **Server Restart**
   - Find tasks stuck in PROCESSING
   - Reset to QUEUED (with incremented attempts)
   - Or mark as FAILED if max attempts reached
   - Resume queue processing

## Monitoring and Health

### Health Indicators
- Queue processing status
- Number of queued/processing/stuck tasks
- Database connectivity
- Current processing task

### Automatic Cleanup
- Detects tasks stuck in PROCESSING state
- Configurable timeout (default: 30 minutes)
- Automatically requeues or fails stuck tasks

## Configuration

### Environment Variables
Standard app configuration applies. No additional config needed.

### Queue Settings
- **Max Attempts**: 3 (hardcoded, can be made configurable)
- **Stuck Task Timeout**: 30 minutes (configurable via cleanup endpoint)
- **Queue Check Interval**: 5 seconds when empty
- **Error Retry Interval**: 10 seconds

## Usage Examples

### Frontend Integration
```javascript
// Submit video generation request
const response = await fetch('/api/video/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(videoRequest)
});

const { task_id } = response.data;

// Poll for status updates
const pollStatus = async () => {
  const status = await fetch(`/api/video/queue/status?task_id=${task_id}`);
  const data = await status.json();
  
  if (data.data.status === 'COMPLETED') {
    // Video is ready
  } else if (data.data.status === 'FAILED') {
    // Handle failure
  } else {
    // Show queue position or processing status
    setTimeout(pollStatus, 5000);
  }
};
```

### Admin Monitoring
```javascript
// Get dashboard data
const dashboard = await fetch('/api/video/queue/dashboard');
const stats = dashboard.data;

console.log(`Queue health: ${stats.is_healthy}`);
console.log(`Queued: ${stats.statistics.queued}`);
console.log(`Processing: ${stats.statistics.processing}`);
```

## Troubleshooting

### Common Issues

1. **Queue not processing**
   - Check `/video/queue/health`
   - Restart with `/video/queue/resume`

2. **Tasks stuck in processing**
   - Use `/video/queue/cleanup` to reset stuck tasks
   - Check server logs for errors

3. **High failure rate**
   - Check system resources (disk space, memory)
   - Verify FFmpeg installation
   - Check S3 connectivity

### Logs
Check application logs for detailed error information:
- Queue processing events
- Task failures with stack traces
- Resource usage warnings

## Future Enhancements

- Priority queue support
- Resource-based scaling (multiple workers)
- Advanced retry strategies
- Performance metrics and analytics
- Queue persistence across database restarts
