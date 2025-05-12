import React, { useState, useEffect, useRef } from 'react';
import type { FormProps, RadioChangeEvent } from 'antd';
import {
    Button,
    Form,
    Input,
    Select,
    message,
    Typography,
    Card,
    Radio,
    Switch,
    Row,
    Col,
    InputNumber,
    Upload,
    Spin,
    Progress,
    Timeline
} from 'antd';
import {
    PlaySquareOutlined,
    AudioOutlined,
    TranslationOutlined,
    HighlightOutlined,
    SettingOutlined,
    PictureOutlined,
    FullscreenOutlined,
    MobileOutlined,
    BorderOutlined,
    UploadOutlined,
    VideoCameraAddOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getVoiceList, generateVideo, uploadFile, getTaskStatus, Task, VideoGenerateReq } from '../../services/index';
import { v4 as uuidv4 } from 'uuid';
import styles from './index.module.css';
import { useVideoStore } from "../../stores/index";

const { Title } = Typography;
const { Option } = Select;

type FieldType = {
    resolution?: string;
    segments: number;
    language?: string;
    story_prompt?: string;
    image_style?: string;
    voice_name: string;
    voice_rate: number;
    include_subtitles: boolean;
    visual_content_in_language: boolean;
    logo_url?: string;
    intro_video_url?: string;
    outro_video_url?: string;
};

type voiceList = {
    displayName: string;
    gender: string;
    language: string;
    name: string;
};

const getUniqueLanguageList = (list: voiceList[]) => {
    const uniqueLanguageList = list.reduce((acc: string[], item: voiceList) => {
        if (!acc.includes(item.language)) {
            acc.push(item.language);
        }
        return acc;
    }, []);
    return uniqueLanguageList;
};

const resolutionOptions = [
    {
        type: 'landscape',
        icon: <FullscreenOutlined />,
        label: 'Landscape',
        options: [
            { value: '1280*720', label: 'HD (1280×720)', quality: 'HD' },
            { value: '1920*1080', label: 'Full HD (1920×1080)', quality: 'FHD' },
        ]
    },
    {
        type: 'portrait',
        icon: <MobileOutlined />,
        label: 'Portrait',
        options: [
            { value: '720*1280', label: 'HD (720×1280)', quality: 'HD' },
            { value: '1080*1920', label: 'Full HD (1080×1920)', quality: 'FHD' },
        ]
    },
    {
        type: 'square',
        icon: <BorderOutlined />,
        label: 'Square',
        options: [
            { value: '720*720', label: 'HD (720×720)', quality: 'HD' },
            { value: '1080*1080', label: 'HD (1080×1080)', quality: 'HD' },
        ]
    }
];

