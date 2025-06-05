import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Card,
    Typography,
    Space,
    Button,
    Tag,
    Spin,
    message,
    Progress,
    Row,
    Col,
    Empty,
    Modal,
    Form,
    Input,
    Dropdown
} from 'antd';
import {
    BookOutlined,
    ArrowLeftOutlined,
    FolderOutlined,
    FileTextOutlined,
    VideoCameraOutlined,
    DownloadOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    HolderOutlined,
    MoreOutlined
} from '@ant-design/icons';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
    getCourse,
    CourseResponse,
    getCourseProgress,
    updateCourse,
    generateLessonVideo,
    getTaskStatus
} from '@/services/index';
import { useAccountStore } from '@/stores';
import styles from './index.module.css';


const { Title, Paragraph } = Typography;
const { TextArea } = Input;

// Item types for drag and drop
const ItemTypes = {
    LESSON: 'lesson',
    CHAPTER: 'chapter'
};

interface EditModalData {
    type: 'chapter' | 'lesson';
    data: any;
    chapterIndex?: number;
    lessonIndex?: number;
}

// Draggable Lesson Component
interface DraggableLessonProps {
    lesson: any;
    lessonIndex: number;
    chapterIndex: number;
    onMove: (dragIndex: number, hoverIndex: number, dragChapterIndex: number, hoverChapterIndex: number) => void;
    onEdit: (lesson: any, lessonIndex: number, chapterIndex: number) => void;
    onDelete: (lessonIndex: number, chapterIndex: number) => void;
    onSelect: (lesson: any) => void;
    onGenerateVideo: (lesson: any, lessonIndex: number, chapterIndex: number) => void;
    isSelected: boolean;
}

const DraggableLesson: React.FC<DraggableLessonProps> = ({
    lesson,
    lessonIndex,
    chapterIndex,
    onMove,
    onEdit,
    onDelete,
    onSelect,
    onGenerateVideo,
    isSelected
}) => {
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.LESSON,
        item: { lessonIndex, chapterIndex, type: 'lesson' },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: ItemTypes.LESSON,
        hover: (draggedItem: any) => {
            if (draggedItem.lessonIndex !== lessonIndex || draggedItem.chapterIndex !== chapterIndex) {
                onMove(draggedItem.lessonIndex, lessonIndex, draggedItem.chapterIndex, chapterIndex);
                draggedItem.lessonIndex = lessonIndex;
                draggedItem.chapterIndex = chapterIndex;
            }
        },
    }); const dropdownItems = [
        {
            key: 'edit',
            label: 'Edit Lesson',
            icon: <EditOutlined />,
            onClick: () => onEdit(lesson, lessonIndex, chapterIndex)
        },
        ...((!lesson.task_id && !lesson.video_url) ? [{
            key: 'generate-video',
            label: 'Generate Video',
            icon: <VideoCameraOutlined />,
            onClick: () => onGenerateVideo(lesson, lessonIndex, chapterIndex)
        }] : []),
        ...((lesson.video_url || lesson.task_id) ? [{
            key: 'regenerate',
            label: 'Regenerate',
            icon: <ReloadOutlined />,
            onClick: () => onGenerateVideo(lesson, lessonIndex, chapterIndex)
        }] : []),
        {
            key: 'delete',
            label: 'Delete Lesson',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
                Modal.confirm({
                    title: 'Delete Lesson',
                    content: 'Are you sure you want to delete this lesson?',
                    onOk: () => onDelete(lessonIndex, chapterIndex)
                });
            }
        }
    ];

    return (
        <div
            ref={node => {
                drag(drop(node));
            }}
            style={{
                opacity: isDragging ? 0.5 : 1,
                cursor: 'move',
                padding: '8px',
                margin: '4px 0',
                backgroundColor: isSelected ? '#e6f7ff' : '#fafafa',
                border: isSelected ? '1px solid #1890ff' : '1px solid #d9d9d9',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}
            onClick={() => onSelect(lesson)}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <HolderOutlined style={{ color: '#999' }} />                {lesson.video_url ? (
                    <VideoCameraOutlined style={{ color: '#52c41a' }} />
                ) : (
                    <FileTextOutlined style={{ color: '#666' }} />
                )}                <span>Lesson {lessonIndex + 1}: {lesson.title}</span>
                {lesson.task_id ? (
                    <Tag
                        color={
                            lesson.status === 'completed' ? 'success' :
                                lesson.status === 'processing' ? 'processing' :
                                    lesson.status === 'failed' ? 'error' : 'default'
                        }
                    >
                        {lesson.status || 'pending'}
                    </Tag>
                ) : (
                    <Tag color="blue">
                        Draft
                    </Tag>
                )}            </div>
            <Dropdown menu={{ items: dropdownItems }} trigger={['click']}>
                <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
        </div>
    );
};

