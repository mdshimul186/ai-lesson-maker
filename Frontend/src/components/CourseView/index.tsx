import React, { useState, useEffect } from 'react';
import { 
    Card, 
    Typography, 
    Space, 
    Button, 
    Tree, 
    Tag,
    Spin,
    message,
    Progress,
    Row,
    Col,
    Empty
} from 'antd';
import { 
    BookOutlined, 
    ArrowLeftOutlined,
    FolderOutlined,
    FileTextOutlined,
    VideoCameraOutlined,
    DownloadOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    getCourse,
    CourseResponse,
    getCourseProgress
} from '../../services/index';
import type { DataNode } from 'antd/es/tree';
import styles from './index.module.css';

const { Title, Paragraph } = Typography;

interface TreeNodeData extends DataNode {
    type: 'chapter' | 'lesson';
    chapterIndex?: number;
    lessonIndex?: number;
    lessonData?: any;
}

const CourseView: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    
    const [course, setCourse] = useState<CourseResponse | null>(null);
    const [courseProgress, setCourseProgress] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedLesson, setSelectedLesson] = useState<any>(null);
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

    useEffect(() => {
        if (courseId) {
            fetchCourseData();
        }
    }, [courseId]);

    const fetchCourseData = async () => {
        if (!courseId) return;
        
        setLoading(true);
        try {
            const courseData = await getCourse(courseId);
            setCourse(courseData);
            
            // Auto-expand all chapters
            const chapterKeys = courseData.chapters.map((_: any, index: number) => `chapter-${index}`);
            setExpandedKeys(chapterKeys);
            
            // Fetch progress if course is generating or completed
            if (courseData.status === 'generating' || courseData.status === 'completed') {
                try {
                    const progress = await getCourseProgress(courseId);
                    setCourseProgress(progress);
                } catch (error) {
                    console.log('Could not fetch progress:', error);
                }
            }
        } catch (error) {
            console.error('Failed to fetch course:', error);
            message.error('Failed to load course data');
        } finally {
            setLoading(false);
        }
    };

    const buildTreeData = (): TreeNodeData[] => {
        if (!course?.chapters) return [];

        return course.chapters.map((chapter: any, chapterIndex: number) => ({
            title: (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FolderOutlined style={{ color: '#1890ff' }} />
                    <span style={{ fontWeight: 'bold' }}>
                        Chapter {chapterIndex + 1}: {chapter.title}
                    </span>
                </div>
            ),
            key: `chapter-${chapterIndex}`,
            type: 'chapter',
            chapterIndex,
            children: chapter.lessons?.map((lesson: any, lessonIndex: number) => ({
                title: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {lesson.video_url ? (
                            <VideoCameraOutlined style={{ color: '#52c41a' }} />
                        ) : (
                            <FileTextOutlined style={{ color: '#666' }} />
                        )}
                        <span>Lesson {lessonIndex + 1}: {lesson.title}</span>
                        {lesson.task_id && (
                            <Tag 
                                color={
                                    lesson.status === 'completed' ? 'success' : 
                                    lesson.status === 'processing' ? 'processing' : 
                                    lesson.status === 'failed' ? 'error' : 'default'
                                }
                            >
                                {lesson.status || 'pending'}
                            </Tag>
                        )}
                    </div>
                ),
                key: `lesson-${chapterIndex}-${lessonIndex}`,
                type: 'lesson',
                chapterIndex,
                lessonIndex,
                lessonData: lesson,
                isLeaf: true
            })) || []
        }));
    };

    const handleTreeSelect = (selectedKeys: React.Key[], info: any) => {
        if (selectedKeys.length > 0 && info.node.type === 'lesson') {
            setSelectedLesson(info.node.lessonData);
        }
    };

    const handleBackToCourses = () => {
        navigate('/course-maker');
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
                <p style={{ marginTop: '16px' }}>Loading course data...</p>
            </div>
        );
    }

    if (!course) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Empty description="Course not found" />
                <Button type="primary" onClick={handleBackToCourses}>
                    Back to Courses
                </Button>
            </div>
        );
    }

    const treeData = buildTreeData();

    return (
        <div className={styles.courseViewContainer}>
            <Card className={styles.mainCard}>
                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
                    <Button 
                        icon={<ArrowLeftOutlined />}
                        onClick={handleBackToCourses}
                        style={{ marginBottom: '16px' }}
                    >
                        Back to Courses
                    </Button>
                    
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <Title level={2}>
                            <BookOutlined style={{ color: '#52c41a', marginRight: '12px' }} />
                            {course.title}
                        </Title>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
                            <Tag 
                                color={
                                    course.status === 'completed' ? 'success' : 
                                    course.status === 'generating' ? 'processing' : 
                                    course.status === 'failed' ? 'error' : 'default'
                                }
                                style={{ fontSize: '14px', padding: '4px 12px' }}
                            >
                                {course.status.toUpperCase()}
                            </Tag>
                        </div>
                    </div>

                    {/* Course Info */}
                    <Row gutter={24} style={{ marginBottom: '16px' }}>
                        <Col xs={24}>
                            {course.description && (
                                <Paragraph style={{ textAlign: 'center', fontSize: '16px', color: '#666' }}>
                                    {course.description}
                                </Paragraph>
                            )}
                        </Col>
                    </Row>

                    <Row gutter={24} style={{ marginBottom: '24px' }}>
                        <Col xs={24} sm={6}>
                            <div style={{ textAlign: 'center' }}>
                                <strong>Language</strong>
                                <div>{course.language}</div>
                            </div>
                        </Col>
                        <Col xs={24} sm={6}>
                            <div style={{ textAlign: 'center' }}>
                                <strong>Total Lessons</strong>
                                <div>{course.total_lessons}</div>
                            </div>
                        </Col>
                        <Col xs={24} sm={6}>
                            <div style={{ textAlign: 'center' }}>
                                <strong>Duration</strong>
                                <div>{course.estimated_duration_minutes} min</div>
                            </div>
                        </Col>
                        <Col xs={24} sm={6}>
                            <div style={{ textAlign: 'center' }}>
                                <strong>Created</strong>
                                <div>{new Date(course.created_at).toLocaleDateString()}</div>
                            </div>
                        </Col>
                    </Row>

                    {/* Progress Bar */}
                    {course.status === 'generating' && courseProgress && (
                        <div style={{ marginBottom: '24px' }}>
                            <h4>Generation Progress</h4>
                            <Progress 
                                percent={Math.round((courseProgress.completed_lessons / courseProgress.total_lessons) * 100)}
                                status={courseProgress.failed_lessons > 0 ? 'exception' : 'active'}
                                strokeColor={{
                                    '0%': '#108ee9',
                                    '100%': '#87d068',
                                }}
                            />
                            <p style={{ marginTop: '8px', textAlign: 'center' }}>
                                {courseProgress.completed_lessons} of {courseProgress.total_lessons} lessons completed
                                {courseProgress.failed_lessons > 0 && (
                                    <span style={{ color: '#ff4d4f', marginLeft: '16px' }}>
                                        ({courseProgress.failed_lessons} failed)
                                    </span>
                                )}
                            </p>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <Row gutter={24}>
                    {/* Tree Structure */}
                    <Col xs={24} lg={12}>
                        <Card title="Course Structure" size="small">
                            <Tree
                                treeData={treeData}
                                expandedKeys={expandedKeys}
                                onExpand={setExpandedKeys}
                                onSelect={handleTreeSelect}
                                defaultExpandAll
                                showLine={{ showLeafIcon: false }}
                                blockNode
                            />
                        </Card>
                    </Col>

                    {/* Lesson Details */}
                    <Col xs={24} lg={12}>
                        <Card title="Lesson Details" size="small">
                            {selectedLesson ? (
                                <div>
                                    <Title level={4}>{selectedLesson.title}</Title>
                                    
                                    {selectedLesson.description && (
                                        <div style={{ marginBottom: '16px' }}>
                                            <strong>Description:</strong>
                                            <p style={{ marginTop: '8px' }}>{selectedLesson.description}</p>
                                        </div>
                                    )}

                                    {selectedLesson.content && (
                                        <div style={{ marginBottom: '16px' }}>
                                            <strong>Content:</strong>
                                            <div style={{ 
                                                marginTop: '8px', 
                                                padding: '12px', 
                                                backgroundColor: '#f5f5f5', 
                                                borderRadius: '6px',
                                                maxHeight: '200px',
                                                overflowY: 'auto'
                                            }}>
                                                {selectedLesson.content}
                                            </div>
                                        </div>
                                    )}

                                    {/* Video Player */}
                                    {selectedLesson.video_url && (
                                        <div style={{ marginTop: '16px' }}>
                                            <strong>Generated Video:</strong>
                                            <div style={{ marginTop: '8px' }}>
                                                <video 
                                                    controls 
                                                    style={{ width: '100%', maxHeight: '300px' }}
                                                    poster={selectedLesson.thumbnail_url}
                                                >
                                                    <source src={selectedLesson.video_url} type="video/mp4" />
                                                    Your browser does not support the video tag.
                                                </video>
                                            </div>
                                            
                                            {/* Download Options */}
                                            <div style={{ marginTop: '12px' }}>
                                                <Space>
                                                    <Button 
                                                        icon={<DownloadOutlined />}
                                                        href={selectedLesson.video_url} 
                                                        download={`${selectedLesson.title}.mp4`}
                                                    >
                                                        Download Video
                                                    </Button>
                                                    {selectedLesson.audio_url && (
                                                        <Button 
                                                            icon={<DownloadOutlined />}
                                                            href={selectedLesson.audio_url} 
                                                            download={`${selectedLesson.title}.mp3`}
                                                        >
                                                            Download Audio
                                                        </Button>
                                                    )}
                                                </Space>
                                            </div>
                                        </div>
                                    )}

                                    {/* Status Info */}
                                    {selectedLesson.task_id && (
                                        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '6px' }}>
                                            <strong>Task Status:</strong> 
                                            <Tag 
                                                style={{ marginLeft: '8px' }}
                                                color={
                                                    selectedLesson.status === 'completed' ? 'success' : 
                                                    selectedLesson.status === 'processing' ? 'processing' : 
                                                    selectedLesson.status === 'failed' ? 'error' : 'default'
                                                }
                                            >
                                                {selectedLesson.status || 'pending'}
                                            </Tag>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Empty 
                                    description="Select a lesson from the tree to view details"
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                />
                            )}
                        </Card>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default CourseView;
