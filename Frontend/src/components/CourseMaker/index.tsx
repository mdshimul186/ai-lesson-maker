import React, { useState, useEffect } from 'react';
import { 
    Plus,
    Eye,
    Trash2,
    Play,
    BookOpen,
    Clock,
    Users,
    Globe,
    Calendar,
    MoreVertical,
    Filter
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
    getCourseList,
    CourseResponse,
    deleteCourse,
    generateCourseLessons
} from '../../services/index';
import styles from './index.module.css';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '../ui/table';
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
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { 
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '../ui/pagination';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';

const CourseMaker: React.FC = () => {
    const router = useRouter();
    const [courses, setCourses] = useState<CourseResponse[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    // Load courses when component mounts or pagination changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            fetchCourses();
        }
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
            toast.error('Failed to load courses');
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
        try {
            await deleteCourse(courseId);
            toast.success('Course deleted successfully');
            fetchCourses(); // Refresh the list
        } catch (error) {
            console.error('Failed to delete course:', error);
            toast.error('Failed to delete course');
        }
    };

    const handleGenerateCourseLessons = async (courseId: string) => {
        try {
            toast.info('Starting course lesson generation...');
            await generateCourseLessons(courseId);
            toast.success('Course lesson generation started. Check the Tasks page for progress.');
            fetchCourses(); // Refresh to show updated status
        } catch (error) {
            console.error('Failed to start course generation:', error);
            toast.error('Failed to start course generation');
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'completed':
                return 'default';
            case 'generating':
                return 'secondary';
            case 'failed':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>;
            case 'generating':
                return <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>;
            case 'failed':
                return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
            default:
                return <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>;
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto ">
         

            {/* Main Course Management Card */}
            <Card className="shadow-2xl border-0 bg-gradient-to-br from-background/95 to-muted/80 dark:from-background/95 dark:to-card/80 backdrop-blur-sm">
                <CardHeader className="pb-1">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <BookOpen className="h-6 w-6 text-white" />
                            </div>
                            My Courses
                        </CardTitle>
                        <Button 
                            onClick={handleCreateNewCourse}
                            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transition-all duration-300 px-6 py-3 rounded-xl"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            Create New Course
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {coursesLoading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center space-x-4 p-4">
                                    <Skeleton className="h-12 w-12 rounded-xl" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-[250px]" />
                                        <Skeleton className="h-4 w-[200px]" />
                                    </div>
                                    <Skeleton className="h-8 w-20" />
                                    <Skeleton className="h-8 w-32" />
                                </div>
                            ))}
                        </div>
                    ) : courses.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="flex flex-col items-center gap-4">
                                <div className="p-6 bg-gradient-to-br from-muted to-muted/80 dark:from-card/50 dark:to-card rounded-3xl">
                                    <BookOpen className="h-16 w-16 text-muted-foreground" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-foreground mb-2">No Courses Yet</h3>
                                    <p className="text-muted-foreground mb-6">Create your first AI-powered course to get started.</p>
                                    <Button 
                                        onClick={handleCreateNewCourse}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create New Course
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Enhanced Course Table */}
                            <div className="rounded-2xl border border-border overflow-hidden bg-background/80 dark:bg-card/80 backdrop-blur-sm">
                                {/* Desktop Table */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-gradient-to-r from-muted to-muted/80 dark:from-card dark:to-card/80">
                                            <TableRow className="border-border">
                                                <TableHead className="font-semibold text-foreground min-w-[300px]">Course</TableHead>
                                                <TableHead className="font-semibold text-foreground min-w-[120px]">Status</TableHead>
                                                <TableHead className="font-semibold text-foreground min-w-[100px]">Lessons</TableHead>
                                                <TableHead className="font-semibold text-foreground min-w-[100px]">Language</TableHead>
                                                <TableHead className="font-semibold text-foreground min-w-[120px]">Created</TableHead>
                                                <TableHead className="font-semibold text-foreground text-right min-w-[100px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {courses.map((course) => (
                                                <TableRow key={course.id} className="border-border hover:bg-muted/50 dark:hover:bg-card/50 transition-colors">
                                                    <TableCell className="min-w-[300px]">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                                                                <BookOpen className="h-4 w-4 text-white" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div 
                                                                    className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors truncate"
                                                                    onClick={() => handleViewCourseDetails(course)}
                                                                    title={course.title}
                                                                >
                                                                    {course.title}
                                                                </div>
                                                                {course.description && (
                                                                    <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                                        {course.description.length > 100 
                                                                            ? `${course.description.substring(0, 100)}...` 
                                                                            : course.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="min-w-[120px]">
                                                        <Badge 
                                                            variant={getStatusBadgeVariant(course.status)}
                                                            className="flex items-center gap-1 w-fit shrink-0"
                                                        >
                                                            {getStatusIcon(course.status)}
                                                            <span className="hidden sm:inline">{course.status.toUpperCase()}</span>
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="min-w-[100px]">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                                            <span className="font-medium whitespace-nowrap">{course.total_lessons} lessons</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="min-w-[100px]">
                                                        <div className="flex items-center gap-2">
                                                            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                                                            <span className="whitespace-nowrap">{course.language}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="min-w-[120px]">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                                            <span className="whitespace-nowrap">{new Date(course.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right min-w-[100px]">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                                <DropdownMenuItem 
                                                                    onClick={() => handleViewCourseDetails(course)}
                                                                    className="flex items-center gap-2"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                    View Details
                                                                </DropdownMenuItem>
                                                                {course.status === 'draft' && (
                                                                    <DropdownMenuItem 
                                                                        onClick={() => handleGenerateCourseLessons(course.id)}
                                                                        className="flex items-center gap-2"
                                                                    >
                                                                        <Play className="h-4 w-4" />
                                                                        Generate Lessons
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem 
                                                                            onSelect={(e) => e.preventDefault()}
                                                                            className="flex items-center gap-2 text-red-600 focus:text-red-600"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                            Delete Course
                                                                        </DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Delete Course</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Are you sure you want to delete this course? This action cannot be undone.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction 
                                                                                onClick={() => handleDeleteCourse(course.id)}
                                                                                className="bg-red-600 hover:bg-red-700"
                                                                            >
                                                                                Delete
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile Card Layout */}
                                <div className="lg:hidden space-y-4 p-4">
                                    {courses.map((course) => (
                                        <Card key={course.id} className="border border-border hover:shadow-md transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="space-y-3">
                                                    {/* Course Title and Description */}
                                                    <div 
                                                        className="cursor-pointer"
                                                        onClick={() => handleViewCourseDetails(course)}
                                                    >
                                                        <div className="flex items-start gap-3 mb-2">
                                                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md shrink-0">
                                                                <BookOpen className="h-4 w-4 text-white" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-semibold text-foreground hover:text-primary transition-colors">
                                                                    {course.title}
                                                                </div>
                                                                {course.description && (
                                                                    <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                                        {course.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Course Details */}
                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                                            <span>{course.total_lessons} lessons</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                                                            <span>{course.language}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                                            <span>{new Date(course.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 justify-end">
                                                            <Badge 
                                                                variant={getStatusBadgeVariant(course.status)}
                                                                className="flex items-center gap-1 w-fit"
                                                            >
                                                                {getStatusIcon(course.status)}
                                                                <span className="text-xs">{course.status.toUpperCase()}</span>
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex justify-end pt-2 border-t border-border">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                                <DropdownMenuItem 
                                                                    onClick={() => handleViewCourseDetails(course)}
                                                                    className="flex items-center gap-2"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                    View Details
                                                                </DropdownMenuItem>
                                                                {course.status === 'draft' && (
                                                                    <DropdownMenuItem 
                                                                        onClick={() => handleGenerateCourseLessons(course.id)}
                                                                        className="flex items-center gap-2"
                                                                    >
                                                                        <Play className="h-4 w-4" />
                                                                        Generate Lessons
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem 
                                                                            onSelect={(e) => e.preventDefault()}
                                                                            className="flex items-center gap-2 text-red-600 focus:text-red-600"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                            Delete Course
                                                                        </DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Delete Course</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Are you sure you want to delete this course? This action cannot be undone.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction 
                                                                                onClick={() => handleDeleteCourse(course.id)}
                                                                                className="bg-red-600 hover:bg-red-700"
                                                                            >
                                                                                Delete
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            {/* Enhanced Pagination */}
                            {pagination.total > pagination.pageSize && (
                                <div className="flex items-center justify-between mt-6">
                                    <div className="text-sm text-muted-foreground">
                                        Showing {((pagination.current - 1) * pagination.pageSize) + 1} to{' '}
                                        {Math.min(pagination.current * pagination.pageSize, pagination.total)} of{' '}
                                        {pagination.total} courses
                                    </div>
                                    <Pagination>
                                        <PaginationContent>
                                            {pagination.current > 1 && (
                                                <PaginationItem>
                                                    <PaginationPrevious 
                                                        onClick={() => setPagination(prev => ({
                                                            ...prev,
                                                            current: prev.current - 1
                                                        }))}
                                                        className="cursor-pointer"
                                                    />
                                                </PaginationItem>
                                            )}
                                            
                                            {[...Array(Math.ceil(pagination.total / pagination.pageSize))].map((_, i) => {
                                                const page = i + 1;
                                                if (
                                                    page === 1 ||
                                                    page === Math.ceil(pagination.total / pagination.pageSize) ||
                                                    (page >= pagination.current - 1 && page <= pagination.current + 1)
                                                ) {
                                                    return (
                                                        <PaginationItem key={page}>
                                                            <PaginationLink
                                                                onClick={() => setPagination(prev => ({
                                                                    ...prev,
                                                                    current: page
                                                                }))}
                                                                isActive={page === pagination.current}
                                                                className="cursor-pointer"
                                                            >
                                                                {page}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    );
                                                }
                                                return null;
                                            })}
                                            
                                            {pagination.current < Math.ceil(pagination.total / pagination.pageSize) && (
                                                <PaginationItem>
                                                    <PaginationNext 
                                                        onClick={() => setPagination(prev => ({
                                                            ...prev,
                                                            current: prev.current + 1
                                                        }))}
                                                        className="cursor-pointer"
                                                    />
                                                </PaginationItem>
                                            )}
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default CourseMaker;
