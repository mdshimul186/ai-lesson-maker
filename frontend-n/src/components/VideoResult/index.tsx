import { useRef, useEffect } from 'react';
import { useVideoStore } from "../../stores/index";
import styles from './index.module.css';
import {TaskEvent } from '../../services/index';
import { Alert, Progress, Timeline, Badge, Tag, Button, Modal, List } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, SyncOutlined, WarningOutlined, CloseCircleOutlined, LinkOutlined, PlayCircleOutlined, FileImageOutlined, FileTextOutlined, FileOutlined } from '@ant-design/icons';

export default function VideoResult() {
    const { videoUrl, isLoading, error, taskStatus } = useVideoStore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    // Function to show task folder content in a modal
    const showTaskFolderContent = () => {
        if (!taskStatus?.task_folder_content) return;

        Modal.info({
            title: 'Task Folder Contents',
            width: 800,
            content: (
                <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
                    <List
                        bordered
                        dataSource={Object.entries(taskStatus.task_folder_content)}
                        renderItem={([key, url]) => (
                            <List.Item
                                actions={[
                                    <a href={url as string} target="_blank" rel="noopener noreferrer">
                                        <Button type="link" icon={<LinkOutlined />}>Open</Button>
                                    </a>
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={
                                        key.endsWith('.mp4') ? <PlayCircleOutlined style={{ fontSize: '24px', color: '#1890ff' }} /> :
                                            key.endsWith('.jpg') || key.endsWith('.png') ? <FileImageOutlined style={{ fontSize: '24px', color: '#52c41a' }} /> :
                                                key.endsWith('.json') ? <FileTextOutlined style={{ fontSize: '24px', color: '#faad14' }} /> :
                                                    <FileOutlined style={{ fontSize: '24px' }} />
                                    }
                                    title={key.split('/').pop()}
                                    description={key}
                                />
                            </List.Item>
                        )}
                    />
                </div>
            ),
            okText: 'Close'
        });
    };

    // Auto-scroll to the bottom of the timeline when new events are added
    useEffect(() => {
        if (timelineRef.current && taskStatus?.events && taskStatus.events.length > 0) {
            timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
        }
    }, [taskStatus?.events]);

    // Only render when there's loading, error, task status or a video URL
    if (!taskStatus) {
        return (
            <div className={styles.placeholderContent}>
                <h3>No Video Available</h3>
                <p>Please generate a video first.</p>
            </div>
        )
    }

    const formatTime = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString();
        } catch {
            return timestamp;
        }
    };

    return (
        <div className={styles.videoResultContainer}>
            <div className={styles.videoTitle}>Video Result</div>
            {/* Progress section */}
            {taskStatus && (
                <div className={styles.progressContainer}>                    <h3>Video Generation: {taskStatus.status}</h3>
                    <Progress
                        percent={taskStatus.progress || 0}
                        status={
                            taskStatus.status === 'FAILED' ? 'exception' :
                                taskStatus.status === 'COMPLETED' ? 'success' : 'active'
                        }
                        strokeWidth={10}
                        strokeColor={
                            taskStatus.status === 'FAILED' ? '#ff4d4f' :
                                taskStatus.status === 'COMPLETED' ? '#52c41a' :
                                    {
                                        '0%': '#108ee9',
                                        '100%': '#87d068',
                                    }
                        }
                    />
                    <div className={styles.statusInfo}>
                        <strong>Task ID:</strong> {taskStatus.task_id}
                        <br />
                        <strong>Status:</strong> {' '}
                        <Tag color={
                            taskStatus.status === 'COMPLETED' ? 'success' :
                                taskStatus.status === 'FAILED' ? 'error' :
                                    taskStatus.status === 'PENDING' ? 'default' :
                                        taskStatus.status === 'PROCESSING' ? 'processing' :
                                            'warning'
                        } icon={
                            taskStatus.status === 'COMPLETED' ? <CheckCircleOutlined /> :
                                taskStatus.status === 'FAILED' ? <CloseCircleOutlined /> :
                                    taskStatus.status === 'PENDING' ? <ClockCircleOutlined /> :
                                        taskStatus.status === 'PROCESSING' ? <SyncOutlined spin /> :
                                            <WarningOutlined />
                        }>
                            {taskStatus.status}
                        </Tag>
                        <br />
                        <strong>Progress:</strong> {' '}
                        <Badge
                            status={
                                taskStatus.status === 'COMPLETED' ? 'success' :
                                    taskStatus.status === 'FAILED' ? 'error' :
                                        taskStatus.status === 'PROCESSING' ? 'processing' :
                                            'default'
                            }
                            text={`${taskStatus.progress || 0}%`}
                        />
                        <br />
                        <strong>Last Updated:</strong> {formatTime(taskStatus.updated_at)}

                        {/* Display task folder content information if available */}
                        {taskStatus.task_folder_content && (
                            <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                <strong>Task Contents:</strong>{' '}
                                <Badge
                                    count={Object.keys(taskStatus.task_folder_content).length}
                                    style={{ backgroundColor: '#52c41a' }}
                                />
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={showTaskFolderContent}
                                >
                                    View All Files
                                </Button>
                            </div>
                        )}

                        {taskStatus.status === 'FAILED' && taskStatus.error_message && (
                            <Alert
                                message="Error"
                                description={taskStatus.error_message}
                                type="error"
                                showIcon
                                style={{ marginTop: '10px' }}
                            />
                        )}
                    </div>
                    {taskStatus.events && taskStatus.events.length > 0 && (
                        <div className={styles.taskEvents}>
                            <h4>Event Log:</h4>                            
                            <div ref={timelineRef} className={styles.timelineContainer}>
                                <Timeline
                                mode='right'
                                
                                >
                                    {taskStatus.events.slice().map((event: TaskEvent, index: number) => {
                                        // Determine color based on event message content
                                        let color = 'blue';
                                        if (event.message.toLowerCase().includes('error') || event.message.toLowerCase().includes('fail')) {
                                            color = 'red';
                                        } else if (event.message.toLowerCase().includes('complet') || event.message.toLowerCase().includes('success')) {
                                            color = 'green';
                                        } else if (event.message.toLowerCase().includes('warn')) {
                                            color = 'orange';
                                        } else if (index === 0) {
                                            color = 'blue'; // Most recent event
                                        } else {
                                            color = 'gray';
                                        }

                                        const formattedTime = formatTime(event.timestamp);

                                        return (
                                            <Timeline.Item
                                                key={index}
                                                color={color}
                                                label={
                                                    <div title={formattedTime} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        <strong>{formattedTime}</strong>
                                                    </div>
                                                }
                                                style={{ width: '100%' }}
                                            >
                                                <p className={styles.eventMessage}>{event.message}</p>
                                                {event.details && (
                                                    <pre className={styles.eventDetails}>
                                                        {typeof event.details === 'object'
                                                            ? JSON.stringify(event.details, null, 2)
                                                            : event.details}
                                                    </pre>
                                                )}
                                            </Timeline.Item>
                                        );
                                    })}
                                </Timeline>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Loading state */}
            {isLoading && !taskStatus && (
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner} />
                    <h3>Initializing video generation...</h3>
                    <p>Please wait while we set up your video task. This may take a moment.</p>
                </div>
            )}
            {/* Error state - only show when no taskStatus is present */}
            {error && !taskStatus && (
                <div className={styles.errorMessage}>
                    <Alert
                        message="Error"
                        description={error}
                        type="error"
                        showIcon
                        style={{ maxWidth: '700px', margin: '20px auto' }}
                    />
                </div>
            )}

            {/* Video player */}
            {!isLoading && !error && videoUrl && (
                <div className={styles.videoContainer} key={videoUrl}>
                    <video ref={videoRef} controls className={styles.videoEl}>
                        <source src={videoUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </div>
            )}


            {/* if no video URL, show placeholder */}
            {!videoUrl && (
                <div className={styles.placeholderContent}>
                    <h3>No Video Available</h3>
                    <p>Please generate a video first.</p>
                </div>
            )}
        </div>
    );
}