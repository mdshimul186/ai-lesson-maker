import React from 'react';
import { Button, Typography, Space, Row, Col, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
    VideoCameraOutlined, 
    BookOutlined, 
    RocketOutlined,
    UserOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    StarOutlined,
    GlobalOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div>
            {/* Hero Section */}
            <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                borderRadius: '0 0 20px 20px',
                color: 'white'
            }}>
                <Title style={{ color: 'white', fontSize: '3rem', marginBottom: '16px' }}>
                    AI Lesson Maker
                </Title>
                <Paragraph style={{ 
                    color: 'white', 
                    fontSize: '1.2rem', 
                    maxWidth: '800px', 
                    margin: '0 auto 32px auto' 
                }}>
                    Transform your content into engaging video lessons in minutes with AI-powered educational tools
                </Paragraph>
                <Space size="large">
                    <Button 
                        type="primary" 
                        size="large" 
                        onClick={() => navigate('/login')}
                        style={{ 
                            backgroundColor: 'white', 
                            color: '#1890ff',
                            borderColor: 'white',
                            fontWeight: 'bold',
                            height: '48px',
                            padding: '0 32px'
                        }}
                    >
                        Log In
                    </Button>
                    <Button 
                        size="large" 
                        onClick={() => navigate('/register')}
                        style={{ 
                            borderColor: 'white', 
                            color: 'white',
                            fontWeight: 'bold',
                            height: '48px',
                            padding: '0 32px',
                            backgroundColor: '#1890ff',
                        }}
                    >
                        Sign Up
                    </Button>
                </Space>
            </div>

            {/* Features Section */}
            <div style={{ padding: '60px 20px' }}>
                <Title level={2} style={{ textAlign: 'center', marginBottom: '48px' }}>
                    Powerful AI Tools for Educators
                </Title>
                <Row gutter={[24, 24]} justify="center">
                    <Col xs={24} sm={12} md={8}>
                        <Card 
                            style={{ height: '100%', textAlign: 'center' }}
                            cover={
                                <div style={{ 
                                    padding: '32px 0 16px 0', 
                                    background: '#f0f7ff',
                                    display: 'flex',
                                    justifyContent: 'center'
                                }}>
                                    <VideoCameraOutlined style={{ fontSize: '64px', color: '#1890ff' }} />
                                </div>
                            }
                        >
                            <Title level={4}>AI Lesson Maker</Title>
                            <Paragraph>
                                Convert your text content into professional video lessons with AI narration, visual elements, and engaging animations.
                            </Paragraph>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <Card 
                            style={{ height: '100%', textAlign: 'center' }}
                            cover={
                                <div style={{ 
                                    padding: '32px 0 16px 0', 
                                    background: '#f6fff0',
                                    display: 'flex',
                                    justifyContent: 'center'
                                }}>
                                    <BookOutlined style={{ fontSize: '64px', color: '#52c41a' }} />
                                </div>
                            }
                        >
                            <Title level={4}>AI Course Maker</Title>
                            <Paragraph>
                                Build comprehensive courses with multiple lessons, structured learning paths and assessments.
                            </Paragraph>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <Card 
                            style={{ height: '100%', textAlign: 'center' }}
                            cover={
                                <div style={{ 
                                    padding: '32px 0 16px 0', 
                                    background: '#f9f0ff',
                                    display: 'flex',
                                    justifyContent: 'center'
                                }}>
                                    <RocketOutlined style={{ fontSize: '64px', color: '#722ed1' }} />
                                </div>
                            }
                        >
                            <Title level={4}>Fast & Efficient</Title>
                            <Paragraph>
                                Create professional educational content in minutes instead of hours. Save time while delivering high-quality lessons.
                            </Paragraph>
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* Benefits Section */}
            <div style={{ padding: '60px 20px', background: '#fff' }}>
                <Title level={2} style={{ textAlign: 'center', marginBottom: '48px' }}>
                    Why Choose AI Lesson Maker?
                </Title>
                <Row gutter={[24, 36]} justify="center">
                    {[
                        {
                            title: 'Save Time',
                            description: 'Create professional educational videos in minutes instead of hours or days.',
                            icon: <ClockCircleOutlined style={{ fontSize: '36px', color: '#1890ff' }} />
                        },
                        {
                            title: 'Easy to Use',
                            description: 'No technical skills required. Simply input your content and our AI does the rest.',
                            icon: <CheckCircleOutlined style={{ fontSize: '36px', color: '#52c41a' }} />
                        },
                        {
                            title: 'Professional Quality',
                            description: 'Get high-quality videos with natural voiceovers and engaging visuals every time.',
                            icon: <StarOutlined style={{ fontSize: '36px', color: '#faad14' }} />
                        },
                        {
                            title: 'Multilingual Support',
                            description: 'Create content in multiple languages to reach a global audience.',
                            icon: <GlobalOutlined style={{ fontSize: '36px', color: '#722ed1' }} />
                        }
                    ].map((benefit, index) => (
                        <Col xs={24} sm={12} md={12} lg={6} key={index}>
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '24px',
                                height: '100%',
                                borderRadius: '8px',
                                background: '#f9f9f9',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ marginBottom: '16px' }}>
                                    {benefit.icon}
                                </div>
                                <Title level={4}>{benefit.title}</Title>
                                <Paragraph>{benefit.description}</Paragraph>
                            </div>
                        </Col>
                    ))}
                </Row>
            </div>

            {/* Testimonials Section */}
            <div style={{ padding: '60px 20px', background: '#f0f7ff' }}>
                <Title level={2} style={{ textAlign: 'center', marginBottom: '48px' }}>
                    What Educators Are Saying
                </Title>
                <Row gutter={[24, 24]} justify="center">
                    {[
                        {
                            quote: "AI Lesson Maker has transformed how I create content for my students. What used to take me days now takes minutes!",
                            author: "Sarah J., High School Teacher",
                            avatar: <UserOutlined style={{ fontSize: '32px', padding: '8px', background: '#1890ff', borderRadius: '50%', color: 'white' }} />
                        },
                        {
                            quote: "My students are more engaged than ever with the professional quality videos I can now produce for every lesson.",
                            author: "Michael T., University Professor",
                            avatar: <UserOutlined style={{ fontSize: '32px', padding: '8px', background: '#52c41a', borderRadius: '50%', color: 'white' }} />
                        },
                        {
                            quote: "The multilingual feature allowed me to create content for my international students in their native languages. Amazing tool!",
                            author: "Elena K., Online Course Creator",
                            avatar: <UserOutlined style={{ fontSize: '32px', padding: '8px', background: '#722ed1', borderRadius: '50%', color: 'white' }} />
                        }
                    ].map((testimonial, index) => (
                        <Col xs={24} sm={24} md={8} key={index}>
                            <Card 
                                style={{ 
                                    height: '100%',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                                }}
                            >
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ marginBottom: '16px' }}>
                                        {testimonial.avatar}
                                    </div>
                                    <Paragraph style={{ 
                                        fontSize: '16px', 
                                        fontStyle: 'italic',
                                        marginBottom: '16px'
                                    }}>
                                        "{testimonial.quote}"
                                    </Paragraph>
                                    <Paragraph strong>
                                        {testimonial.author}
                                    </Paragraph>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>

            {/* CTA Section */}
            <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                background: '#f0f2f5',
                borderRadius: '20px'
            }}>
                <Title level={2}>Ready to Transform Your Teaching?</Title>
                <Paragraph style={{ 
                    fontSize: '1.2rem', 
                    maxWidth: '800px', 
                    margin: '0 auto 32px auto' 
                }}>
                    Join thousands of educators creating engaging video lessons with AI
                </Paragraph>
                <Button 
                    type="primary" 
                    size="large" 
                    onClick={() => navigate('/register')}
                    style={{ 
                        height: '48px',
                        padding: '0 32px',
                        fontSize: '16px'
                    }}
                >
                    Get Started Now
                </Button>
            </div>
        </div>
    );
};

export default LandingPage;
