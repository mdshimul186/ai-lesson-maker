import React, { useState, useEffect } from 'react';
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
    Alert
} from 'antd';
import { Task, getAllTasks } from '../../services/index';
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
    InfoCircleOutlined
} from '@ant-design/icons';
import styles from './index.module.css';

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
    const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);

    console.log(dateRange);

   // State for task details drawer
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
      // Function to fetch tasks
    const fetchTasks = async (page = 1, pageSize = 10, status?: string) => {
        setLoading(true);
        try {
            const skip = (page - 1) * pageSize;
            const response = await getAllTasks({
                limit: pageSize,
                skip,
                status
            });
            
            if (Array.isArray(response)) {
                setTasks(response);
                setPagination({
                    ...pagination,
                    current: page,
                    total: response.length + skip // This is an estimate; backend should ideally return total count
                });
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
    
    // Effect to load tasks on component mount
    useEffect(() => {
        fetchTasks(pagination.current, pagination.pageSize, statusFilter);
    }, []);
      // Function to handle table change (pagination, filters, sorter)
    const handleTableChange = (paginationParams: any) => {
        fetchTasks(paginationParams.current, paginationParams.pageSize, statusFilter);
    };
    
    // Function to apply filters
    const applyFilters = () => {
        fetchTasks(1, pagination.pageSize, statusFilter);
    };
    
    // Function to reset filters
    const resetFilters = () => {
        setStatusFilter(undefined);
        setSearchTerm('');
        setDateRange(null);
        fetchTasks(1, pagination.pageSize);
    };
    
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
            render: (status: string) => (
                <Tag color={
                    status === 'COMPLETED' ? 'success' :
                    status === 'FAILED' ? 'error' :
                    status === 'PENDING' ? 'default' :
                    status === 'PROCESSING' ? 'processing' :
                    'warning'
                } icon={
                    status === 'COMPLETED' ? <CheckCircleOutlined /> :
                    status === 'FAILED' ? <CloseCircleOutlined /> :
                    status === 'PENDING' ? <ClockCircleOutlined /> :
                    status === 'PROCESSING' ? <SyncOutlined spin /> :
                    <WarningOutlined />
                }>
                    {status}
                </Tag>
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
                    </Button>
                    {record.result_url && (
                        <Button 
                            type="link" 
                            size="small" 
                            href={record.result_url} 
                            target="_blank"
                        >
                            View Result
                        </Button>
                    )}
                </Space>
            ),
        },
    ];
    
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
                        <div className={styles.taskDetailHeader}>
                            <div>
                                <strong>Status:</strong>{' '}
                                <Tag color={
                                    selectedTask.status === 'COMPLETED' ? 'success' :
                                    selectedTask.status === 'FAILED' ? 'error' :
                                    selectedTask.status === 'PENDING' ? 'default' :
                                    selectedTask.status === 'PROCESSING' ? 'processing' :
                                    'warning'
                                } icon={
                                    selectedTask.status === 'COMPLETED' ? <CheckCircleOutlined /> :
                                    selectedTask.status === 'FAILED' ? <CloseCircleOutlined /> :
                                    selectedTask.status === 'PENDING' ? <ClockCircleOutlined /> :
                                    selectedTask.status === 'PROCESSING' ? <SyncOutlined spin /> :
                                    <WarningOutlined />
                                }>
                                    {selectedTask.status}
                                </Tag>
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
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default TasksList;