const App: React.FC = () => {
    const { setVideoUrl, setLoading, setError, videoUrl, setTaskStatus, taskStatus } = useVideoStore();
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [allVoiceList, setAllVoiceList] = useState<voiceList[]>([]);
    const [nowVoiceList, setNowVoiceList] = useState<voiceList[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [resolutionType, setResolutionType] = useState('landscape');
    const [selectedResolution, setSelectedResolution] = useState('1280*720');
    const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
    const [introVideoUrl, setIntroVideoUrl] = useState<string | undefined>(undefined);
    const [outroVideoUrl, setOutroVideoUrl] = useState<string | undefined>(undefined);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingIntro, setUploadingIntro] = useState(false);
    const [uploadingOutro, setUploadingOutro] = useState(false);

    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const pollingIntervalIdRef = useRef<number | null>(null);

    useEffect(() => {
        getVoiceList({ area: [] }).then(res => {
            if (res?.voices?.length > 0) {
                setAllVoiceList(res?.voices as any[]);
                // const initialLanguage = getUniqueLanguageList(res?.voices as any[])[0];
                // if (initialLanguage) {
                //     const filteredVoices = (res?.voices as any[]).filter(v => v.language === initialLanguage);
                //     setNowVoiceList(filteredVoices);
                //     form.setFieldsValue({
                //         language: initialLanguage,
                //         voice_name: filteredVoices[0]?.name,
                //     });
                // }
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
    }, []);

    useEffect(() => {
        if (!videoUrl && !isGenerating) {
            setCurrentTaskId(null);
            setTaskStatus(null);
        }
    }, [videoUrl, isGenerating]);

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
        // Don't clear video URL or task status if there's a successful result
    }; const fetchTaskStatus = async (taskId: string) => {
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
                message.info(`Video generation status changed to: ${status.status}`, 3);
            }

            if (status.status === 'COMPLETED' || status.status === 'FAILED') {
                resetGenerationState();
                message.destroy();
                if (status.status === 'COMPLETED') {
                    message.success('Video generated successfully!');
                    // Look for result_url or find video URL in task_folder_content
                    if (status.result_url) {
                        setVideoUrl(status.result_url);
                    } else if (status.task_folder_content) {
                        // Find the video URL in the task folder content
                        const videoKeys = Object.keys(status.task_folder_content).filter(key =>
                            key.endsWith('.mp4') || key.endsWith('video.mp4'));
                        if (videoKeys.length > 0) {
                            setVideoUrl(status.task_folder_content[videoKeys[0]]);
                        }
                    }
                    if (status.task_folder_content) {
                        console.log("Task folder content:", status.task_folder_content);
                    }
                } else {
                    const errorMsg = status.error_message || 'Video generation failed';
                    setError(errorMsg + (status.error_details ? ` Details: ${typeof status.error_details === 'string' ? status.error_details : JSON.stringify(status.error_details)}` : ''));
                    message.error(`Video generation failed: ${errorMsg}`, 10);
                }
            }
        } catch (error: any) {
            console.error('Failed to fetch task status:', error); if (error?.response?.status === 404) {
                resetGenerationState();
                setError('Failed to fetch task status: Task ID not found.');
                message.error('Failed to fetch task status: Task ID not found.', 10);
            } else {
                message.warning('Could not fetch task status, will retry...', 3);
            }
        }
    }; const startPolling = (taskId: string) => {
        stopPolling();

        // Create initial task status to show right away
        const initialStatus: Task = {
            task_id: taskId,
            status: 'PENDING',
            progress: 0,
            events: [
                {
                    timestamp: new Date().toISOString(),
                    message: 'Task created, waiting for server to start processing...'
                },
                {
                    timestamp: new Date().toISOString(),
                    message: 'Initializing video generation pipeline...'
                }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Set this initial status both locally and in the store
        setTaskStatus(initialStatus);
        useVideoStore.getState().setTaskStatus(initialStatus);

        setCurrentTaskId(taskId);
        // Clear error state when starting a new polling session
        setError(null);
        // Clear any global store errors 
        useVideoStore.getState().setError(null);
        fetchTaskStatus(taskId);
        pollingIntervalIdRef.current = window.setInterval(() => fetchTaskStatus(taskId), 2000); // Faster polling (2s)
    };

    const onFinish: FormProps<FieldType>['onFinish'] = (values) => {
        setIsGenerating(true);
        setLoading(true);
        setError(null);
        setVideoUrl('');
        setTaskStatus(null);
        setCurrentTaskId(null);
        message.loading('Initiating video generation...', 0);

        const taskId = uuidv4();
        // Use type assertion to bypass TypeScript checks for fields that aren't 
        // explicitly defined in the interface but accepted by the API
        const payload = {
            story_prompt: values.story_prompt,
            segments: values.segments,
            image_style: values.image_style,
            voice_name: values.voice_name,
            voice_rate: values.voice_rate,
            task_id: taskId,
            resolution: selectedResolution,
            logo_url: logoUrl,
            intro_video_url: introVideoUrl,
            outro_video_url: outroVideoUrl,
            video_language: values.language,
            subtitle_enabled: values.include_subtitles,
            visual_content_in_language: values.visual_content_in_language,
        } as VideoGenerateReq; generateVideo(payload).then(res => {
            message.destroy();
            if (!res?.success || !res?.data?.task_id) {
                resetGenerationState();
                const errorMsg = res?.message || 'Failed to initiate video generation (Invalid response from server)';
                setError(errorMsg);
                message.error(`Error: ${errorMsg}`, 10);
                return;
            }

            console.log('Video generation initiated:', res);

            // Start polling with the received task_id
            startPolling(res.data.task_id);

            // We don't expect video_url in the immediate response anymore since we're using background tasks
            // But we'll keep this code for backward compatibility
            if (res.data?.video_url) {
                setVideoUrl(res.data.video_url);
            }

            // Display message that the video generation is in progress
            message.info('Video generation has started in the background. You can track its progress below.', 5);

        }).catch(err => {
            resetGenerationState();
            const errorMsg = err?.message || err?.data?.message || 'Generate Video Failed (Network/Request Error)';
            setError(errorMsg);
            message.error(`Generate Video Failed: ${errorMsg}`, 10);
            console.log('generateVideo err', err);
        });
    };

    const onFinishFailed: FormProps<FieldType>['onFinishFailed'] = (errorInfo) => {
        console.log('Failed:', errorInfo);
        message.error('Please fill all required fields correctly.');
    };

    const handleResolutionTypeChange = (e: RadioChangeEvent) => {
        const type = e.target.value;
        setResolutionType(type);
        const defaultResolution = resolutionOptions.find(option => option.type === type)?.options[0].value;
        setSelectedResolution(defaultResolution || '1920*1080');
        form.setFieldsValue({ resolution: defaultResolution || '1920*1080' });
    };

    // const handleResolutionChange = (e: RadioChangeEvent) => {
    //     setSelectedResolution(e.target.value);
    //     form.setFieldsValue({ resolution: e.target.value });
    // };

    const handleFileUpload = async (file: File, type: 'logo' | 'intro' | 'outro') => {
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (type === 'logo' && !isImage) {
            message.error('Logo must be an image file.');
            return;
        }
        if ((type === 'intro' || type === 'outro') && !isVideo) {
            message.error(`${type === 'intro' ? 'Intro' : 'Outro'} must be a video file.`);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const setUploadingState = type === 'logo' ? setUploadingLogo : type === 'intro' ? setUploadingIntro : setUploadingOutro;
        setUploadingState(true);

        try {
            message.loading(`Uploading ${type}...`, 0);
            const res = await uploadFile(formData);
            message.destroy();

            if (res && res.url) {
                message.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`);
                if (type === 'logo') setLogoUrl(res.url);
                if (type === 'intro') setIntroVideoUrl(res.url);
                if (type === 'outro') setOutroVideoUrl(res.url);
            } else {
                throw new Error(res?.message || `Failed to upload ${type}`);
            }
        } catch (error: any) {
            message.destroy();
            message.error(`Failed to upload ${type}: ${error.message || JSON.stringify(error)}`, 10);
            console.error(`Upload error (${type}):`, error);
        } finally {
            setUploadingState(false);
        }
    };

    const initialFormValues: Partial<FieldType> = {
        segments: 3,
        story_prompt: '',
        voice_rate: 1.0,
        include_subtitles: false,
        visual_content_in_language: false,

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
                <Title level={2} style={{ marginBottom: 24, textAlign: 'center' }}>
                    <PlaySquareOutlined /> AI Video Generator
                </Title>

                {currentTaskId && (
                    <Card
                        title="Video Generation Progress"
                        style={{ marginBottom: 24, borderColor: taskStatus?.status === 'FAILED' ? 'red' : '#1890ff' }}
                        extra={isGenerating || (taskStatus && taskStatus.status !== 'COMPLETED' && taskStatus.status !== 'FAILED') ? <Spin /> : null}
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
                    name="videoGeneratorForm"
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
                        title={<span><HighlightOutlined /> Story Details</span>}
                        className={styles.sectionCard}
                        style={{ marginBottom: 24, borderRadius: '8px' }}
                    >

                        <Form.Item<FieldType>
                            label={t('Story Prompt')}
                            name="story_prompt"
                            rules={[{ required: true, message: t('Please input the story prompt!') }]}
                        >
                            <Input.TextArea rows={3} placeholder={t("Enter the topic of your video. E.g., 'Make a lecture on Docker'") as string} />
                        </Form.Item>


                        <Form.Item<FieldType>
                            label="Number of Segments/Scenes"
                            name="segments"
                            rules={[{ required: true, message: 'Please input the number of segments (1-50)' }]}
                        >
                            <InputNumber min={1} max={50} style={{ width: '100%' }} />
                        </Form.Item>
                    </Card>

                    <Card
                        title={
                            <span>
                                <SettingOutlined /> Video Configuration
                            </span>
                        }
                        className={styles.sectionCard}
                        style={{ marginBottom: 24, borderRadius: '8px' }}
                    >
                        <Form.Item label="Orientation & Quality">
                            <Radio.Group
                                optionType="button"
                                buttonStyle="solid"
                                value={resolutionType}
                                onChange={handleResolutionTypeChange}
                                style={{ width: '100%', display: 'flex', marginBottom: 16 }}
                            >
                                {resolutionOptions.map(option => (
                                    <Radio.Button
                                        value={option.type}
                                        key={option.type}
                                        style={{
                                            flex: 1,
                                            textAlign: 'center',
                                            height: 'auto',
                                            minHeight: '80px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexDirection: 'column',
                                            padding: '10px 5px'
                                        }}
                                    >
                                        <div style={{ fontSize: '24px' }}>{option.icon}</div>
                                        <div>{option.label}</div>
                                    </Radio.Button>
                                ))}
                            </Radio.Group>
                        </Form.Item>

                        {/* <Form.Item<FieldType>
                            label="Selected Resolution"
                            name="resolution"
                            rules={[{ required: true, message: 'Please select a resolution' }]}
                        >
                            <Radio.Group onChange={handleResolutionChange} value={selectedResolution} style={{ width: '100%' }}>
                                <Row gutter={[16, 16]}>
                                    {resolutionOptions
                                        .find(option => option.type === resolutionType)
                                        ?.options.map(resolution => (
                                            <Col xs={24} sm={12} key={resolution.value}>
                                                <Radio.Button
                                                    value={resolution.value}
                                                    style={{
                                                        width: '100%',
                                                        height: 'auto',
                                                        minHeight: '60px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        position: 'relative',
                                                        borderRadius: '8px',
                                                        padding: '10px'
                                                    }}
                                                >
                                                    <Badge.Ribbon
                                                        text={resolution.quality}
                                                        color="#1677ff"
                                                        style={{
                                                            display: selectedResolution === resolution.value ? 'block' : 'none',
                                                            top: '-4px',
                                                            right: '-4px'
                                                        }}
                                                    />
                                                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                                        {resolution.quality}
                                                    </div>
                                                    <div style={{ fontSize: '13px', color: '#666' }}>
                                                        {resolution.label}
                                                    </div>
                                                    {selectedResolution === resolution.value && (
                                                        <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#1677ff' }}>
                                                            <CheckCircleFilled style={{ fontSize: '18px' }} />
                                                        </div>
                                                    )}
                                                </Radio.Button>
                                            </Col>
                                        ))
                                    }
                                </Row>
                            </Radio.Group>
                        </Form.Item> */}

                        <Row gutter={16}>
                      
                            <Col xs={24} sm={24}>
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

        
                            <Col xs={24} sm={24}>
                                <Form.Item<FieldType>
                                    label="Visual Content in Language"
                                    name="visual_content_in_language"
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
                        title={
                            <span>
                                <TranslationOutlined /> Language & Voice
                            </span>
                        }
                        className={styles.sectionCard}
                        style={{ marginBottom: 24, borderRadius: '8px' }}
                    >
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item<FieldType>
                                    label={
                                        <span>
                                            <TranslationOutlined style={{ marginRight: 4 }} /> {t('storyForm.videoLanguage')}
                                        </span>
                                    }
                                    name="language"
                                    rules={[{ required: true, message: t('storyForm.videoLanguageMissMsg') }]}
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
                                            <AudioOutlined style={{ marginRight: 4 }} /> {t('storyForm.voiceName')}
                                        </span>
                                    }
                                    name="voice_name"
                                    rules={[{ required: true, message: t('storyForm.voiceNameMissMsg') }]}
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
                            <Col xs={24} sm={12}>
                                <Form.Item<FieldType>
                                    label="Voice Rate (Speed)"
                                    name="voice_rate"
                                    rules={[{ required: true, message: 'Please set voice rate' }]}
                                >
                                    <InputNumber min={0.5} max={2.0} step={0.1} style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    <Card
                        title={
                            <span>
                                <PictureOutlined /> Branding & Extras (Optional)
                            </span>
                        }
                        className={styles.sectionCard}
                        style={{ marginBottom: 24, borderRadius: '8px' }}
                    >
                        <Row gutter={16}>
                            <Col xs={24} md={24}>
                                <Form.Item
                                    label="Logo (Image)"
                                    help={logoUrl ? <a href={logoUrl} target="_blank" rel="noopener noreferrer">View Uploaded Logo</a> : "Upload a logo image (e.g., PNG, JPG)"}
                                >
                                    <Upload
                                        name="logo"
                                        customRequest={({ file }) => handleFileUpload(file as File, 'logo')}
                                        showUploadList={false}
                                        accept="image/*"
                                        disabled={uploadingLogo || isGenerating}
                                    >
                                        <Button icon={<UploadOutlined />} loading={uploadingLogo} disabled={isGenerating}>
                                            {logoUrl ? 'Change Logo' : 'Upload Logo'}
                                        </Button>
                                    </Upload>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={24}>
                                <Form.Item
                                    label="Intro Video"
                                    help={introVideoUrl ? <a href={introVideoUrl} target="_blank" rel="noopener noreferrer">View Uploaded Intro</a> : "Upload an intro video (e.g., MP4)"}
                                >
                                    <Upload
                                        name="introVideo"
                                        customRequest={({ file }) => handleFileUpload(file as File, 'intro')}
                                        showUploadList={false}
                                        accept="video/*"
                                        disabled={uploadingIntro || isGenerating}
                                    >
                                        <Button icon={<VideoCameraAddOutlined />} loading={uploadingIntro} disabled={isGenerating}>
                                            {introVideoUrl ? 'Change Intro' : 'Upload Intro'}
                                        </Button>
                                    </Upload>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={24}>
                                <Form.Item
                                    label="Outro Video"
                                    help={outroVideoUrl ? <a href={outroVideoUrl} target="_blank" rel="noopener noreferrer">View Uploaded Outro</a> : "Upload an outro video (e.g., MP4)"}
                                >
                                    <Upload
                                        name="outroVideo"
                                        customRequest={({ file }) => handleFileUpload(file as File, 'outro')}
                                        showUploadList={false}
                                        accept="video/*"
                                        disabled={uploadingOutro || isGenerating}
                                    >
                                        <Button icon={<VideoCameraAddOutlined />} loading={uploadingOutro} disabled={isGenerating}>
                                            {outroVideoUrl ? 'Change Outro' : 'Upload Outro'}
                                        </Button>
                                    </Upload>
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    <Form.Item wrapperCol={{ span: 24 }} style={{ textAlign: 'center', marginTop: 32 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={isGenerating}
                            disabled={isGenerating || uploadingLogo || uploadingIntro || uploadingOutro}
                            icon={<PlaySquareOutlined />}
                            size="large"
                            style={{ minWidth: '200px', height: '50px' }}
                        >
                            {isGenerating ? 'Generating Video...' : 'Generate Video'}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default App;