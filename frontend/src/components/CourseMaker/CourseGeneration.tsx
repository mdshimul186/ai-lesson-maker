import React, { useState, useEffect } from 'react';
import {
    Card,
    Typography,
    Button,
    Progress,
    List,
    Tag,
    Space,
    Divider,
    message,
    Alert
} from 'antd';
import {
    LeftOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    SyncOutlined,
    PlayCircleOutlined,
    BookOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { createCourse, generateCourseLessons, getCourseProgress, CourseCreateRequest } from '../../services/index';

import styles from './index.module.css';

const { Title, Text, Paragraph } = Typography;

interface Chapter {
    id: string;
    title: string;
    description: string;
    order: number;
    lessons: Lesson[];
}
interface Lesson {
    id: string;
    title: string;
    content: string;
    order: number;
}
interface CourseStructure {
    title: string;
    description: string;
    chapters: Chapter[];
}

interface CourseFormData {
    prompt: string;
    language: string;
    voice: string;
    chapters: number;
    lessonsPerChapter?: number;
    targetAudience?: string;
    difficultyLevel?: string;
}

interface CourseGenerationProps {
    courseStructure: CourseStructure;
    formData: CourseFormData;
    onBack: () => void;
}

interface CourseTask {
    id: string;
    lessonTitle: string;
    chapterTitle: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    taskId?: string;
    resultUrl?: string;
    errorMessage?: string;
}

const CourseGeneration: React.FC<CourseGenerationProps> = ({
    courseStructure,
    formData,
    onBack
}) => {
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [courseTasks, setCourseTasks] = useState<CourseTask[]>([]);
    const [courseId, setCourseId] = useState<string | null>(null);
    const [overallProgress, setOverallProgress] = useState(0);
    const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Initialize course tasks from structure
        const tasks: CourseTask[] = [];
        courseStructure.chapters.forEach((chapter: Chapter) => {
            chapter.lessons.forEach((lesson: Lesson) => {
                tasks.push({
                    id: `${chapter.id}-${lesson.id}`,
                    lessonTitle: lesson.title,
                    chapterTitle: chapter.title,
                    status: 'pending',
                    progress: 0
                });
            });
        });
        setCourseTasks(tasks);

        // Cleanup interval on unmount
        return () => {
            if (progressInterval) {
                clearInterval(progressInterval);
            }
        };
    }, [courseStructure, progressInterval]);

    const handleStartGeneration = async () => {
        setIsGenerating(true);

        try {
            // First, save the course structure to backend
            message.loading('Creating course...', 0);

            // Create course using backend API
            const courseCreateRequest: CourseCreateRequest = {
                title: courseStructure.title,
                description: courseStructure.description,
                prompt: formData.prompt,
                language: formData.language,
                voice_id: formData.voice,
                target_audience: formData.targetAudience,
                difficulty_level: formData.difficultyLevel,
                chapters: courseStructure.chapters.map((chapter: Chapter) => ({
                    title: chapter.title,
                    description: chapter.description,
                    order: chapter.order,
                    lessons: chapter.lessons.map((lesson: Lesson) => ({
                        title: lesson.title,
                        content: lesson.content,
                        duration_minutes: 10, // Default duration
                        order: lesson.order
                    }))
                }))
            };



            console.log('Creating course:', courseCreateRequest);
            const createdCourse = await createCourse(courseCreateRequest);
            setCourseId(createdCourse.id);

            message.destroy();
            message.success('Course created successfully! Starting lesson generation...');


            // Start generating lessons using backend API            console.log('Generating lessons for course:', createdCourse.id);
            await generateCourseLessons(createdCourse.id);

            // Navigate back to course list after a short delay
            setTimeout(() => {
                router.push('/course-maker');
            }, 2000);

            // The code below is unreachable due to the return statement above and has been removed.

        } catch (error) {
            console.error('Error during course generation:', error);
            message.error('Failed to start course generation. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
            case 'processing':
                return <SyncOutlined spin style={{ color: '#1890ff' }} />;
            case 'failed':
                return <CheckCircleOutlined style={{ color: '#ff4d4f' }} />;
            default:
                return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'success';
            case 'processing':
                return 'processing';
            case 'failed':
                return 'error';
            default:
                return 'default';
        }
    };

    const completedCount = courseTasks.filter(t => t.status === 'completed').length;
    const failedCount = courseTasks.filter(t => t.status === 'failed').length;
    const processingCount = courseTasks.filter(t => t.status === 'processing').length;

    return (
        <div>
            <Card title="Course Generation" className={styles.stepCard}>
                <div className={styles.coursePreview}>
                    <Title level={3} className={styles.courseTitle}>
                        {courseStructure.title}
                    </Title>
                    <Paragraph className={styles.courseDescription}>
                        Ready to generate {courseTasks.length} video lessons across {courseStructure.chapters.length} chapters
                    </Paragraph>
                </div>

                {!isGenerating && overallProgress === 0 && (
                    <Alert
                        message="Ready to Generate Course"
                        description="Click the button below to start generating all lessons in this course. Each lesson will be created as a separate task that you can track in the Tasks page."
                        type="info"
                        showIcon
                        style={{ marginBottom: '24px' }}
                    />
                )}

                {(isGenerating || overallProgress > 0) && (
                    <div className={styles.generationProgress}>
                        <Title level={4}>
                            <BookOutlined style={{ marginRight: '8px' }} />
                            {overallProgress === 100 ? 'Course Generation Complete!' : 'Generating Course...'}
                        </Title>
                        <Progress
                            percent={overallProgress}
                            status={overallProgress === 100 ? "success" : "active"}
                            style={{ marginBottom: '16px' }}
                        />
                        <Text>
                            {completedCount} completed, {processingCount} processing, {failedCount} failed
                        </Text>
                    </div>
                )}

                {courseTasks.length > 0 && (
                    <>
                        <Divider orientation="left">Lesson Generation Progress</Divider>
                        <List
                            itemLayout="horizontal"
                            dataSource={courseTasks}
                            renderItem={(task) => (
                                <List.Item className={styles.taskCard}>
                                    <div className={styles.taskHeader}>
                                        <div>
                                            <Title level={5} className={styles.taskTitle}>
                                                {task.lessonTitle}
                                            </Title>
                                            <Text type="secondary">{task.chapterTitle}</Text>
                                        </div>
                                        <Space>
                                            {getStatusIcon(task.status)}
                                            <Tag color={getStatusColor(task.status)}>
                                                {task.status.toUpperCase()}
                                            </Tag>
                                        </Space>
                                    </div>

                                    {task.status === 'processing' && (
                                        <Progress
                                            percent={task.progress}
                                            size="small"
                                            status="active"
                                            style={{ marginTop: '8px' }}
                                        />
                                    )}

                                    {task.status === 'completed' && task.resultUrl && (
                                        <div style={{ marginTop: '8px' }}>
                                            <Button
                                                type="link"
                                                size="small"
                                                icon={<PlayCircleOutlined />}
                                                href={task.resultUrl}
                                                target="_blank"
                                            >
                                                View Video
                                            </Button>
                                        </div>
                                    )}

                                    {task.status === 'failed' && task.errorMessage && (
                                        <Alert
                                            message={task.errorMessage}
                                            type="error"
                                            style={{ marginTop: '8px' }}
                                        />
                                    )}
                                </List.Item>
                            )}
                        />
                    </>
                )}

                <Divider />

                <Space>
                    <Button
                        icon={<LeftOutlined />}
                        onClick={onBack}
                        disabled={isGenerating}
                    >
                        Back to Structure
                    </Button>

                    {!isGenerating && overallProgress === 0 && (
                        <Button
                            type="primary"
                            size="large"
                            onClick={handleStartGeneration}
                            style={{ marginLeft: 'auto' }}
                        >
                            <BookOutlined />
                            Generate All Lessons
                        </Button>
                    )}
                    {overallProgress === 100 && (
                        <Space>                            <Button
                                type="primary"
                                onClick={() => router.push('/course-maker')}
                            >
                                Back to Course List
                            </Button>
                            {courseId && (
                                <Button
                                    onClick={() => router.push(`/course/${courseId}`)}
                                >
                                    View Course
                                </Button>
                            )}
                        </Space>
                    )}
                </Space>
            </Card>
        </div>
    );
};

export default CourseGeneration;
