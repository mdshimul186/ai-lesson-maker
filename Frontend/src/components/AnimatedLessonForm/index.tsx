import React, { useState, useEffect, useRef } from 'react';
import {
    Button,
    Form,
    Input,
    Select,
    message,
    Typography,
    Card,
    Switch,
    Row,
    Col,
    Progress,
    Timeline,
    Radio
} from 'antd';
import {
    PlaySquareOutlined,
    AudioOutlined,
    TranslationOutlined,
    ToolOutlined,
    FileTextOutlined
} from '@ant-design/icons';
import { getVoiceList, getTaskStatus, generateAnimatedLesson } from '../../services/index';
import { v4 as uuidv4 } from 'uuid';
import styles from './index.module.css';
import { useVideoStore, useAccountStore } from "../../stores/index";

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type RenderMode = 'markdown' | 'mermaid' | 'mixed';

type FieldType = {
    title: string;
    description?: string;
    prompt: string;
    language?: string;
    voice_name: string;
    voice_rate: number;
    include_subtitles: boolean;
    render_mode: RenderMode;
    theme: string;
};

type VoiceOption = {
    displayName: string;
    gender: string;
    language: string;
    name: string;
};

const getUniqueLanguageList = (list: VoiceOption[]) => {
    const uniqueLanguageList = list.reduce((acc: string[], item: VoiceOption) => {
        if (!acc.includes(item.language)) {
            acc.push(item.language);
        }
        return acc;
    }, []);
    return uniqueLanguageList;
};

const RenderModePreview: React.FC<{ mode: RenderMode }> = ({ mode }) => {
    if (mode === 'markdown') {
        return (
            <div className={styles.animationPreview}>
                <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                    <strong># Heading</strong><br/>
                    **Bold text** and *italic text*<br/>
                    - List item 1<br/>
                    - List item 2<br/>
                    <code>`code block`</code>
                </div>
            </div>
        );
    }
    
    if (mode === 'mermaid') {
        return (
            <div className={styles.animationPreview}>
                <svg width="200" height="100" viewBox="0 0 200 100">
                    <rect x="10" y="20" width="60" height="30" fill="#e1f5fe" stroke="#01579b" strokeWidth="2" rx="5"/>
                    <text x="40" y="38" textAnchor="middle" fontSize="12" fill="#01579b">Start</text>
                    <path d="M80,35 L110,35" stroke="#01579b" strokeWidth="2" markerEnd="url(#arrowhead)"/>
                    <rect x="120" y="20" width="60" height="30" fill="#e8f5e8" stroke="#2e7d32" strokeWidth="2" rx="5"/>
                    <text x="150" y="38" textAnchor="middle" fontSize="12" fill="#2e7d32">End</text>
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#01579b"/>
                        </marker>
                    </defs>
                </svg>
                <p style={{ fontSize: '12px', margin: '5px 0 0 0' }}>Mermaid diagrams</p>
            </div>
        );
    }
    
    if (mode === 'mixed') {
        return (
            <div className={styles.animationPreview}>
                <div style={{ fontSize: '12px' }}>
                    <strong>Combined rendering:</strong><br/>
                    📝 Markdown formatting<br/>
                    📊 Mermaid diagrams<br/>
                    🎨 Interactive animations
                </div>
            </div>
        );
    }
    
    return (
        <div className={styles.animationPreview}>
            <p>Preview not available for this render mode</p>
        </div>
    );
};

