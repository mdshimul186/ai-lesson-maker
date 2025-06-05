import React, { useState, useEffect, useCallback } from 'react';
import { 
    Table, 
    Tag, 
    Button, 
    Space, 
    Card, 
    Input, 
    DatePicker, 
    Select, 
    Row, 
    Col, 
    Badge, 
    Modal, 
    List, 
    Progress, 
    Typography,
    Drawer,
    Timeline,
    Alert,
    Popconfirm,
    message
} from 'antd';
import { 
    Task, 
    getAllTasks, 
    cancelTask, 
    getQueueStatus, 
    getTaskStatus
} from '../../services/index';
import { 
    SearchOutlined, 
    ReloadOutlined, 
    CheckCircleOutlined, 
    CloseCircleOutlined, 
    ClockCircleOutlined, 
    SyncOutlined, 
    WarningOutlined,
    LinkOutlined,
    PlayCircleOutlined,
    FileImageOutlined,
    FileTextOutlined,
    FileOutlined,
    InfoCircleOutlined,
    StopOutlined
} from '@ant-design/icons';
import styles from './index.module.css';
import { useAccountStore } from '../../stores';
import { clearApiCachePattern } from '../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const TasksList: React.FC = () => {
    // State for tasks and pagination
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });
      // State for filters
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState<string>('');
  // Date range state is used in the RangePicker UI but not yet implemented in filtering
  // TODO: Implement date range filtering in the backend and use dateRange variable
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);

  console.log(dateRange);

    // State for polling queue status
    const [pollingInterval, setPollingInterval] = useState<any>(null);

    // Get current account from store
    const { currentAccount } = useAccountStore();

    // State for task details drawer
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
      // Function to fetch tasks
    const fetchTasks = async (page = 1, pageSize = 10, status?: string) => {
        // If we're already loading, don't start another request
        if (loading) {
            console.log('Already loading tasks, skipping duplicate request');
            return;
        }

        setLoading(true);
        try {
            const skip = (page - 1) * pageSize;
            const response = await getAllTasks({
                limit: pageSize,
                skip,
                status
            });
            
            if (Array.isArray(response)) {
                // Store active task IDs before update for comparison
                const previousActiveTasks = tasks
                    .filter(taskNeedsQueuePositionUpdate)
                    .map(t => t.task_id);
                
                // Update tasks state
                setTasks(response);
                
                // Update pagination based on response
                setPagination({
                    ...pagination,
                    current: page,
                    total: response.length + skip // This is an estimate; backend should ideally return total count
                });
                
                // Check if we need to start/stop polling based on active tasks
                const currentActiveTasks = response
                    .filter(taskNeedsQueuePositionUpdate)
                    .map(t => t.task_id);
                
                // Log changes in active tasks for debugging
                if (previousActiveTasks.length !== currentActiveTasks.length) {
                    console.log(`Active tasks changed: ${previousActiveTasks.length} -> ${currentActiveTasks.length}`);
                }
            } else {
                // Handle case where response is not an array
                console.error('Expected array of tasks but got:', response);
                setTasks([]);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };
      // Effect to load tasks on component mount and pagination/filter changes
    useEffect(() => {
        // Only fetch tasks when pagination or filters change, not when tasks array changes
        fetchTasks(pagination.current, pagination.pageSize, statusFilter);
        
        // No need for auto-refresh here, we'll use individual task updates instead
    }, [pagination.current, pagination.pageSize, statusFilter]);    // Refresh tasks when account changes
    useEffect(() => {
        if (currentAccount) {
            console.log('Account changed in TasksList, refreshing tasks...');
            
            // Clear API cache for tasks to ensure fresh data
            clearApiCachePattern(/^tasks_/);
            
            // Reset pagination and filters when account changes
            setPagination({
                current: 1,
                pageSize: 10,
                total: 0
            });
            setTasks([]); // Clear existing tasks
            setStatusFilter(undefined); // Reset status filter
            fetchTasks(1, 10, undefined);
        }
    }, [currentAccount?.id]);
    
    // Function to handle table change (pagination, filters, sorter)
    const handleTableChange = (paginationParams: any) => {
        fetchTasks(paginationParams.current, paginationParams.pageSize, statusFilter);
    };
      // Function to apply filters with debouncing
    const applyFilters = useCallback(() => {
        fetchTasks(1, pagination.pageSize, statusFilter);
    }, [pagination.pageSize, statusFilter]);
    
    // Function to reset filters
    const resetFilters = useCallback(() => {
        setStatusFilter(undefined);
        setSearchTerm('');
        setDateRange(null);
        fetchTasks(1, pagination.pageSize);
    }, [pagination.pageSize]);
    
    // Function to show task details in drawer
    const showTaskDetails = (task: Task) => {
        setSelectedTask(task);
        setDrawerVisible(true);
    };
    
    // Function to close task details drawer
    const closeTaskDetails = () => {
        setDrawerVisible(false);
        setSelectedTask(null);
    };
    
    // Function to show task folder content in a modal
    const showTaskFolderContent = (taskFolderContent: Record<string, any>) => {
        Modal.info({
            title: 'Task Folder Contents',
            width: 800,
            content: (
                <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
                    <List
                        bordered
                        dataSource={Object.entries(taskFolderContent)}
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
    
    // Helper function to format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };
    
    // Table columns definition
    const columns = [
        {
            title: 'Task ID',
            dataIndex: 'task_id',
            key: 'task_id',
            render: (text: string, record: Task) => <a onClick={() => showTaskDetails(record)}>{text.substring(0, 8)}...</a>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string, record: Task) => (
                <Space direction="vertical" size="small">
                    <Tag color={
                        status === 'COMPLETED' ? 'success' :
                        status === 'FAILED' ? 'error' :
                        status === 'PENDING' ? 'default' :
                        status === 'QUEUED' ? 'processing' :
                        status === 'PROCESSING' ? 'processing' :
                        status === 'CANCELLED' ? 'default' :
                        'warning'
                    } icon={
                        status === 'COMPLETED' ? <CheckCircleOutlined /> :
                        status === 'FAILED' ? <CloseCircleOutlined /> :
                        status === 'PENDING' ? <ClockCircleOutlined /> :
                        status === 'QUEUED' ? <ClockCircleOutlined /> :
                        status === 'PROCESSING' ? <SyncOutlined spin /> :
                        status === 'CANCELLED' ? <StopOutlined /> :
                        <WarningOutlined />                    }>
                        {status}
                    </Tag>
                    {record.queue_position !== undefined && (status === 'PENDING' || status === 'QUEUED') && (
                        <Tag color="blue" className={styles.queuePositionTag}>Queue Position: {record.queue_position}</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Progress',
            dataIndex: 'progress',
            key: 'progress',
            render: (progress: number, record: Task) => (
                <Progress 
                    percent={progress} 
                    size="small" 
                    status={
                        record.status === 'FAILED' ? 'exception' :
                        record.status === 'COMPLETED' ? 'success' :
                        'active'
                    }
                />
            ),
            sorter: (a: Task, b: Task) => a.progress - b.progress,
        },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => formatDate(date),
            sorter: (a: Task, b: Task) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        },
        {
            title: 'Updated At',
            dataIndex: 'updated_at',
            key: 'updated_at',
            render: (date: string) => formatDate(date),
            sorter: (a: Task, b: Task) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
        },
        {
            title: 'Files',
            key: 'files',
            render: (_: any, record: Task) => (
                record.task_folder_content ? (
                    <Button 
                        type="link"
                        onClick={() => showTaskFolderContent(record.task_folder_content!)}
                    >
                        <Badge count={Object.keys(record.task_folder_content).length} />
                    </Button>
                ) : (
                    <span>None</span>
                )
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: Task) => (
                <Space size="small">
                    <Button 
                        type="primary" 
                        size="small" 
                        onClick={() => showTaskDetails(record)}
                        icon={<InfoCircleOutlined />}
                    >
                        Details
                    </Button>                    {record.result_url && (
                        <Button 
                            type="link" 
                            size="small" 
                            href={record.result_url} 
                            target="_blank"
                        >
                            View Result
                        </Button>
                    )}
                    {(record.status === 'PENDING' || record.status === 'QUEUED' || record.status === 'PROCESSING') && (
                        <Popconfirm
                            title="Are you sure you want to cancel this task?"
                            onConfirm={() => handleCancelTask(record.task_id)}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button 
                                type="primary" 
                                danger 
                                size="small" 
                                icon={<StopOutlined />}
                            >
                                Cancel
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];
      // Function to handle task cancellation
    const handleCancelTask = async (taskId: string) => {
        try {
            const response = await cancelTask(taskId);
            if (response.success) {
                message.success('Task cancellation requested successfully');
                
                // Update just this task instead of refetching all tasks
                setTasks(prevTasks => 
                    prevTasks.map(task => 
                        task.task_id === taskId 
                            ? { ...task, status: 'CANCELLED' } 
                            : task
                    )
                );
                
                // After a brief delay, get the actual updated task to ensure we have accurate data
                setTimeout(async () => {
                    await updateTaskStatus(taskId);
                }, 1000);
            } else {
                message.error(response.message || 'Failed to cancel task');
            }
        } catch (error) {
            console.error('Error cancelling task:', error);
            message.error('An error occurred while trying to cancel the task');
        }
    };// Function to fetch queue position for pending/queued tasks
    const fetchQueuePositions = async () => {
        try {
            // Only check status for tasks that are still active
            const activeTasks = tasks.filter(taskNeedsQueuePositionUpdate);
            
            if (activeTasks.length === 0) {
                // No active tasks, clear polling interval
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    setPollingInterval(null);
                }
                return;
            }
            
            // Process active tasks in batches to reduce API calls
            const batchSize = 3; // Process 3 tasks at a time
            const taskBatches = [];
            
            // Create batches of tasks
            for (let i = 0; i < activeTasks.length; i += batchSize) {
                taskBatches.push(activeTasks.slice(i, i + batchSize));
            }
            
            // Process each batch sequentially
            for (const batch of taskBatches) {
                await Promise.all(batch.map(async (task) => {
                    try {
                        // First update the task status
                        const updatedTask = await updateTaskStatus(task.task_id);
                        
                        // If task is no longer active, don't fetch queue position
                        if (!updatedTask || !taskNeedsQueuePositionUpdate(updatedTask)) {
                            return;
                        }
                        
                        // Only fetch queue position for tasks that are still active
                        const queueStatus = await getQueueStatus(task.task_id);
                        if (queueStatus.success && queueStatus.data) {
                            const { queue_position } = queueStatus.data;
                            
                            if (queue_position !== undefined) {
                                // Update the task with queue position
                                setTasks(prevTasks => 
                                    prevTasks.map(t => 
                                        t.task_id === task.task_id 
                                            ? { ...t, queue_position } 
                                            : t
                                    )
                                );
                            }
                        }
                    } catch (error) {
                        console.error(`Error processing task ${task.task_id}:`, error);
                    }
                }));
                
                // Add a small delay between batches to avoid overwhelming the server
                if (taskBatches.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
        } catch (error) {
            console.error('Error in fetchQueuePositions:', error);
        }
    };    // Function to check if a task needs queue position updates
    const taskNeedsQueuePositionUpdate = (task: Task): boolean => {
        return (
            task.status === 'PENDING' || 
            task.status === 'QUEUED' || 
            task.status === 'PROCESSING'
        );
    };
    
    // Optimize polling for queue positions of active tasks
    useEffect(() => {
        // Only poll for active tasks and if we're not already loading
        const activeTasks = tasks.filter(taskNeedsQueuePositionUpdate);
        const hasActiveTasks = activeTasks.length > 0;
        
        console.log(`Active tasks count: ${activeTasks.length}`);
        
        // Clear existing interval if it exists
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }
        
        // If there are active tasks, start polling with an adaptive interval
        if (hasActiveTasks && !loading) {
            // Calculate an adaptive polling interval based on the number of active tasks
            // More tasks = longer interval to reduce server load
            const baseInterval = 15000; // 15 seconds base
            const adaptiveInterval = Math.min(
                baseInterval + (activeTasks.length * 1000), // Add 1s per active task
                30000 // Cap at 30 seconds max
            );
            
            console.log(`Setting up polling with ${adaptiveInterval}ms interval`);
            
            // Initial poll after a short delay
            const initialPoll = setTimeout(() => {
                fetchQueuePositions();
            }, 1000);
            
            // Then set up the regular interval
            const interval = setInterval(() => {
                if (!loading) {
                    fetchQueuePositions();
                }
            }, adaptiveInterval);
            
            setPollingInterval(interval);
            
            // Cleanup function
            return () => {
                clearTimeout(initialPoll);
                clearInterval(interval);
            };
        }
        
        // No cleanup needed if we didn't set up polling
    }, [
        // Only re-run when these dependencies change
        tasks.filter(taskNeedsQueuePositionUpdate).length, // Number of active tasks
        loading
    ]);
      // Function to update individual task status
    const updateTaskStatus = async (taskId: string) => {
        try {
            const taskResponse = await getTaskStatus(taskId);
            // Only update the specific task in the tasks array
            setTasks(prevTasks => 
                prevTasks.map(task => 
                    task.task_id === taskId ? { ...task, ...taskResponse } : task
                )
            );
            return taskResponse;
        } catch (error) {
            console.error(`Error updating task ${taskId}:`, error);
            return null;
        }
    };
    
    return (
        <div className={styles.tasksListContainer}>
            <Card title={<Title level={2}>All Tasks</Title>} className={styles.tasksCard}>
                {/* Filter section */}
                <div className={styles.filtersSection}>
                    <Row gutter={16} align="middle">
                        <Col xs={24} sm={8} md={6} lg={5} xl={4}>
                            <Select
                                placeholder="Filter by status"
                                allowClear
                                style={{ width: '100%' }}
                                onChange={(value) => setStatusFilter(value)}
                                value={statusFilter}
                            >
                                <Option value="PENDING">Pending</Option>
                                <Option value="PROCESSING">Processing</Option>
                                <Option value="COMPLETED">Completed</Option>
                                <Option value="FAILED">Failed</Option>
                            </Select>
                        </Col>
                        <Col xs={24} sm={8} md={6} lg={5} xl={4}>
                            <Input
                                placeholder="Search by Task ID"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                prefix={<SearchOutlined />}
                            />
                        </Col>
                        <Col xs={24} sm={8} md={12} lg={10} xl={8}>
                            <RangePicker 
                                onChange={(dates) => {
                                    if (dates) {
                                        setDateRange([dates[0]?.toDate()!, dates[1]?.toDate()!]);
                                    } else {
                                        setDateRange(null);
                                    }
                                }}
                                style={{ width: '100%' }}
                            />
                        </Col>
                        <Col xs={12} sm={6} md={6} lg={2} xl={4}>
                            <Button 
                                type="primary" 
                                onClick={applyFilters}
                                icon={<SearchOutlined />}
                            >
                                Apply
                            </Button>
                        </Col>
                        <Col xs={12} sm={6} md={6} lg={2} xl={4}>
                            <Button 
                                onClick={resetFilters}
                                icon={<ReloadOutlined />}
                            >
                                Reset
                            </Button>
                        </Col>
                    </Row>
                </div>
                
                {/* Tasks table */}
                <Table
                    columns={columns}
                    dataSource={tasks}
                    rowKey="task_id"
                    pagination={pagination}
                    loading={loading}
                    onChange={handleTableChange}
                    className={styles.tasksTable}
                />
            </Card>
              {/* Task details drawer */}
            <Drawer
                title={`Task Details: ${selectedTask?.task_id}`}
                placement="right"
                width={600}
                onClose={closeTaskDetails}
                open={drawerVisible && !!selectedTask}
            >
                {selectedTask && (
                    <div>
                        <div className={styles.taskDetailHeader}>                            <div>
                                <strong>Status:</strong>{' '}
                                <Tag color={
                                    selectedTask.status === 'COMPLETED' ? 'success' :
                                    selectedTask.status === 'FAILED' ? 'error' :
                                    selectedTask.status === 'PENDING' ? 'default' :
                                    selectedTask.status === 'QUEUED' ? 'processing' :
                                    selectedTask.status === 'PROCESSING' ? 'processing' :
                                    selectedTask.status === 'CANCELLED' ? 'default' :
                                    'warning'
                                } icon={
                                    selectedTask.status === 'COMPLETED' ? <CheckCircleOutlined /> :
                                    selectedTask.status === 'FAILED' ? <CloseCircleOutlined /> :
                                    selectedTask.status === 'PENDING' ? <ClockCircleOutlined /> :
                                    selectedTask.status === 'QUEUED' ? <ClockCircleOutlined /> :
                                    selectedTask.status === 'PROCESSING' ? <SyncOutlined spin /> :
                                    selectedTask.status === 'CANCELLED' ? <StopOutlined /> :
                                    <WarningOutlined />
                                }>
                                    {selectedTask.status}
                                </Tag>                                
                                {selectedTask.queue_position !== undefined && 
                                 (selectedTask.status === 'PENDING' || selectedTask.status === 'QUEUED') && (
                                    <Tag color="blue" className={styles.queuePositionTag}>
                                        Queue Position: {selectedTask.queue_position}
                                    </Tag>
                                )}
                            </div>
                            <div>
                                <strong>Progress:</strong>{' '}
                                <Progress 
                                    percent={selectedTask.progress || 0} 
                                    status={
                                        selectedTask.status === 'FAILED' ? 'exception' :
                                        selectedTask.status === 'COMPLETED' ? 'success' :
                                        'active'
                                    }
                                />
                            </div>
                            <div>
                                <strong>Created:</strong> {formatDate(selectedTask.created_at)}
                            </div>
                            <div>
                                <strong>Last Updated:</strong> {formatDate(selectedTask.updated_at)}
                            </div>
                            
                            {selectedTask.result_url && (
                                <div className={styles.resultSection}>
                                    <strong>Result:</strong>{' '}
                                    <a href={selectedTask.result_url} target="_blank" rel="noopener noreferrer">
                                        <Button type="primary">View Result</Button>
                                    </a>
                                </div>
                            )}
                            
                            {selectedTask.task_folder_content && Object.keys(selectedTask.task_folder_content).length > 0 && (
                                <div className={styles.folderContentSection}>
                                    <strong>Files:</strong>{' '}
                                    <Badge 
                                        count={Object.keys(selectedTask.task_folder_content).length} 
                                        style={{ backgroundColor: '#52c41a' }}
                                    />
                                    <Button 
                                        type="link" 
                                        onClick={() => showTaskFolderContent(selectedTask.task_folder_content!)}
                                    >
                                        View All Files
                                    </Button>
                                </div>
                            )}
                            
                            {selectedTask.error_message && (
                                <Alert
                                    message="Error"
                                    description={selectedTask.error_message}
                                    type="error"
                                    showIcon
                                    style={{ marginTop: 16 }}
                                />
                            )}
                        </div>
                        
                        {selectedTask.events && selectedTask.events.length > 0 && (
                            <div className={styles.eventsSection}>
                                <Title level={4}>Event Log:</Title>
                                <div className={styles.timelineContainer}>
                                    <Timeline mode="left">
                                        {selectedTask.events.map((event, index) => {
                                            // Determine color based on event message content
                                            let color = 'blue';
                                            if (event.message.toLowerCase().includes('error') || event.message.toLowerCase().includes('fail')) {
                                                color = 'red';
                                            } else if (event.message.toLowerCase().includes('complet') || event.message.toLowerCase().includes('success')) {
                                                color = 'green';
                                            } else if (event.message.toLowerCase().includes('warn')) {
                                                color = 'orange';
                                            } else if (index === selectedTask.events.length - 1) {
                                                color = 'blue'; // Most recent event
                                            } else {
                                                color = 'gray';
                                            }
                                            
                                            return (
                                                <Timeline.Item 
                                                    key={index} 
                                                    color={color}
                                                    label={<span>{formatDate(event.timestamp)}</span>}
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
                        {(selectedTask.status === 'PENDING' || selectedTask.status === 'QUEUED' || selectedTask.status === 'PROCESSING') && (
                            <div className={styles.actionSection} style={{ marginTop: '16px' }}>
                                <Popconfirm
                                    title="Cancel Task"
                                    description="Are you sure you want to cancel this task?"
                                    onConfirm={() => {
                                        handleCancelTask(selectedTask.task_id);
                                        closeTaskDetails();
                                    }}
                                    okText="Yes"
                                    cancelText="No"
                                >
                                    <Button type="primary" danger icon={<StopOutlined />}>
                                        Cancel Task
                                    </Button>
                                </Popconfirm>
                            </div>
                        )}
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default TasksList;