// Draggable Chapter Component
interface DraggableChapterProps {
    chapter: any;
    chapterIndex: number;
    onMove: (dragIndex: number, hoverIndex: number) => void;
    onEdit: (chapter: any, chapterIndex: number) => void;
    onDelete: (chapterIndex: number) => void;
    onAddLesson: (chapterIndex: number) => void;
    onLessonMove: (dragLessonIndex: number, hoverLessonIndex: number, dragChapterIndex: number, hoverChapterIndex: number) => void;
    onLessonEdit: (lesson: any, lessonIndex: number, chapterIndex: number) => void;
    onLessonDelete: (lessonIndex: number, chapterIndex: number) => void;
    onLessonSelect: (lesson: any) => void;
    onLessonGenerateVideo: (lesson: any, lessonIndex: number, chapterIndex: number) => void;
    selectedLesson: any;
}

const DraggableChapter: React.FC<DraggableChapterProps> = ({
    chapter,
    chapterIndex,
    onMove,
    onEdit,
    onDelete,
    onAddLesson,
    onLessonMove,
    onLessonEdit,
    onLessonDelete,
    onLessonSelect,
    onLessonGenerateVideo,
    selectedLesson
}) => {
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.CHAPTER,
        item: { chapterIndex, type: 'chapter' },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: ItemTypes.CHAPTER,
        hover: (draggedItem: any) => {
            if (draggedItem.chapterIndex !== chapterIndex) {
                onMove(draggedItem.chapterIndex, chapterIndex);
                draggedItem.chapterIndex = chapterIndex;
            }
        },
    });

    const dropdownItems = [
        {
            key: 'addLesson',
            label: 'Add Lesson',
            icon: <PlusOutlined />,
            onClick: () => onAddLesson(chapterIndex)
        },
        {
            key: 'edit',
            label: 'Edit Chapter',
            icon: <EditOutlined />,
            onClick: () => onEdit(chapter, chapterIndex)
        },
        {
            key: 'delete',
            label: 'Delete Chapter',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
                Modal.confirm({
                    title: 'Delete Chapter',
                    content: 'Are you sure you want to delete this chapter and all its lessons?',
                    onOk: () => onDelete(chapterIndex)
                });
            }
        }
    ];

    return (
        <div
            ref={node => {
                drag(drop(node));
            }}
            style={{
                opacity: isDragging ? 0.5 : 1,
                margin: '16px 0',
                border: '1px solid #d9d9d9',
                borderRadius: '8px',
                backgroundColor: '#fff'
            }}
        >
            <div style={{
                padding: '12px 16px',
                backgroundColor: '#fafafa',
                borderBottom: '1px solid #d9d9d9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'move'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HolderOutlined style={{ color: '#999' }} />
                    <FolderOutlined style={{ color: '#1890ff' }} />
                    <span style={{ fontWeight: 'bold' }}>
                        Chapter {chapterIndex + 1}: {chapter.title}
                    </span>
                </div>
                <Dropdown menu={{ items: dropdownItems }} trigger={['click']}>
                    <Button type="text" size="small" icon={<MoreOutlined />} />
                </Dropdown>
            </div>
            <div style={{ padding: '8px' }}>                {chapter.lessons?.map((lesson: any, lessonIndex: number) => (
                <DraggableLesson
                    key={`lesson-${chapterIndex}-${lessonIndex}`}
                    lesson={lesson}
                    lessonIndex={lessonIndex}
                    chapterIndex={chapterIndex}
                    onMove={onLessonMove}
                    onEdit={onLessonEdit}
                    onDelete={onLessonDelete}
                    onSelect={onLessonSelect}
                    onGenerateVideo={onLessonGenerateVideo}
                    isSelected={selectedLesson && selectedLesson.id === lesson.id}
                />
            )) || []}
                <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    style={{ width: '100%', marginTop: '8px' }}
                    onClick={() => onAddLesson(chapterIndex)}
                >
                    Add Lesson
                </Button>
            </div>
        </div>
    );
};

const CourseView: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const router = useRouter();
    const [course, setCourse] = useState<CourseResponse | null>(null);
    const [courseProgress, setCourseProgress] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedLesson, setSelectedLesson] = useState<any>(null);
    const [isProgressLoading, setIsProgressLoading] = useState(false);
    const progressTimeoutRef = useRef<number | null>(null);
    const lastProgressCallRef = useRef<number>(0);

    // Enhanced state for new features
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editModalData, setEditModalData] = useState<EditModalData | null>(null);
    const [addModalVisible, setAddModalVisible] = useState(false); const [addModalType, setAddModalType] = useState<'chapter' | 'lesson'>('chapter');
    const [selectedChapterForLesson, setSelectedChapterForLesson] = useState<number | null>(null); const [form] = Form.useForm();

    // Debounced save to prevent too many API calls
    const saveTimeoutRef = useRef<number | null>(null);

    // Save course data to database
    const saveCourseToDatabase = useCallback(async (updatedCourse: CourseResponse) => {
        if (!courseId || !updatedCourse) return;

        try {
            const updateData = {
                title: updatedCourse.title,
                description: updatedCourse.description,
                prompt: updatedCourse.prompt,
                language: updatedCourse.language,
                voice_id: updatedCourse.voice_id,
                chapters: updatedCourse.chapters
            };

            await updateCourse(courseId, updateData);
            message.success('Changes saved successfully');
        } catch (error) {
            console.error('Failed to save course:', error);
            message.error('Failed to save changes');
        }
    }, [courseId]);

    // Debounced save for drag operations (saves after 1 second of no changes)
    const saveCourseDebounced = useCallback((updatedCourse: CourseResponse) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = window.setTimeout(() => {
            saveCourseToDatabase(updatedCourse);
        }, 1000);
    }, [saveCourseToDatabase]);
    const fetchProgressInBackground = useCallback(async (courseData: CourseResponse) => {
        // Only fetch progress if course is generating or completed
        if (!courseId) return;

        // Check if account ID is available
        const currentAccount = useAccountStore.getState().currentAccount;
        if (!currentAccount || !currentAccount.id) {
            console.log("Cannot fetch progress: No account ID available");
            return;
        }
        // Check if there are any incomplete lessons before making API calls
        const hasIncompleteLessons = courseData.chapters.some(chapter =>
            chapter.lessons.some((lesson: any) =>
                lesson.task_id && (!lesson.status || lesson.status !== 'completed')
            )
        );

        if (!hasIncompleteLessons) {
            console.log("Skipping progress API call: No incomplete lessons");
            return;
        }

        if (courseData.status === 'generating' || courseData.status === 'completed') {
            const now = Date.now();
            // Debounce: prevent calls if less than 2 seconds since last call
            if (isProgressLoading || (now - lastProgressCallRef.current < 2000)) {
                return;
            }

            lastProgressCallRef.current = now;

            // Clear any pending timeout
            if (progressTimeoutRef.current) {
                clearTimeout(progressTimeoutRef.current);
                progressTimeoutRef.current = null;
            }

            setIsProgressLoading(true);
            try {
                const progress = await getCourseProgress(courseId!);
                setCourseProgress(progress);

                // Also refresh course data to get updated video URLs
                const updatedCourseData = await getCourse(courseId!);
                setCourse(updatedCourseData);

                // Update selected lesson if it was updated
                if (selectedLesson) {
                    const updatedLesson = updatedCourseData.chapters
                        .flatMap(chapter => chapter.lessons)
                        .find(lesson => lesson.id === selectedLesson.id);
                    if (updatedLesson) {
                        setSelectedLesson(updatedLesson);
                    }
                }
            } catch (error) {
                console.log('Could not fetch progress:', error);
                // Silently fail for progress API to not block UI
            } finally {
                setIsProgressLoading(false);
            }
        }
    }, [courseId, isProgressLoading, selectedLesson]); const fetchCourseData = async () => {
        if (!courseId) return;

        // Get current account from store
        const currentAccount = useAccountStore.getState().currentAccount;

        // Don't proceed if no account ID is available
        if (!currentAccount || !currentAccount.id) {
            console.log("Cannot fetch course data: No account ID available");
            message.error("Account information not available. Please try again.");
            return;
        }

        setLoading(true);
        try {
            const courseData = await getCourse(courseId);
            setCourse(courseData);

            // Check if there are any incomplete lessons before calling progress API
            const hasIncompleteLessons = courseData.chapters.some(chapter =>
                chapter.lessons.some((lesson: any) =>
                    lesson.task_id && (!lesson.status || lesson.status !== 'completed')
                )
            );

            if (hasIncompleteLessons) {
                // Call progress API in background without blocking UI
                // Use setTimeout to ensure this runs after the main UI update
                progressTimeoutRef.current = window.setTimeout(() => {
                    fetchProgressInBackground(courseData);
                }, 100); // Small delay to ensure UI renders first
            } else {
                console.log("Skipping initial progress API call: No incomplete lessons");
            }

        } catch (error) {
            console.error('Failed to fetch course:', error);
            message.error('Failed to load course data');
        } finally {
            // Only hide loading for the main course API call
            setLoading(false);
        }
    };// Use effect to check if account is ready before fetching data

    let fetchCourseDataCalled = useRef(false);
    useEffect(() => {
        const currentAccount = useAccountStore.getState().currentAccount;

        if (courseId && currentAccount && !fetchCourseDataCalled.current) {
            fetchCourseData();
        }

        // Cleanup function
        return () => {
            if (progressTimeoutRef.current) {
                clearTimeout(progressTimeoutRef.current);
                progressTimeoutRef.current = null;
            }
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
        };
    }, [courseId, useAccountStore.getState().currentAccount]);

    // Subscribe to account store changes
    useEffect(() => {
        // This will run when the component mounts
        const unsubscribe = useAccountStore.subscribe((state) => {
            // When account becomes available and we have a courseId, fetch data
            if (state.currentAccount && courseId && !course) {
                fetchCourseData();
            }
        });

        // Return cleanup function to unsubscribe when component unmounts
        return () => unsubscribe();
    }, [courseId]);    // Auto-refresh progress for generating courses
    useEffect(() => {
        let intervalId: number;

        if (course?.status === 'generating' || course?.status === 'completed') {
            // Check if there are any incomplete lessons
            const hasIncompleteLessons = course.chapters.some(chapter =>
                chapter.lessons.some((lesson: any) =>
                    lesson.task_id && (!lesson.status || lesson.status !== 'completed')
                )
            );

            // Only set up polling if there are incomplete lessons
            if (hasIncompleteLessons) {
                console.log("Setting up progress polling for incomplete lessons");
                // Refresh progress every 8 seconds for courses with incomplete lessons
                intervalId = window.setInterval(() => {
                    // Double check if course still exists and not already loading
                    if (course && !isProgressLoading) {
                        fetchProgressInBackground(course);
                    }
                }, 8000); // Increased from 5 to 8 seconds
            } else {
                console.log("Skipping progress polling: No incomplete lessons");
            }
        }
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
            if (progressTimeoutRef.current) {
                clearTimeout(progressTimeoutRef.current);
                progressTimeoutRef.current = null;
            }
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
        };
    }, [course?.status, isProgressLoading, fetchProgressInBackground, course]);

    // Sort lessons within chapters by order
    const sortLessons = useCallback((lessons: any[]) => {
        if (!lessons) return [];

        return [...lessons].sort((a, b) => {
            return (a.order || 0) - (b.order || 0);
        });
    }, []);    // Chapter movement
    const moveChapter = useCallback((dragIndex: number, hoverIndex: number) => {
        if (!course) return;

        const newChapters = [...course.chapters];
        const draggedChapter = newChapters[dragIndex];
        newChapters.splice(dragIndex, 1);
        newChapters.splice(hoverIndex, 0, draggedChapter);

        const updatedCourse = { ...course, chapters: newChapters };
        setCourse(updatedCourse);

        // Use debounced save for drag operations
        saveCourseDebounced(updatedCourse);
    }, [course, saveCourseDebounced]);

    // Lesson movement
    const moveLesson = useCallback((
        dragLessonIndex: number,
        hoverLessonIndex: number,
        dragChapterIndex: number,
        hoverChapterIndex: number
    ) => {
        if (!course) return;

        const newChapters = [...course.chapters];
        // Remove lesson from source chapter
        const draggedLesson = newChapters[dragChapterIndex].lessons[dragLessonIndex];
        newChapters[dragChapterIndex].lessons.splice(dragLessonIndex, 1);

        // Add lesson to target chapter
        newChapters[hoverChapterIndex].lessons.splice(hoverLessonIndex, 0, draggedLesson);
        const updatedCourse = { ...course, chapters: newChapters };
        setCourse(updatedCourse);

        // Use debounced save for drag operations
        saveCourseDebounced(updatedCourse);
    }, [course, saveCourseDebounced]);

    // Edit handlers
    const handleEditChapter = (chapter: any, chapterIndex: number) => {
        setEditModalData({
            type: 'chapter',
            data: chapter,
            chapterIndex
        });
        setEditModalVisible(true);
        form.setFieldsValue({
            title: chapter.title,
            description: chapter.description
        });
    };

    const handleEditLesson = (lesson: any, lessonIndex: number, chapterIndex: number) => {
        setEditModalData({
            type: 'lesson',
            data: lesson,
            lessonIndex,
            chapterIndex
        });
        setEditModalVisible(true);
        form.setFieldsValue({
            title: lesson.title,
            description: lesson.description,
            content: lesson.content
        });
    };    // Delete handlers
    const handleDeleteChapter = (chapterIndex: number) => {
        if (!course) return;

        const newChapters = [...course.chapters];
        newChapters.splice(chapterIndex, 1);
        const updatedCourse = { ...course, chapters: newChapters };
        setCourse(updatedCourse);

        // Save to database
        saveCourseToDatabase(updatedCourse);
        message.success('Chapter deleted successfully');
    };

    const handleDeleteLesson = (lessonIndex: number, chapterIndex: number) => {
        if (!course) return;

        const newChapters = [...course.chapters];
        newChapters[chapterIndex].lessons.splice(lessonIndex, 1);
        const updatedCourse = { ...course, chapters: newChapters };
        setCourse(updatedCourse);

        // Save to database
        saveCourseToDatabase(updatedCourse);
        message.success('Lesson deleted successfully');
    };

    // Add handlers
    const handleAddChapter = () => {
        setAddModalType('chapter');
        setAddModalVisible(true);
        form.resetFields();
    };

    const handleAddLesson = (chapterIndex: number) => {
        setAddModalType('lesson');
        setSelectedChapterForLesson(chapterIndex);
        setAddModalVisible(true);
        form.resetFields();
    };    // Modal handlers
    const handleEditModalOk = async () => {
        try {
            const values = await form.validateFields();

            if (!course || !editModalData) return;

            const newCourse = { ...course };

            if (editModalData.type === 'chapter' && editModalData.chapterIndex !== undefined) {
                newCourse.chapters[editModalData.chapterIndex] = {
                    ...newCourse.chapters[editModalData.chapterIndex],
                    ...values
                };
            } else if (editModalData.type === 'lesson' &&
                editModalData.chapterIndex !== undefined &&
                editModalData.lessonIndex !== undefined) {
                newCourse.chapters[editModalData.chapterIndex].lessons[editModalData.lessonIndex] = {
                    ...newCourse.chapters[editModalData.chapterIndex].lessons[editModalData.lessonIndex],
                    ...values
                };
            }

            setCourse(newCourse);
            setEditModalVisible(false);
            setEditModalData(null);

            // Save to database
            await saveCourseToDatabase(newCourse);
            message.success(`${editModalData.type} updated successfully`);
        } catch (error) {
            console.error('Failed to update:', error);
            message.error('Failed to update. Please try again.');
        }
    };

    const handleAddModalOk = async () => {
        try {
            const values = await form.validateFields();

            if (!course) return;
            const newCourse = { ...course };
            if (addModalType === 'chapter') {
                const newChapter = {
                    id: `chapter-${Date.now()}`,
                    course_id: courseId,
                    title: values.title,
                    description: values.description || '',
                    lessons: [],
                    order: newCourse.chapters.length,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                newCourse.chapters.push(newChapter);
            } else if (addModalType === 'lesson' && selectedChapterForLesson !== null) {
                const chapterId = newCourse.chapters[selectedChapterForLesson].id;
                const newLesson = {
                    id: `lesson-${Date.now()}`,
                    chapter_id: chapterId,
                    title: values.title,
                    description: values.description || '',
                    content: values.content || '',
                    duration_minutes: null,
                    order: newCourse.chapters[selectedChapterForLesson].lessons.length,
                    status: 'PENDING',
                    video_url: null,
                    task_id: null,
                    task_data: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                newCourse.chapters[selectedChapterForLesson].lessons.push(newLesson);
            }
            setCourse(newCourse);
            setAddModalVisible(false);
            setSelectedChapterForLesson(null);

            // Save to database
            await saveCourseToDatabase(newCourse);
            message.success(`${addModalType} added successfully`);
        } catch (error) {
            console.error('Failed to add:', error);
            message.error('Failed to add. Please try again.');
        }
    }; const handleGenerateLessonVideo = async (lesson: any, lessonIndex: number, chapterIndex: number) => {
        if (!course || !courseId) return;

        try {
            setLoading(true);
            const response = await generateLessonVideo({
                courseId: courseId,
                lessonId: lesson.id
            });

            // Update the lesson with the task_id
            const newChapters = [...course.chapters];
            newChapters[chapterIndex].lessons[lessonIndex] = {
                ...lesson,
                task_id: response.task_id,
                status: 'pending'
            };

            const updatedCourse = { ...course, chapters: newChapters };
            setCourse(updatedCourse);

            // Different message depending on whether this is a new generation or regeneration
            const isRegeneration = lesson.video_url || (lesson.task_id && lesson.task_id !== response.task_id);
            message.success(isRegeneration ? 'Lesson regeneration started successfully' : 'Video generation started successfully');

            // Start tracking the task immediately to show progress
            const taskInfo = await getTaskStatus(response.task_id);
            console.log('Initial task status:', taskInfo);

            // Set up frequent initial polling to show immediate progress
            let checkCount = 0;
            const initialCheckInterval = setInterval(async () => {
                try {
                    checkCount++;
                    const updatedTaskInfo = await getTaskStatus(response.task_id);

                    // Update the lesson status based on task status
                    const refreshedChapters = [...course.chapters];
                    refreshedChapters[chapterIndex].lessons[lessonIndex] = {
                        ...refreshedChapters[chapterIndex].lessons[lessonIndex],
                        status: updatedTaskInfo.status === 'COMPLETED' ? 'completed' :
                            updatedTaskInfo.status === 'FAILED' ? 'failed' : 'processing',
                        progress: updatedTaskInfo.progress || 0
                    };

                    setCourse({ ...course, chapters: refreshedChapters });
                    // If status is completed or failed, or we've checked 5 times, stop polling
                    if (updatedTaskInfo.status === 'COMPLETED' || updatedTaskInfo.status === 'FAILED' || checkCount >= 5) {
                        clearInterval(initialCheckInterval);

                        if (updatedTaskInfo.status === 'COMPLETED') {
                            // Fetch the course again to get the updated video URL
                            const updatedCourse = await getCourse(courseId);
                            setCourse(updatedCourse);

                            // No need to continue polling for completed tasks
                            message.success('Video generation completed successfully');
                        } else if (updatedTaskInfo.status === 'FAILED') {
                            message.error('Video generation failed');
                        }
                    }
                } catch (error) {
                    console.error('Error checking task status:', error);
                    clearInterval(initialCheckInterval);
                }
            }, 2000); // Check every 2 seconds initially
        } catch (error) {
            console.error('Failed to generate lesson video:', error);
            message.error('Failed to start video generation');
        } finally {
            setLoading(false);
        }
    }; const handleBackToCourses = () => {
        router.push('/course-maker');
    };

    // Debug: Log when selectedLesson changes
    useEffect(() => {
        console.log('Selected lesson changed:', selectedLesson);
        if (selectedLesson?.video_url) {
            console.log('Video URL:', selectedLesson.video_url);
        }
    }, [selectedLesson]);

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

    const sortedChapters = course.chapters?.map(chapter => ({
        ...chapter,
        lessons: sortLessons(chapter.lessons || [])
    })) || [];

    return (
        <DndProvider backend={HTML5Backend}>
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
                        )}                        {/* Toolbar */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            marginBottom: '16px',
                            padding: '12px',
                            backgroundColor: '#fafafa',
                            borderRadius: '6px'
                        }}>
                            <Space>
                                <Button
                                    type="default"
                                    icon={<PlusOutlined />}
                                    onClick={handleAddChapter}
                                >
                                    Add Chapter
                                </Button>                                <Button
                                    type="primary"
                                    icon={<ReloadOutlined />}
                                    onClick={fetchCourseData}
                                    loading={loading}
                                >
                                    Refresh Course
                                </Button>
                            </Space>
                        </div>
                    </div>

                    {/* Main Content */}
                    <Row gutter={24}>
                        {/* Course Structure with Drag & Drop */}
                        <Col xs={24} lg={12}>
                            <Card title="Course Structure" size="small">
                                {sortedChapters.length === 0 ? (
                                    <Empty description="No chapters yet">
                                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddChapter}>
                                            Add First Chapter
                                        </Button>
                                    </Empty>
                                ) : (
                                    sortedChapters.map((chapter: any, chapterIndex: number) => (<DraggableChapter
                                        key={`chapter-${chapterIndex}`}
                                        chapter={chapter}
                                        chapterIndex={chapterIndex}
                                        onMove={moveChapter}
                                        onEdit={handleEditChapter}
                                        onDelete={handleDeleteChapter}
                                        onAddLesson={handleAddLesson}
                                        onLessonMove={moveLesson}
                                        onLessonEdit={handleEditLesson}
                                        onLessonDelete={handleDeleteLesson}
                                        onLessonSelect={setSelectedLesson}
                                        onLessonGenerateVideo={handleGenerateLessonVideo}
                                        selectedLesson={selectedLesson}
                                    />
                                    ))
                                )}
                            </Card>
                        </Col>                        {/* Lesson Details */}
                        <Col xs={24} lg={12}>
                            <Card
                                title="Lesson Details"
                                size="small"
                                extra={
                                    <Button
                                        icon={<ReloadOutlined />}
                                        size="small"
                                        onClick={fetchCourseData}
                                        loading={loading}
                                        title="Refresh course data"
                                    />
                                }
                            >
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
                                        )}                                        {/* Video Player */}
                                        {selectedLesson.video_url && (
                                            <div style={{ marginTop: '16px' }}>
                                                <strong>Generated Video:</strong>
                                                <div style={{ marginTop: '8px' }}>                                                    <video
                                                    key={selectedLesson.id} // Force re-render when lesson changes
                                                    controls
                                                    style={{ width: '100%', maxHeight: '300px' }}
                                                    poster={selectedLesson.thumbnail_url}
                                                    onLoadStart={() => console.log('Video loading started for lesson:', selectedLesson.id)}
                                                    onLoadedData={() => console.log('Video loaded for lesson:', selectedLesson.id)}
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
                                        description="Select a lesson from the structure to view details"
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    />
                                )}
                            </Card>
                        </Col>
                    </Row>

                    {/* Edit Modal */}
                    <Modal
                        title={`Edit ${editModalData?.type || ''}`}
                        open={editModalVisible}
                        onOk={handleEditModalOk}
                        onCancel={() => setEditModalVisible(false)}
                        width={600}
                    >
                        <Form form={form} layout="vertical">
                            <Form.Item
                                name="title"
                                label="Title"
                                rules={[{ required: true, message: 'Please enter a title' }]}
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item
                                name="description"
                                label="Description"
                            >
                                <TextArea rows={3} />
                            </Form.Item>
                            {editModalData?.type === 'lesson' && (
                                <Form.Item
                                    name="content"
                                    label="Content"
                                >
                                    <TextArea rows={6} />
                                </Form.Item>
                            )}
                        </Form>
                    </Modal>

                    {/* Add Modal */}
                    <Modal
                        title={`Add ${addModalType}`}
                        open={addModalVisible}
                        onOk={handleAddModalOk}
                        onCancel={() => setAddModalVisible(false)}
                        width={600}
                    >
                        <Form form={form} layout="vertical">
                            <Form.Item
                                name="title"
                                label="Title"
                                rules={[{ required: true, message: 'Please enter a title' }]}
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item
                                name="description"
                                label="Description"
                            >
                                <TextArea rows={3} />
                            </Form.Item>
                            {addModalType === 'lesson' && (
                                <Form.Item
                                    name="content"
                                    label="Content"
                                >
                                    <TextArea rows={6} />
                                </Form.Item>
                            )}
                        </Form>
                    </Modal>
                </Card>
            </div>
        </DndProvider>
    );
};

export default CourseView;
