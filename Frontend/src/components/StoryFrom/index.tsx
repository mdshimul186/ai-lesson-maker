import React, { useState, useEffect } from 'react';
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
    Badge
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
    CheckCircleFilled
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getVoiceList, generateVideo } from '../../services/index';


import styles from './index.module.css';
import { useVideoStore } from "../../stores/index";

const { Title } = Typography;
const { Option } = Select;

type FieldType = {
    resolution?: string; // Resolution
    test_mode?: boolean; // Test mode
    task_id?: string; // Task ID, needed for test mode
    segments: number; // Number of segments (1-50)
    language?: Language; // Story language
    story_prompt?: string; // Story prompt, required when not in test mode
    image_style?: string; // Image style, required when not in test mode
    voice_name: string; // Voice name, must match language
    voice_rate: number; // Voice rate, default is 1
    include_subtitles: boolean; // Include subtitles in the video
    visual_content_in_language: boolean; // Show visual content in the selected language
};

type voiceList = {
    displayName: string; // Display name
    gender: string; // Gender
    language: string; // Language
    name: string; // Name
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

// Resolution option data
const resolutionOptions = [
    {
        type: 'landscape',
        icon: <FullscreenOutlined />,
        label: 'Landscape',
        options: [
            { value: '1280*720', label: 'HD (1280×720)', quality: 'HD' },
            { value: '1920*1080', label: 'Full HD (1920×1080)', quality: 'FHD' },
            { value: '2560*1440', label: 'Quad HD (2560×1440)', quality: '2K' },
            { value: '3840*2160', label: 'Ultra HD (3840×2160)', quality: '4K' },
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
            { value: '1080*1080', label: 'HD (1080×1080)', quality: 'HD' },
            { value: '1440*1440', label: 'Quad HD (1440×1440)', quality: '2K' },
        ]
    }
];

const App: React.FC = () => {
    const { setVideoUrl, setLoading, setError } = useVideoStore();
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [allVoiceList, setAllVoiceList] = useState<voiceList[]>([]);
    const [nowVoiceList, setNowVoiceList] = useState<voiceList[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [resolutionType, setResolutionType] = useState('landscape');
    const [selectedResolution, setSelectedResolution] = useState('1920*1080');

    useEffect(() => {
        getVoiceList({ area: [] }).then(res => {
            console.log('voiceList', res?.voices);
            if (res?.voices?.length > 0) {
                setAllVoiceList(res?.voices as any[]);
            }
        }).catch(err => {
            console.log(err);
        });
    }, []);

    const onFinish: FormProps<FieldType>['onFinish'] = (values) => {
      
        setIsGenerating(true);
        setLoading(true);
        setError(null);
        message.loading('Generating Video, please wait...', 0);

        generateVideo(values).then(res => {
            setIsGenerating(false);
            setLoading(false);
            message.destroy();
            if (res?.success === false) {
                throw new Error(res?.message || 'Generate Video Failed');
            }
            console.log('generateVideo res', res);
            message.success('Generate Video Success');
            if (res?.data?.video_url) {
                setVideoUrl(res?.data?.video_url);
            }
        }).catch(err => {
            setIsGenerating(false);
            setLoading(false);
            setError(err?.message || 'Generate Video Failed');
            message.error('Generate Video Failed: ' + (err?.message || JSON.stringify(err)), 10);
            console.log('generateVideo err', err);
        });
    };

    const onFinishFailed: FormProps<FieldType>['onFinishFailed'] = (errorInfo) => {
        console.log('Failed:', errorInfo);
    };

    const handleResolutionTypeChange = (e: RadioChangeEvent) => {
        const type = e.target.value;
        setResolutionType(type);
        // Set default resolution for this type
        const defaultResolution = resolutionOptions.find(option => option.type === type)?.options[0].value;
        setSelectedResolution(defaultResolution || '1280*720');
        form.setFieldsValue({ resolution: defaultResolution || '1280*720' });
    };

    const handleResolutionChange = (e: RadioChangeEvent) => {
        setSelectedResolution(e.target.value);
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

                <Form
                    form={form}
                    name="videoGeneratorForm"
                    labelCol={{ span: 24 }}
                    wrapperCol={{ span: 24 }}
                    style={{ maxWidth: 900, width: '100%', margin: '0 auto' }}
                    initialValues={{
                        resolution: '1280*720',
                        text_llm_model: "gpt-4o",
                        image_llm_model: "flux",
                        segments: 3,
                        include_subtitles: false,
                        visual_content_in_language: true
                    }}
                    onFinish={onFinish}
                    onFinishFailed={onFinishFailed}
                    layout="vertical"
                    size="large"
                    autoComplete="off"
                >
                    {/* Resolution Section */}
                    <Card
                        title={
                            <span>
                                <SettingOutlined /> Video Configuration
                            </span>
                        }
                        className={styles.sectionCard}
                        style={{ marginBottom: 24, borderRadius: '8px' }}
                    >
                        <Form.Item label="Orientation">
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
                                            height: '80px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexDirection: 'column',

                                        }}
                                    >
                                        <div style={{ fontSize: '24px' }}>{option.icon}</div>
                                        <div>{option.label}</div>
                                    </Radio.Button>
                                ))}
                            </Radio.Group>
                        </Form.Item>

                        <Form.Item<FieldType>
                            label="Resolution Quality"
                            name="resolution"
                            rules={[{ required: true, message: 'Please select a resolution' }]}
                        >
                            <Radio.Group onChange={handleResolutionChange} value={selectedResolution}>
                                <Row gutter={[16, 16]}>
                                    {resolutionOptions
                                        .find(option => option.type === resolutionType)
                                        ?.options.map(resolution => (
                                            <Col span={12} key={resolution.value}>
                                                <Radio.Button
                                                    value={resolution.value}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        display: 'flex',
                                                        // flexDirection: 'column',
                                                        // justifyContent: 'center',
                                                        // alignItems: 'center',
                                                        position: 'relative',
                                                        borderRadius: '8px',
                                                        // overflow: 'hidden'
                                                    }}
                                                >
                                                    <Badge.Ribbon
                                                        text={resolution.quality}
                                                        color="#1677ff"
                                                        style={{
                                                            display: selectedResolution === resolution.value ? 'block' : 'none',
                                                            top: '0px',
                                                            right: '0px'
                                                        }}
                                                    />
                                                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                                        {resolution.quality}
                                                    </div>


                                                    <div style={{ fontSize: '14px', color: '#666' }}>
                                                        {resolution.label}
                                                    </div>
                                                    {selectedResolution === resolution.value && (
                                                        <div style={{ position: 'absolute', right: '10px', top: '10px', color: '#1677ff' }}>
                                                            <CheckCircleFilled />
                                                        </div>
                                                    )}
                                                </Radio.Button>
                                            </Col>
                                        ))
                                    }
                                </Row>
                            </Radio.Group>
                        </Form.Item>

                        <Row>
                            <Col span={24}>
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
                            <Col span={24}>
                                <Form.Item<FieldType>
                                    label="Visual Content in Selected Language"
                                    name="visual_content_in_language"
                                    valuePropName="checked"
                                    tooltip="If enabled, all text in generated images will match the selected language"
                                >
                                    <Switch
                                        checkedChildren="On"
                                        unCheckedChildren="Off"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    {/* Language Section */}
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
                            <Col span={12}>
                                <Form.Item<FieldType>
                                    label={
                                        <span>
                                            <TranslationOutlined /> {t('storyForm.videoLanguage')}
                                        </span>
                                    }
                                    name="language"
                                    rules={[{ required: true, message: t('storyForm.videoLanguageMissMsg') }]}
                                >
                                    <Select
                                        showSearch
                                        placeholder="Select language"
                                        onChange={(value) => {
                                            // Filter voice list by language
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
                                        dropdownStyle={{ maxHeight: 400 }}
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
                            <Col span={12}>
                                <Form.Item<FieldType>
                                    label={
                                        <span>
                                            <AudioOutlined /> {t('storyForm.voiceName')}
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
                                        dropdownStyle={{ maxHeight: 400 }}
                                    >
                                        {
                                            nowVoiceList.map((voice) => (
                                                <Option
                                                    key={voice.name}
                                                    value={voice.name}
                                                    label={voice.displayName}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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
                    </Card>

                    {/* Content Section */}
                    <Card
                        title={
                            <span>
                                <HighlightOutlined /> Content
                            </span>
                        }
                        className={styles.sectionCard}
                        style={{ marginBottom: 24, borderRadius: '8px' }}
                    >
                        <Form.Item<FieldType>
                            label={
                                <span>
                                    <HighlightOutlined /> {t('storyForm.textPrompt')}
                                </span>
                            }
                            name="story_prompt"
                            rules={[{ required: true, message: t('storyForm.textPromptMissMsg') }]}
                        >
                            <Input.TextArea
                                rows={5}
                                placeholder={t('storyForm.storyPromptPlaceholder')}
                                showCount
                                maxLength={2000}
                                style={{ borderRadius: '8px' }}
                            />
                        </Form.Item>

                        <Form.Item<FieldType>
                            label={
                                <span>
                                    <PictureOutlined /> Number of Scenes
                                </span>
                            }
                            name="segments"
                            rules={[{
                                required: true,
                                message: t('storyForm.segmentsMissMsg'),
                                type: 'number',
                                min: 1,
                                max: 50
                            }]}
                        >
                            <Input
                                type='number'
                                min={1}
                                max={50}
                                placeholder="3"
                                addonAfter="scenes"
                                style={{ width: '100%', borderRadius: '8px' }}
                            />
                        </Form.Item>
                    </Card>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            loading={isGenerating}
                            block
                            style={{
                                height: '50px',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                marginTop: '16px'
                            }}
                            icon={<PlaySquareOutlined />}
                        >
                            {isGenerating ? 'Generating...' : 'Generate Video'}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default App;