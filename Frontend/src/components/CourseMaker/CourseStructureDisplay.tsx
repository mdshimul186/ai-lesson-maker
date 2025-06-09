import React, { useState } from 'react';
import { 
    Edit,
    Trash2,
    Plus,
    GripVertical,
    Play,
    ArrowLeft,
    BookOpen,
    Users
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../ui/dialog';
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

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
    formData?: any;
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
    const [chapterForm, setChapterForm] = useState({ title: '', description: '' });
    const [lessonForm, setLessonForm] = useState({ title: '', description: '', content: '' });

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
        setChapterForm({
            title: chapter.title,
            description: chapter.description
        });
    };

    const handleSaveChapter = () => {
        if (!editingChapter || !chapterForm.title.trim() || !chapterForm.description.trim()) {
            toast.error('Please fill in all fields');
            return;
        }

        const updatedChapters = courseStructure.chapters.map(c =>
            c.id === editingChapter.id 
                ? { ...c, title: chapterForm.title, description: chapterForm.description }
                : c
        );

        onStructureUpdate({
            ...courseStructure,
            chapters: updatedChapters
        });

        setEditingChapter(null);
        setChapterForm({ title: '', description: '' });
        toast.success('Chapter updated successfully');
    };

    const handleDeleteChapter = (chapterId: string) => {
        const updatedChapters = courseStructure.chapters
            .filter((c: Chapter) => c.id !== chapterId)
            .map((c: Chapter, index: number) => ({ ...c, order: index + 1 }));

        onStructureUpdate({
            ...courseStructure,
            chapters: updatedChapters
        });

        toast.success('Chapter deleted successfully');
    };

    const handleAddLesson = (chapterId: string) => {
        setAddingLesson(chapterId);
        setLessonForm({ title: '', description: '', content: '' });
    };

    const handleSaveNewLesson = () => {
        if (!addingLesson || !lessonForm.title.trim() || !lessonForm.description.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        const chapter = courseStructure.chapters.find(c => c.id === addingLesson);
        if (!chapter) return;

        const newLesson: Lesson = {
            id: `lesson-${Date.now()}`,
            title: lessonForm.title,
            description: lessonForm.description,
            content: lessonForm.content || '',
            order: chapter.lessons.length + 1
        };

        // Check lesson count limit
        if (chapter.lessons.length >= 20) {
            toast.error('Maximum 20 lessons per chapter allowed');
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
        setLessonForm({ title: '', description: '', content: '' });
        toast.success('Lesson added successfully');
    };

    const handleEditLesson = (lesson: Lesson, chapterId: string) => {
        setEditingLesson({ lesson, chapterId });
        setLessonForm({
            title: lesson.title,
            description: lesson.description,
            content: lesson.content
        });
    };

    const handleSaveLesson = () => {
        if (!editingLesson || !lessonForm.title.trim() || !lessonForm.description.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        const { lesson, chapterId } = editingLesson;
        const updatedChapters = courseStructure.chapters.map(c =>
            c.id === chapterId 
                ? {
                    ...c,
                    lessons: c.lessons.map(l =>
                        l.id === lesson.id 
                            ? { ...l, title: lessonForm.title, description: lessonForm.description, content: lessonForm.content }
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
        setLessonForm({ title: '', description: '', content: '' });
        toast.success('Lesson updated successfully');
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

        toast.success('Lesson deleted successfully');
    };

    const totalLessons = courseStructure.chapters.reduce((total, chapter) => total + chapter.lessons.length, 0);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/50 dark:from-background dark:to-card/50">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        <BookOpen className="w-6 h-6 text-primary" />
                        Course Structure Review
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center space-y-3 p-6 bg-gradient-to-r from-muted to-muted/80 dark:from-card dark:to-card/80 rounded-lg border">
                        <h3 className="text-xl font-semibold text-foreground">
                            {courseStructure.title}
                        </h3>
                        <p className="text-muted-foreground">
                            {courseStructure.description}
                        </p>
                        <div className="flex items-center justify-center gap-6">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-primary bg-primary/10">
                                    {courseStructure.chapters.length} chapters
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-purple-700 bg-purple-100">
                                    {totalLessons} lessons total
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="chapters" type="chapter">
                            {(provided: any) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                                    {courseStructure.chapters.map((chapter, index) => (
                                        <Draggable
                                            key={chapter.id}
                                            draggableId={chapter.id}
                                            index={index}
                                        >
                                            {(provided: any, snapshot: any) => (
                                                <Card
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`border-2 transition-all duration-200 ${
                                                        snapshot.isDragging 
                                                            ? 'border-primary shadow-lg rotate-2' 
                                                            : 'border-border hover:border-primary/50 hover:shadow-md'
                                                    }`}
                                                >
                                                    <CardHeader className="pb-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <div
                                                                    {...provided.dragHandleProps}
                                                                    className="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-muted"
                                                                >
                                                                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className="text-lg font-semibold text-foreground">
                                                                        {chapter.title}
                                                                    </h4>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {chapter.description}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleEditChapter(chapter)}
                                                                >
                                                                    <Edit className="w-3 h-3 mr-1" />
                                                                    Edit
                                                                </Button>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                        >
                                                                            <Trash2 className="w-3 h-3 mr-1" />
                                                                            Delete
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Delete Chapter</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                This will also delete all lessons in this chapter. This action cannot be undone.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction
                                                                                onClick={() => handleDeleteChapter(chapter.id)}
                                                                                className="bg-red-600 hover:bg-red-700"
                                                                            >
                                                                                Delete
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="pt-0">
                                                        <Droppable droppableId={`lessons-${chapter.id}`} type="lesson">
                                                            {(provided: any) => (
                                                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                                                    {chapter.lessons.map((lesson, lessonIndex) => (
                                                                        <Draggable
                                                                            key={lesson.id}
                                                                            draggableId={lesson.id}
                                                                            index={lessonIndex}
                                                                        >
                                                                            {(provided: any, snapshot: any) => (
                                                                                <div
                                                                                    ref={provided.innerRef}
                                                                                    {...provided.draggableProps}
                                                                                    className={`p-3 border rounded-lg transition-all duration-200 ${
                                                                                        snapshot.isDragging 
                                                                                            ? 'border-primary shadow-md bg-primary/10' 
                                                                                            : 'border-border hover:border-border bg-muted/50 hover:bg-muted'
                                                                                    }`}
                                                                                >
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div className="flex items-center gap-3 flex-1">
                                                                                            <div
                                                                                                {...provided.dragHandleProps}
                                                                                                className="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-muted"
                                                                                            >
                                                                                                <GripVertical className="w-3 h-3 text-muted-foreground" />
                                                                                            </div>
                                                                                            <div className="flex-1">
                                                                                                <p className="font-medium text-foreground text-sm">
                                                                                                    {lesson.title}
                                                                                                </p>
                                                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                                                    {lesson.description}
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-1">
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                onClick={() => handleEditLesson(lesson, chapter.id)}
                                                                                                className="h-7 w-7 p-0"
                                                                                            >
                                                                                                <Edit className="w-3 h-3" />
                                                                                            </Button>
                                                                                            <AlertDialog>
                                                                                                <AlertDialogTrigger asChild>
                                                                                                    <Button
                                                                                                        variant="ghost"
                                                                                                        size="sm"
                                                                                                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                                                    >
                                                                                                        <Trash2 className="w-3 h-3" />
                                                                                                    </Button>
                                                                                                </AlertDialogTrigger>
                                                                                                <AlertDialogContent>
                                                                                                    <AlertDialogHeader>
                                                                                                        <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
                                                                                                        <AlertDialogDescription>
                                                                                                            Are you sure you want to delete this lesson? This action cannot be undone.
                                                                                                        </AlertDialogDescription>
                                                                                                    </AlertDialogHeader>
                                                                                                    <AlertDialogFooter>
                                                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                                        <AlertDialogAction
                                                                                                            onClick={() => handleDeleteLesson(lesson.id, chapter.id)}
                                                                                                            className="bg-red-600 hover:bg-red-700"
                                                                                                        >
                                                                                                            Delete
                                                                                                        </AlertDialogAction>
                                                                                                    </AlertDialogFooter>
                                                                                                </AlertDialogContent>
                                                                                            </AlertDialog>
                                                                                        </div>
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
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleAddLesson(chapter.id)}
                                                            disabled={chapter.lessons.length >= 20}
                                                            className="mt-3 w-full border-dashed"
                                                        >
                                                            <Plus className="w-3 h-3 mr-2" />
                                                            Add Lesson {chapter.lessons.length >= 20 && '(Max 20 reached)'}
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>

                    <div className="border-t pt-6">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="outline"
                                onClick={onBack}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Configuration
                            </Button>

                            <Button
                                onClick={onNext}
                                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg"
                                size="lg"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Generate Course
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Chapter Edit Dialog */}
            <Dialog open={!!editingChapter} onOpenChange={() => setEditingChapter(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Chapter</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">
                                Chapter Title *
                            </label>
                            <Input
                                value={chapterForm.title}
                                onChange={(e) => setChapterForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Enter chapter title"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">
                                Chapter Description *
                            </label>
                            <Textarea
                                value={chapterForm.description}
                                onChange={(e) => setChapterForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Enter chapter description"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingChapter(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveChapter}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lesson Add/Edit Dialog */}
            <Dialog 
                open={!!addingLesson || !!editingLesson} 
                onOpenChange={() => {
                    setAddingLesson(null);
                    setEditingLesson(null);
                    setLessonForm({ title: '', description: '', content: '' });
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingLesson ? "Edit Lesson" : "Add Lesson"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">
                                Lesson Title *
                            </label>
                            <Input
                                value={lessonForm.title}
                                onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Enter lesson title"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">
                                Lesson Description *
                            </label>
                            <Textarea
                                value={lessonForm.description}
                                onChange={(e) => setLessonForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Enter lesson description"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">
                                Lesson Content
                            </label>
                            <Textarea
                                value={lessonForm.content}
                                onChange={(e) => setLessonForm(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="Enter the main content for this lesson..."
                                rows={4}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Detailed content that will be used to generate the video lesson
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setAddingLesson(null);
                                setEditingLesson(null);
                                setLessonForm({ title: '', description: '', content: '' });
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={editingLesson ? handleSaveLesson : handleSaveNewLesson}>
                            {editingLesson ? 'Save Changes' : 'Add Lesson'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CourseStructureDisplay;
