import React, { useState, useEffect } from 'react';
import { 
    Card, 
    Form, 
    Input, 
    Select, 
    Button, 
    Typography, 
    Space, 
    Row, 
    Col,
    Steps,
    Divider,
    message
} from 'antd';
import { 
    BookOutlined, 
    TranslationOutlined, 
    AudioOutlined,    PlaySquareOutlined,
    SettingOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { 
    getVoiceList, 
    generateCourseStructure, 
    CourseGenerateRequest
} from '../../services/index';
import CourseStructureDisplay from '../CourseMaker/CourseStructureDisplay';
import CourseGeneration from '../CourseMaker/CourseGeneration';
import styles from '../CourseMaker/index.module.css';

const { Title, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface VoiceOption {
    displayName: string;
    gender: string;
    language: string;
    name: string;
}

export interface CourseStructure {
    title: string;
    description: string;
    chapters: Chapter[];
}

export interface Chapter {
    id: string;
    title: string;
    description: string;
    lessons: Lesson[];
    order: number;
}

export interface Lesson {
    id: string;
    title: string;
    description: string;
    content: string;
    order: number;
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

const CreateCourse: React.FC = () => {
    const [form] = Form.useForm();
    // const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [allVoiceList, setAllVoiceList] = useState<VoiceOption[]>([]);
    const [filteredVoiceList, setFilteredVoiceList] = useState<VoiceOption[]>([]);
    const [courseStructure, setCourseStructure] = useState<CourseStructure | null>(null);
    const [formData, setFormData] = useState<CourseFormData | null>(null);

    // Load voices when component mounts
    useEffect(() => {
        fetchVoices();
    }, []);

    const fetchVoices = async () => {
        try {
            const response = await getVoiceList({ area: [] });
            if (response?.voices?.length > 0) {
                setAllVoiceList(response.voices as VoiceOption[]);
                // Set initial language and voice
                const initialLanguage = getUniqueLanguageList(response.voices as VoiceOption[])[0];
                if (initialLanguage) {
                    const filtered = (response.voices as VoiceOption[]).filter(v => v.language === initialLanguage);
                    setFilteredVoiceList(filtered);
                    form.setFieldsValue({
                        language: initialLanguage,
                        voice: filtered[0]?.name || ''
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch voices:', error);
            message.error('Failed to load voice options');
        }
    };

    const getUniqueLanguageList = (voices: VoiceOption[]) => {
        const languageSet = new Set(voices.map(v => v.language));
        return Array.from(languageSet);
    };

    const handleLanguageChange = (language: string) => {
        const filtered = allVoiceList.filter(v => v.language === language);
        setFilteredVoiceList(filtered);
        form.setFieldsValue({ voice: filtered[0]?.name || '' });
    };

    const handleFormSubmit = async (values: CourseFormData) => {
        setIsGenerating(true);
        setFormData(values);

        try {
            message.loading('Generating course structure...', 0);
            
            const request: CourseGenerateRequest = {
                prompt: values.prompt,
                language: values.language,
                voice_id: values.voice,
                max_chapters: values.chapters,
                max_lessons_per_chapter: values.lessonsPerChapter || 3,
                target_audience: values.targetAudience || '',
                difficulty_level: values.difficultyLevel || 'intermediate'
            };

            const response = await generateCourseStructure(request);
            
            if (response && response.chapters) {
                setCourseStructure(response);
                setCurrentStep(1);
                message.destroy();
                message.success('Course structure generated successfully!');
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Error generating course structure:', error);
            message.destroy();
            message.error('Failed to generate course structure. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleBackToForm = () => {
        setCurrentStep(0);
        setCourseStructure(null);
    };

    const handleNext = () => {
        setCurrentStep(2);
    };

    const handleBackToStructure = () => {
        setCurrentStep(1);
    };

    const steps = [
        {
            title: 'Configuration',
            description: 'Set up course parameters',
            icon: <SettingOutlined />
        },
        {
            title: 'Structure',
            description: 'Review course outline',
            icon: <BookOutlined />
        },
        {
            title: 'Generation',
            description: 'Generate lesson content',
            icon: <PlaySquareOutlined />
        }
    ];

    return (
        <div>
            <Title level={2}>Create New Course</Title>
            <Paragraph>
                Create an engaging educational course with AI-generated content. Configure your course parameters, 
                review the structure, and generate comprehensive lessons with videos.
            </Paragraph>

            <Steps current={currentStep} items={steps} style={{ marginBottom: '32px' }} />

            {currentStep === 0 && (
                <Card title="Course Configuration" className={styles.stepCard}>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleFormSubmit}
                        initialValues={{
                            language: 'en',
                            chapters: 5
                        }}
                    >
                        <Row gutter={24}>
                            <Col xs={24}>
                                <Form.Item
                                    name="prompt"
                                    label="Course Topic"
                                    rules={[
                                        { required: true, message: 'Please enter the course topic' },
                                        { min: 10, message: 'Please provide more details about your course topic' }
                                    ]}
                                >
                                    <TextArea
                                        rows={4}
                                        placeholder="Describe what you want to teach in this course. Be specific about the topics, target audience, and learning objectives..."
                                        showCount
                                        maxLength={1000}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="language"
                                    label={
                                        <Space>
                                            <TranslationOutlined />
                                            Language
                                        </Space>
                                    }
                                    rules={[{ required: true, message: 'Please select a language' }]}
                                >
                                    <Select 
                                        placeholder="Select language"
                                        onChange={handleLanguageChange}
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.children?.toString()?.toLowerCase() ?? '').indexOf(input.toLowerCase()) >= 0
                                        }
                                    >
                                        {getUniqueLanguageList(allVoiceList).map(language => (
                                            <Option key={language} value={language}>
                                                {language}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="voice"
                                    label={
                                        <Space>
                                            <AudioOutlined />
                                            Voice
                                        </Space>
                                    }
                                    rules={[{ required: true, message: 'Please select a voice' }]}
                                >
                                    <Select 
                                        placeholder="Select voice"
                                        showSearch
                                        filterOption={(input, option) =>
                                            !!option?.children && option.children.toString().toLowerCase().indexOf(input.toLowerCase()) >= 0
                                        }
                                    >
                                        {filteredVoiceList.map(voice => (
                                            <Option key={voice.name} value={voice.name}>
                                                {voice.displayName} ({voice.gender})
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="chapters"
                                    label="Number of Chapters"
                                    rules={[{ required: true, message: 'Please select number of chapters' }]}
                                >
                                    <Select placeholder="Select chapters">
                                        {[3, 4, 5, 6, 7, 8].map(num => (
                                            <Option key={num} value={num}>{num} chapters</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="lessonsPerChapter"
                                    label="Lessons per Chapter"
                                    initialValue={3}
                                >
                                    <Select placeholder="Select lessons per chapter">
                                        {[2, 3, 4, 5].map(num => (
                                            <Option key={num} value={num}>{num} lessons</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="difficultyLevel"
                                    label="Difficulty Level"
                                    initialValue="intermediate"
                                >
                                    <Select placeholder="Select difficulty">
                                        <Option value="beginner">Beginner</Option>
                                        <Option value="intermediate">Intermediate</Option>
                                        <Option value="advanced">Advanced</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        {/* <Row gutter={24}>
                            <Col xs={24}>
                                <Form.Item
                                    name="targetAudience"
                                    label="Target Audience (Optional)"
                                >
                                    <Input 
                                        placeholder="e.g., High school students, Working professionals, Beginners..."
                                        maxLength={200}
                                    />
                                </Form.Item>
                            </Col>
                        </Row> */}

                        <Divider />

                        <Space>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                size="large"
                                loading={isGenerating}
                                disabled={isGenerating}
                            >
                                <BookOutlined />
                                Generate Course Structure
                            </Button>
                            
                            <Button 
                                icon={<ReloadOutlined />}
                                onClick={() => form.resetFields()}
                                disabled={isGenerating}
                            >
                                Reset Form
                            </Button>
                        </Space>
                    </Form>
                </Card>
            )}

            {currentStep === 1 && courseStructure && formData && (
                <CourseStructureDisplay
                    courseStructure={courseStructure}
                    formData={formData}
                    onBack={handleBackToForm}
                    onNext={handleNext}
                    onStructureUpdate={() => setCurrentStep(0)}
                />
            )}

            {currentStep === 2 && courseStructure && formData && (
                <CourseGeneration
                    courseStructure={courseStructure}
                    formData={formData}
                    onBack={handleBackToStructure}
                />
            )}
        </div>
    );
};

export default CreateCourse;
