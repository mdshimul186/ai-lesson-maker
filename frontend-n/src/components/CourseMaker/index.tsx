import React, { useState, useEffect } from 'react';
import { 
    Card, 
    Button, 
    Typography, 
    Space, 
    message,
    Table,
    Tag,
    Tooltip,
    Modal
} from 'antd';
import { 
    PlusOutlined,
    EyeOutlined,
    DeleteOutlined,
    PlaySquareOutlined,
    BookOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { 
    getCourseList,
    CourseResponse,
    deleteCourse,
    generateCourseLessons
} from '../../services/index';
import styles from './index.module.css';

const { Title, Paragraph } = Typography;

const CourseMaker: React.FC = () => {
    const router = useRouter();
    const [courses, setCourses] = useState<CourseResponse[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(false);    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    // Load courses when component mounts or pagination changes
    useEffect(() => {
        fetchCourses();
    }, [pagination.current, pagination.pageSize]);

    const fetchCourses = async () => {
        setCoursesLoading(true);
        try {
            const response = await getCourseList(pagination.current, pagination.pageSize);
            setCourses(response.courses || []);
            setPagination(prev => ({
                ...prev,
                total: response.total || 0
            }));
        } catch (error) {
            console.error('Failed to fetch courses:', error);
            message.error('Failed to load courses');
        } finally {
            setCoursesLoading(false);
        }
    };

    const handleCreateNewCourse = () => {
        router.push('/course-maker/create');
    };

    const handleViewCourseDetails = (course: CourseResponse) => {
        router.push(`/course/${course.id}`);
    };

    const handleDeleteCourse = async (courseId: string) => {
        Modal.confirm({
            title: 'Delete Course',
            content: 'Are you sure you want to delete this course? This action cannot be undone.',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await deleteCourse(courseId);
                    message.success('Course deleted successfully');
                    fetchCourses(); // Refresh the list
                } catch (error) {
                    console.error('Failed to delete course:', error);
                    message.error('Failed to delete course');
                }
            }
        });
    };

    const handleGenerateCourseLessons = async (courseId: string) => {
        try {
            message.info('Starting course lesson generation...');
            await generateCourseLessons(courseId);
            message.success('Course lesson generation started. Check the Tasks page for progress.');
            fetchCourses(); // Refresh to show updated status
        } catch (error) {
            console.error('Failed to start course generation:', error);
            message.error('Failed to start course generation');
        }
    };

    // Course list table columns
    const courseColumns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            render: (text: string, record: CourseResponse) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{text}</div>
                    {record.description && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                            {record.description.length > 100 
                                ? `${record.description.substring(0, 100)}...` 
                                : record.description}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const statusColors: { [key: string]: string } = {
                    'draft': 'default',
                    'generating': 'processing',
                    'completed': 'success',
                    'failed': 'error'
                };
                return <Tag color={statusColors[status] || 'default'}>{status.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Lessons',
            dataIndex: 'total_lessons',
            key: 'total_lessons',
            render: (count: number) => `${count} lessons`,
        },
        {
            title: 'Language',
            dataIndex: 'language',
            key: 'language',
        },
        {
            title: 'Created',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: CourseResponse) => (
                <Space>                    <Tooltip title="View Details">
                        <Button 
                            type="text" 
                            icon={<EyeOutlined />} 
                            size="small"
                            onClick={() => handleViewCourseDetails(record)}
                        />
                    </Tooltip>
                    {record.status === 'draft' && (
                        <Tooltip title="Generate Lessons">
                            <Button 
                                type="text" 
                                icon={<PlaySquareOutlined />} 
                                size="small"
                                onClick={() => handleGenerateCourseLessons(record.id)}
                            />
                        </Tooltip>
                    )}
                    <Tooltip title="Delete">
                        <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            size="small"
                            onClick={() => handleDeleteCourse(record.id)}
                        />
                    </Tooltip>
                </Space>
            ),
        },    ];

    return (
        <div className={styles.courseMakerContainer}>
            <Card className={styles.mainCard}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <Title level={2}>
                        <BookOutlined style={{ color: '#52c41a', marginRight: '12px' }} />
                        AI Course Maker
                    </Title>
                    <Paragraph>
                        Create comprehensive courses with multiple chapters and lessons using AI
                    </Paragraph>
                </div>

                <Card 
                    title="My Courses" 
                    className={styles.stepCard}
                    extra={
                        <Button 
                            type="primary" 
                            icon={<PlusOutlined />}
                            onClick={handleCreateNewCourse}
                        >
                            Create New Course
                        </Button>
                    }
                >
                    <Table
                        columns={courseColumns}
                        dataSource={courses}
                        loading={coursesLoading}
                        pagination={{
                            current: pagination.current,
                            pageSize: pagination.pageSize,
                            total: pagination.total,
                            showSizeChanger: true,
                            showTotal: (total, range) => 
                                `${range[0]}-${range[1]} of ${total} courses`,
                            onChange: (page, pageSize) => {
                                setPagination({
                                    current: page,
                                    pageSize: pageSize || 10,
                                    total: pagination.total
                                });
                            }
                        }}
                        rowKey="id"
                    />
                </Card>
            </Card>
        </div>
    );
};

export default CourseMaker;