const AnimatedLessonForm: React.FC = () => {
    const { setVideoUrl, setLoading, setError, videoUrl, setTaskStatus, taskStatus } = useVideoStore();
    const { refreshAccountData } = useAccountStore();
    const [form] = Form.useForm();
    const [allVoiceList, setAllVoiceList] = useState<VoiceOption[]>([]);
    const [nowVoiceList, setNowVoiceList] = useState<VoiceOption[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const pollingIntervalIdRef = useRef<number | null>(null);
    const [selectedRenderMode, setSelectedRenderMode] = useState<RenderMode>('mixed');

    useEffect(() => {
        getVoiceList({ area: [] }).then(res => {
            if (res?.voices?.length > 0) {
                setAllVoiceList(res?.voices as VoiceOption[]);
                // Set initial language to English or first available
                const languageList = getUniqueLanguageList(res?.voices as VoiceOption[]);
                const initialLanguage = languageList.includes('English') ? 'English' : languageList[0];
                
                if (initialLanguage) {
                    const filteredVoices = (res?.voices as VoiceOption[]).filter(v => v.language === initialLanguage);
                    setNowVoiceList(filteredVoices);
                    form.setFieldsValue({
                        language: initialLanguage,
                        voice_name: filteredVoices[0]?.name,
                    });
                }
            }
        }).catch(err => {
            console.log(err);
            message.error("Failed to load voice list.");
        });

        return () => {
            if (pollingIntervalIdRef.current) {
                clearInterval(pollingIntervalIdRef.current);
            }
        };
    }, [form]);

    useEffect(() => {
        if (!videoUrl && !isGenerating) {
            setCurrentTaskId(null);
            setTaskStatus(null);
        }
    }, [videoUrl, isGenerating, setTaskStatus]);

    const stopPolling = () => {
        if (pollingIntervalIdRef.current) {
            clearInterval(pollingIntervalIdRef.current);
            pollingIntervalIdRef.current = null;
        }
    };

    const resetGenerationState = () => {
        setIsGenerating(false);
        setLoading(false);
        stopPolling();
        setCurrentTaskId(null);
    };

    const fetchTaskStatus = async (taskId: string) => {
        try {
            const status = await getTaskStatus(taskId);
            
            // Check if this is a status change from the previous state
            const previousStatus = useVideoStore.getState().taskStatus?.status;
            const statusChanged = previousStatus && previousStatus !== status.status;

            // Update local component state
            setTaskStatus(status);
            // Update the global store task status for VideoResult component
            useVideoStore.getState().setTaskStatus(status);

            // Keep loading state while task is in progress
            setLoading(true);

            // If status just changed, show appropriate notification
            if (statusChanged) {
                message.info(`Task status changed to: ${status.status}`, 3);
            }

            if (status.status === 'COMPLETED' || status.status === 'FAILED') {
                resetGenerationState();
                message.destroy();
                if (status.status === 'COMPLETED') {
                    message.success('Animated lesson generated successfully!');
                    // Set content result for rendering
                    if (status.result_url) {
                        setVideoUrl(status.result_url);
                    } else if (status.task_folder_content) {
                        // Find any video URL in the task folder content
                        const videoKeys = Object.keys(status.task_folder_content).filter(key =>
                            key.endsWith('.mp4') || key.endsWith('video.mp4'));
                        if (videoKeys.length > 0) {
                            setVideoUrl(status.task_folder_content[videoKeys[0]]);
                        }
                    }
                } else {
                    const errorMsg = status.error_message || 'Animated lesson generation failed';
                    setError(errorMsg + (status.error_details ? ` Details: ${typeof status.error_details === 'string' ? status.error_details : JSON.stringify(status.error_details)}` : ''));
                    message.error(`Generation failed: ${errorMsg}`, 10);
                }
            }
        } catch (error: any) {
            console.error('Failed to fetch task status:', error);
            if (error?.response?.status === 404) {
                resetGenerationState();
                setError('Failed to fetch task status: Task ID not found.');
                message.error('Task not found. It may have been removed.', 5);
                stopPolling();
            }
        }
    };

    const startPolling = (taskId: string) => {
        setCurrentTaskId(taskId);
        setError(null);
        // Clear any global store errors 
        useVideoStore.getState().setError(null);
        fetchTaskStatus(taskId);
        pollingIntervalIdRef.current = window.setInterval(() => fetchTaskStatus(taskId), 2000); // Poll every 2 seconds
    };

    const onFinish = async (values: FieldType) => {
        setIsGenerating(true);
        setLoading(true);
        setError(null);
        setVideoUrl('');
        setTaskStatus(null);
        setCurrentTaskId(null);
        message.loading('Initiating animated lesson generation...', 0);

        const taskId = uuidv4();
        // Prepare request payload
        const payload = {
            task_id: taskId,
            title: values.title,
            description: values.description,
            prompt: values.prompt,
            language: values.language,
            render_mode: values.render_mode,
            voice_name: values.voice_name,
            voice_rate: values.voice_rate,
            include_subtitles: values.include_subtitles,
            theme: values.theme,
        };

        try {
            const response = await generateAnimatedLesson(payload);
            message.destroy();

            if (!response?.success || !response?.data?.task_id) {
                resetGenerationState();
                const errorMsg = response?.message || 'Failed to initiate animated lesson generation (Invalid response from server)';
                setError(errorMsg);
                message.error(`Error: ${errorMsg}`, 10);
                return;
            }

            console.log('Animated lesson generation initiated:', response);

            // Refresh account data to update credits
            refreshAccountData();

            // Start polling with the received task_id
            startPolling(response.data.task_id);

            // Display message that the process is running in the background
            message.info('Animated lesson generation has started in the background. You can track its progress below.', 5);

        } catch (err: any) {
            resetGenerationState();
            const errorMsg = err?.message || err?.data?.message || 'Generate Animated Lesson Failed (Network/Request Error)';
            setError(errorMsg);
            message.error(`Generation Failed: ${errorMsg}`, 10);
            console.log('generateAnimatedLesson error:', err);
        }
    };

    const onFinishFailed = (errorInfo: any) => {
        console.log('Form validation failed:', errorInfo);
        message.error('Please fill all required fields correctly.');
    };    const handleRenderModeChange = (e: any) => {
        setSelectedRenderMode(e.target.value);
        form.setFieldsValue({ render_mode: e.target.value });
    };    const initialFormValues: Partial<FieldType> = {
        title: '',
        prompt: '',
        voice_rate: 1.0,
        include_subtitles: true,
        render_mode: 'mixed',
        theme: 'light',
    };

    return (
        <div className={styles.formDiv}>
            <Card
                bordered={false}
                className={styles.formCard}
                style={{
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
            >
                {currentTaskId && (
                    <Card
                        title="Generation Progress"
                        style={{ marginBottom: 24, borderColor: taskStatus?.status === 'FAILED' ? 'red' : '#1890ff' }}
                        extra={isGenerating || (taskStatus && taskStatus.status !== 'COMPLETED' && taskStatus.status !== 'FAILED') ? <span>Processing...</span> : null}
                    >
                        {taskStatus ? (
                            <div>
                                <p><strong>Task ID:</strong> {currentTaskId}</p>
                                <p><strong>Status:</strong> <span style={{ fontWeight: 'bold', color: taskStatus.status === 'FAILED' ? 'red' : taskStatus.status === 'COMPLETED' ? 'green' : 'inherit' }}>{taskStatus.status}</span></p>
                                <Progress
                                    percent={taskStatus.progress || 0}
                                    status={taskStatus.status === 'FAILED' ? 'exception' : taskStatus.status === 'COMPLETED' ? 'success' : 'active'}
                                    strokeColor={taskStatus.status === 'FAILED' ? 'red' : undefined}
                                />
                                <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>Events:</Title>
                                {taskStatus.events && taskStatus.events.length > 0 ? (
                                    <Timeline style={{ marginTop: 10, maxHeight: '200px', overflowY: 'auto', paddingLeft: '5px' }}>
                                        {taskStatus.events.slice().reverse().map((event, index) => (
                                            <Timeline.Item
                                                key={`${event.timestamp}-${index}`}
                                                color={taskStatus.status === 'FAILED' && taskStatus.events.length - 1 - index === 0 && taskStatus.progress < 100 ? 'red' : 'blue'}
                                            >
                                                <p style={{ margin: 0 }}><strong>{new Date(event.timestamp).toLocaleString()}</strong>: {event.message}</p>
                                                {event.details && <pre style={{ fontSize: '0.8em', whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f7f7f7', padding: '5px', borderRadius: '4px', marginTop: '4px' }}>{typeof event.details === 'object' ? JSON.stringify(event.details, null, 2) : event.details}</pre>}
                                            </Timeline.Item>
                                        ))}
                                    </Timeline>
                                ) : (
                                    <p>No events logged yet. Waiting for processing to start...</p>
                                )}
                                {taskStatus.status === 'FAILED' && taskStatus.error_message && (
                                    <div style={{ marginTop: 10, color: 'red', background: '#fff0f0', border: '1px solid red', padding: '10px', borderRadius: '4px' }}>
                                        <p><strong>Error:</strong> {taskStatus.error_message}</p>
                                        {taskStatus.error_details && <pre style={{ fontSize: '0.8em', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{typeof taskStatus.error_details === 'object' ? JSON.stringify(taskStatus.error_details, null, 2) : taskStatus.error_details}</pre>}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p>Waiting for task to start and report status...</p>
                        )}
                    </Card>
                )}

                <Form
                    form={form}
                    name="animatedLessonForm"
                    labelCol={{ span: 24 }}
                    wrapperCol={{ span: 24 }}
                    style={{ maxWidth: 900, width: '100%', margin: '0 auto' }}
                    initialValues={initialFormValues}
                    onFinish={onFinish}
                    onFinishFailed={onFinishFailed}
                    layout="vertical"
                    size="large"
                    autoComplete="off"
                >
                    <Card
                        title={<span><FileTextOutlined /> Lesson Content</span>}
                        className={styles.sectionCard}
                    >
                        <Form.Item<FieldType>
                            label="Lesson Title"
                            name="title"
                            rules={[{ required: true, message: 'Please enter a lesson title' }]}
                        >
                            <Input placeholder="Enter a title for your animated lesson" />
                        </Form.Item>

                        <Form.Item<FieldType>
                            label="Description (Optional)"
                            name="description"
                        >
                            <Input placeholder="Brief description of the lesson content" />
                        </Form.Item>

                        <Form.Item<FieldType>
                            label="Content Prompt"
                            name="prompt"
                            rules={[{ required: true, message: 'Please enter the content prompt' }]}
                            help="Describe what you want your animated lesson to teach. Be specific and detailed."
                        >
                            <TextArea 
                                rows={4} 
                                placeholder="E.g., Create a lesson about photosynthesis that explains how plants convert sunlight into energy. Include definitions, the chemical process, and why it's important." 
                            />
                        </Form.Item>
                    </Card>                    <Card
                        title={<span><ToolOutlined /> Rendering Options</span>}
                        className={styles.sectionCard}
                    >
                        <Form.Item<FieldType>
                            label="Content Rendering Mode"
                            name="render_mode"
                            rules={[{ required: true, message: 'Please select a rendering mode' }]}
                            help="AI will automatically choose appropriate animations for each content type"
                        >
                            <Radio.Group 
                                onChange={handleRenderModeChange} 
                                value={selectedRenderMode}
                            >
                                <Radio.Button value="markdown">📝 Markdown</Radio.Button>
                                <Radio.Button value="mermaid">📊 Mermaid</Radio.Button>
                                <Radio.Button value="mixed">🎨 Mixed</Radio.Button>
                            </Radio.Group>
                        </Form.Item>

                        <RenderModePreview mode={selectedRenderMode} />

                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item<FieldType>
                                    label="Visual Theme"
                                    name="theme"
                                >
                                    <Select defaultValue="light">
                                        <Option value="light">Light</Option>
                                        <Option value="dark">Dark</Option>
                                        <Option value="colorful">Colorful</Option>
                                        <Option value="minimal">Minimal</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item<FieldType>
                                    label="Include Subtitles"
                                    name="include_subtitles"
                                    valuePropName="checked"
                                >
                                    <Switch
                                        checkedChildren="On"
                                        unCheckedChildren="Off"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    <Card
                        title={<span><TranslationOutlined /> Language & Voice</span>}
                        className={styles.sectionCard}
                    >
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item<FieldType>
                                    label={
                                        <span>
                                            <TranslationOutlined style={{ marginRight: 4 }} /> Language
                                        </span>
                                    }
                                    name="language"
                                    rules={[{ required: true, message: 'Please select a language' }]}
                                >
                                    <Select
                                        showSearch
                                        placeholder="Select language"
                                        onChange={(value) => {
                                            const filteredVoiceList = allVoiceList.filter((voice) => {
                                                return voice.language === value;
                                            });
                                            setNowVoiceList(filteredVoiceList);
                                            form.setFieldsValue({
                                                voice_name: filteredVoiceList?.[0]?.name,
                                            });
                                        }}
                                        optionLabelProp="label"
                                        style={{ width: '100%' }}
                                        dropdownStyle={{ maxHeight: 300, overflowY: 'auto' }}
                                    >
                                        {
                                            getUniqueLanguageList(allVoiceList).map((language) => (
                                                <Option key={language} value={language} label={language}>
                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                        <TranslationOutlined style={{ marginRight: 8 }} />
                                                        <span>{language}</span>
                                                    </div>
                                                </Option>
                                            ))
                                        }
                                    </Select>
                                </Form.Item>
                            </Col>

                            <Col xs={24} sm={12}>
                                <Form.Item<FieldType>
                                    label={
                                        <span>
                                            <AudioOutlined style={{ marginRight: 4 }} /> Voice
                                        </span>
                                    }
                                    name="voice_name"
                                    rules={[{ required: true, message: 'Please select a voice' }]}
                                >
                                    <Select
                                        showSearch
                                        placeholder="Select voice"
                                        disabled={nowVoiceList.length === 0}
                                        optionFilterProp="children"
                                        optionLabelProp="label"
                                        style={{ width: '100%' }}
                                        dropdownStyle={{ maxHeight: 300, overflowY: 'auto' }}
                                        filterOption={(input, option) => {
                                            const labelString = typeof option?.label === 'string' ? option.label : String(option?.label || '');
                                            const valueString = typeof option?.value === 'string' ? option.value : String(option?.value || '');
                                            const inputLower = input.toLowerCase();
                                            return labelString.toLowerCase().includes(inputLower) || valueString.toLowerCase().includes(inputLower);
                                        }}
                                    >
                                        {
                                            nowVoiceList.map((voice) => (
                                                <Option
                                                    key={voice.name}
                                                    value={voice.name}
                                                    label={`${voice.displayName} (${voice.gender})`}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span>{voice.displayName}</span>
                                                        <span style={{
                                                            color: voice.gender === 'Male' ? '#1677ff' : '#ff4d94',
                                                            backgroundColor: voice.gender === 'Male' ? 'rgba(22, 119, 255, 0.1)' : 'rgba(255, 77, 148, 0.1)',
                                                            padding: '2px 8px',
                                                            borderRadius: '10px',
                                                            fontSize: '12px'
                                                        }}>
                                                            {voice.gender}
                                                        </span>
                                                    </div>
                                                </Option>
                                            ))
                                        }
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item<FieldType>
                                    label="Voice Rate (Speed)"
                                    name="voice_rate"
                                    rules={[{ required: true, message: 'Please set voice rate' }]}
                                >
                                    <Select>
                                        <Option value={0.8}>Slow (0.8x)</Option>
                                        <Option value={1.0}>Normal (1.0x)</Option>
                                        <Option value={1.2}>Fast (1.2x)</Option>
                                        <Option value={1.5}>Very Fast (1.5x)</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    <Form.Item wrapperCol={{ span: 24 }} style={{ textAlign: 'center', marginTop: 32 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={isGenerating}
                            disabled={isGenerating}
                            icon={<PlaySquareOutlined />}
                            size="large"
                            style={{ minWidth: '200px', height: '50px' }}
                        >
                            {isGenerating ? 'Generating...' : 'Generate Animated Lesson'}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default AnimatedLessonForm;
