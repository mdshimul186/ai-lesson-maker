import React, { useState } from 'react';
import { 
    Card, 
    Typography, 
    Button, 
    Space, 
    Input, 
    Modal, 
    Form,
    Popconfirm,
    message,
    Row,
    Col,
    Divider
} from 'antd';
import { 
    EditOutlined, 
    DeleteOutlined, 
    PlusOutlined,
    DragOutlined,
    PlaySquareOutlined,
    LeftOutlined
} from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import styles from './index.module.css';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface Lesson {
    id: string;
    title: string;
    description: string;
    content: string; // Main content for the lesson
    order: number; // Order of the lesson within the chapter
}
interface Chapter {
    id: string;
    title: string;
    description: string;
    lessons: Lesson[];
    order: number; // Order of the chapter in the course
}
interface CourseStructure {
    title: string;
    description: string;
    chapters: Chapter[];
}

interface CourseStructureDisplayProps {
    courseStructure: CourseStructure;
    onStructureUpdate: (structure: CourseStructure) => void;
    onNext: () => void;
    onBack: () => void;
    formData?:any
}

const CourseStructureDisplay: React.FC<CourseStructureDisplayProps> = ({
    courseStructure,
    onStructureUpdate,
    onNext,
    onBack
}) => {
    const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
    const [editingLesson, setEditingLesson] = useState<{ lesson: Lesson; chapterId: string } | null>(null);
    const [addingLesson, setAddingLesson] = useState<string | null>(null);
    const [chapterForm] = Form.useForm();
    const [lessonForm] = Form.useForm();

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        const { source, destination, type } = result;

        if (type === 'chapter') {
            const newChapters = Array.from(courseStructure.chapters);
            const [reorderedChapter] = newChapters.splice(source.index, 1);
            newChapters.splice(destination.index, 0, reorderedChapter);

            // Update order numbers
            newChapters.forEach((chapter: Chapter, index: number) => {
                chapter.order = index + 1;
            });

            onStructureUpdate({
                ...courseStructure,
                chapters: newChapters
            });
        } else if (type === 'lesson') {
            const chapterId = source.droppableId.replace('lessons-', '');
            const chapter = courseStructure.chapters.find(c => c.id === chapterId);
            
            if (chapter) {
                const newLessons = Array.from(chapter.lessons);
                const [reorderedLesson] = newLessons.splice(source.index, 1);
                newLessons.splice(destination.index, 0, reorderedLesson);

                // Update order numbers
                newLessons.forEach((lesson: Lesson, index: number) => {
                    lesson.order = index + 1;
                });

                const updatedChapters = courseStructure.chapters.map(c =>
                    c.id === chapterId ? { ...c, lessons: newLessons } : c
                );

                onStructureUpdate({
                    ...courseStructure,
                    chapters: updatedChapters
                });
            }
        }
    };

    const handleEditChapter = (chapter: Chapter) => {
        setEditingChapter(chapter);
        chapterForm.setFieldsValue({
            title: chapter.title,
            description: chapter.description
        });
    };

    const handleSaveChapter = async (values: any) => {
        if (!editingChapter) return;

        const updatedChapters = courseStructure.chapters.map(c =>
            c.id === editingChapter.id 
                ? { ...c, title: values.title, description: values.description }
                : c
        );

        onStructureUpdate({
            ...courseStructure,
            chapters: updatedChapters
        });

        setEditingChapter(null);
        chapterForm.resetFields();
        message.success('Chapter updated successfully');
    };

    const handleDeleteChapter = (chapterId: string) => {
        const updatedChapters = courseStructure.chapters
            .filter((c: Chapter) => c.id !== chapterId)
            .map((c: Chapter, index: number) => ({ ...c, order: index + 1 }));

        onStructureUpdate({
            ...courseStructure,
            chapters: updatedChapters
        });

        message.success('Chapter deleted successfully');
    };

    const handleAddLesson = (chapterId: string) => {
        setAddingLesson(chapterId);
        lessonForm.resetFields();
    };

    const handleSaveNewLesson = async (values: any) => {
        if (!addingLesson) return;

        const chapter = courseStructure.chapters.find(c => c.id === addingLesson);
        if (!chapter) return;

        const newLesson: Lesson = {
            id: `lesson-${Date.now()}`,
            title: values.title,
            description: values.description,
            content: values.content || '',
            order: chapter.lessons.length + 1
        };

        // Check lesson count limit
        if (chapter.lessons.length >= 20) {
            message.error('Maximum 20 lessons per chapter allowed');
            return;
        }

        const updatedChapters = courseStructure.chapters.map(c =>
            c.id === addingLesson 
                ? { ...c, lessons: [...c.lessons, newLesson] }
                : c
        );

        onStructureUpdate({
            ...courseStructure,
            chapters: updatedChapters
        });

        setAddingLesson(null);
        lessonForm.resetFields();
        message.success('Lesson added successfully');
    };

    const handleEditLesson = (lesson: Lesson, chapterId: string) => {
        setEditingLesson({ lesson, chapterId });
        lessonForm.setFieldsValue({
            title: lesson.title,
            description: lesson.description,
            content: lesson.content
        });
    };

    const handleSaveLesson = async (values: any) => {
        if (!editingLesson) return;

        const { lesson, chapterId } = editingLesson;
        const updatedChapters = courseStructure.chapters.map(c =>
            c.id === chapterId 
                ? {
                    ...c,
                    lessons: c.lessons.map(l =>
                        l.id === lesson.id 
                            ? { ...l, title: values.title, description: values.description, content: values.content }
                            : l
                    )
                }
                : c
        );

        onStructureUpdate({
            ...courseStructure,
            chapters: updatedChapters
        });

        setEditingLesson(null);
        lessonForm.resetFields();
        message.success('Lesson updated successfully');
    };

    const handleDeleteLesson = (lessonId: string, chapterId: string) => {
        const updatedChapters = courseStructure.chapters.map(c =>
            c.id === chapterId 
                ? {
                    ...c,
                    lessons: c.lessons
                        .filter(l => l.id !== lessonId)
                        .map((l, index) => ({ ...l, order: index + 1 }))
                }
                : c
        );

        onStructureUpdate({
            ...courseStructure,
            chapters: updatedChapters
        });

        message.success('Lesson deleted successfully');
    };

    return (
        <div>
            <Card title="Course Structure Review" className={styles.stepCard}>
                <div className={styles.coursePreview}>
                    <Title level={3} className={styles.courseTitle}>
                        {courseStructure.title}
                    </Title>
                    <Paragraph className={styles.courseDescription}>
                        {courseStructure.description}
                    </Paragraph>
                    <Row gutter={16}>
                        <Col>
                            <Text strong>{courseStructure.chapters.length}</Text> chapters
                        </Col>
                        <Col>
                            <Text strong>
                                {courseStructure.chapters.reduce((total, chapter) => total + chapter.lessons.length, 0)}
                            </Text> lessons total
                        </Col>
                    </Row>
                </div>

                <Divider />

                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="chapters" type="chapter">
                        {(provided: any) => (
                            <div {...provided.droppableProps} ref={provided.innerRef}>
                                {courseStructure.chapters.map((chapter, index) => (
                                    <Draggable
                                        key={chapter.id}
                                        draggableId={chapter.id}
                                        index={index}
                                    >
                                        {(provided: any) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={styles.chapterCard}
                                            >
                                                <div className={styles.chapterHeader}>
                                                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className={styles.dragHandle}
                                                        >
                                                            <DragOutlined />
                                                        </div>
                                                        <div style={{ marginLeft: '12px', flex: 1 }}>
                                                            <Title level={4} style={{ margin: 0 }}>
                                                                {chapter.title}
                                                            </Title>
                                                            <Text type="secondary">
                                                                {chapter.description}
                                                            </Text>
                                                        </div>
                                                    </div>
                                                    <Space>
                                                        <Button
                                                            size="small"
                                                            icon={<EditOutlined />}
                                                            onClick={() => handleEditChapter(chapter)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Popconfirm
                                                            title="Delete this chapter?"
                                                            description="This will also delete all lessons in this chapter."
                                                            onConfirm={() => handleDeleteChapter(chapter.id)}
                                                            okText="Yes"
                                                            cancelText="No"
                                                        >
                                                            <Button
                                                                size="small"
                                                                danger
                                                                icon={<DeleteOutlined />}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </Popconfirm>
                                                    </Space>
                                                </div>

                                                <div className={styles.lessonsList}>
                                                    <Droppable droppableId={`lessons-${chapter.id}`} type="lesson">
                                                        {(provided: any) => (
                                                            <div {...provided.droppableProps} ref={provided.innerRef}>
                                                                {chapter.lessons.map((lesson, lessonIndex) => (
                                                                    <Draggable
                                                                        key={lesson.id}
                                                                        draggableId={lesson.id}
                                                                        index={lessonIndex}
                                                                    >
                                                                    {(provided: any) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                className={styles.lessonItem}
                                                                            >
                                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                                                                        <div
                                                                                            {...provided.dragHandleProps}
                                                                                            className={styles.dragHandle}
                                                                                        >
                                                                                            <DragOutlined />
                                                                                        </div>
                                                                                        <div style={{ marginLeft: '8px', flex: 1 }}>
                                                                                            <Text strong>{lesson.title}</Text>
                                                                                            <br />
                                                                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                                                                {lesson.description}
                                                                                            </Text>
                                                                                        </div>
                                                                                    </div>
                                                                                    <Space>
                                                                                        <Button
                                                                                            size="small"
                                                                                            type="text"
                                                                                            icon={<EditOutlined />}
                                                                                            onClick={() => handleEditLesson(lesson, chapter.id)}
                                                                                        />
                                                                                        <Popconfirm
                                                                                            title="Delete this lesson?"
                                                                                            onConfirm={() => handleDeleteLesson(lesson.id, chapter.id)}
                                                                                            okText="Yes"
                                                                                            cancelText="No"
                                                                                        >
                                                                                            <Button
                                                                                                size="small"
                                                                                                type="text"
                                                                                                danger
                                                                                                icon={<DeleteOutlined />}
                                                                                            />
                                                                                        </Popconfirm>
                                                                                    </Space>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                ))}
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>

                                                    <Button
                                                        className={styles.addLessonButton}
                                                        icon={<PlusOutlined />}
                                                        onClick={() => handleAddLesson(chapter.id)}
                                                        disabled={chapter.lessons.length >= 20}
                                                    >
                                                        Add Lesson {chapter.lessons.length >= 20 && '(Max 20 reached)'}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                <div className={styles.actionButtons}>
                    <Button onClick={onBack} icon={<LeftOutlined />}>
                        Back to Configuration
                    </Button>
                    <Button 
                        type="primary" 
                        size="large"
                        onClick={onNext}
                        icon={<PlaySquareOutlined />}
                    >
                        Generate Course
                    </Button>
                </div>
            </Card>

            {/* Chapter Edit Modal */}
            <Modal
                title="Edit Chapter"
                open={!!editingChapter}
                onCancel={() => setEditingChapter(null)}
                footer={null}
            >
                <Form
                    form={chapterForm}
                    layout="vertical"
                    onFinish={handleSaveChapter}
                >
                    <Form.Item
                        name="title"
                        label="Chapter Title"
                        rules={[{ required: true, message: 'Please enter chapter title' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="description"
                        label="Chapter Description"
                        rules={[{ required: true, message: 'Please enter chapter description' }]}
                    >
                        <TextArea rows={3} />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setEditingChapter(null)}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit">
                                Save Changes
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Lesson Add/Edit Modal */}
            <Modal
                title={editingLesson ? "Edit Lesson" : "Add Lesson"}
                open={!!addingLesson || !!editingLesson}
                onCancel={() => {
                    setAddingLesson(null);
                    setEditingLesson(null);
                    lessonForm.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={lessonForm}
                    layout="vertical"
                    onFinish={editingLesson ? handleSaveLesson : handleSaveNewLesson}
                >
                    <Form.Item
                        name="title"
                        label="Lesson Title"
                        rules={[{ required: true, message: 'Please enter lesson title' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="description"
                        label="Lesson Description"
                        rules={[{ required: true, message: 'Please enter lesson description' }]}
                    >
                        <TextArea rows={2} />
                    </Form.Item>
                    <Form.Item
                        name="content"
                        label="Lesson Content"
                        help="Detailed content that will be used to generate the video lesson"
                    >
                        <TextArea rows={4} placeholder="Enter the main content for this lesson..." />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => {
                                setAddingLesson(null);
                                setEditingLesson(null);
                                lessonForm.resetFields();
                            }}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit">
                                {editingLesson ? 'Save Changes' : 'Add Lesson'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default CourseStructureDisplay;
