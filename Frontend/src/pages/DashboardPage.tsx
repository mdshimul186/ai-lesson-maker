import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Typography, Statistic, Divider, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
    VideoCameraOutlined, 
    BookOutlined, 
    HistoryOutlined,
    PlayCircleOutlined,
    CreditCardOutlined,
    ClockCircleOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import {  useAccountStore } from '../stores';
import { getAllTasks } from '../services';

const { Title, Paragraph } = Typography;

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentAccount } = useAccountStore();
    const [stats, setStats] = useState({
        totalVideos: 0,
        pendingVideos: 0,
        availableCredits: 0,
        loading: true
    });    // Tool cards data
    const tools = [
        {
            id: 'lesson-maker',
            title: 'AI Lesson Maker',
            description: 'Create engaging video lessons with AI. Convert your text into professional educational videos.',
            icon: <VideoCameraOutlined style={{ fontSize: '36px', color: '#1890ff' }} />,
            path: '/lesson-maker',
            available: true
        },
        {
            id: 'animated-lesson-maker',
            title: 'AI Animated Lesson Maker',
            description: 'Create animated lessons with typing effects, drawing, and other animations right in your browser.',
            icon: <PlayCircleOutlined style={{ fontSize: '36px', color: '#fa8c16' }} />,
            path: '/animated-lesson-maker',
            available: true
        },
        {
            id: 'course-maker',
            title: 'AI Course Maker',
            description: 'Build complete courses with multiple lessons and structured learning paths.',
            icon: <BookOutlined style={{ fontSize: '36px', color: '#52c41a' }} />,
            path: '/course-maker',
            available: true
        },
        {
            id: 'tasks',
            title: 'Recent Tasks',
            description: 'View and manage your recent content generation tasks.',
            icon: <HistoryOutlined style={{ fontSize: '36px', color: '#722ed1' }} />,
            path: '/tasks',
            available: true
        }
    ];// Fetch user stats on component mount and when currentAccount changes
    useEffect(() => {
        if (currentAccount) {
            console.log('Account changed, fetching stats...');
            fetchStats();
        }
    }, [currentAccount?.id]); // Specifically track currentAccount.id to detect account changes

    // Function to fetch stats
    const fetchStats = async () => {
        setStats(prev => ({ ...prev, loading: true }));
        try {
            // Get actual pending videos count from the tasks API
            const tasks = await getAllTasks();
            
            // Count pending, queued, and processing tasks
            const pendingCount = tasks.filter(task => 
                task.status === 'PENDING' || 
                task.status === 'QUEUED' || 
                task.status === 'PROCESSING'
            ).length;
            
            // Count total videos (completed tasks)
            const completedCount = tasks.filter(task => 
                task.status === 'COMPLETED'
            ).length;
            
            setStats({
                totalVideos: completedCount,
                pendingVideos: pendingCount,
                availableCredits: currentAccount?.credits || 0,
                loading: false
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            // Fallback to default values if API call fails
            setStats({
                totalVideos: 0,
                pendingVideos: 0,
                availableCredits: currentAccount?.credits || 0,
                loading: false
            });
        }
    };

    // Function to manually refresh stats
    const refreshStats = async () => {
        setStats(prev => ({ ...prev, loading: true }));
        
        try {
            // Get actual pending videos count from the tasks API
            const tasks = await getAllTasks();
            
            // Count pending, queued, and processing tasks
            const pendingCount = tasks.filter(task => 
                task.status === 'PENDING' || 
                task.status === 'QUEUED' || 
                task.status === 'PROCESSING'
            ).length;
            
            // Count total videos (completed tasks)
            const completedCount = tasks.filter(task => 
                task.status === 'COMPLETED'
            ).length;
            
            setStats({
                totalVideos: completedCount,
                pendingVideos: pendingCount,
                availableCredits: currentAccount?.credits || 0,
                loading: false
            });
        } catch (error) {
            console.error('Error refreshing stats:', error);
            setStats(prev => ({ ...prev, loading: false }));
        }
    };    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
                    <Paragraph>Welcome to AI Lesson Maker. Select a tool to get started.</Paragraph>
                </div>
                <Tooltip title="Refresh statistics">
                    <Button 
                        icon={<ReloadOutlined />} 
                        onClick={refreshStats} 
                        loading={stats.loading}
                    >
                        Refresh
                    </Button>
                </Tooltip>
            </div>
            
            {/* Analytics Cards */}
            <Row gutter={[24, 24]} style={{ marginTop: '24px', marginBottom: '32px' }}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic 
                            title="Total Videos" 
                            value={stats.totalVideos} 
                            prefix={<PlayCircleOutlined />} 
                            loading={stats.loading} 
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic 
                            title="Pending Videos" 
                            value={stats.pendingVideos} 
                            prefix={<ClockCircleOutlined />} 
                            loading={stats.loading} 
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic 
                            title="Available Credits" 
                            value={stats.availableCredits} 
                            prefix={<CreditCardOutlined />} 
                            loading={stats.loading} 
                        />
                    </Card>
                </Col>
            </Row>
            
            <Divider orientation="left">Tools</Divider>
            
            <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
                {tools.map(tool => (
                    <Col xs={24} sm={12} md={8} key={tool.id}>
                        <Card 
                            hoverable 
                            style={{ 
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            }}
                        >
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center',
                                textAlign: 'center',
                                height: '100%'
                            }}>
                                <div style={{ margin: '16px 0' }}>
                                    {tool.icon}
                                </div>
                                <Title level={4}>{tool.title}</Title>
                                <Paragraph style={{ flexGrow: 1 }}>
                                    {tool.description}
                                </Paragraph>
                                <Button 
                                    type="primary" 
                                    size="large"
                                    style={{ width: '100%' }}
                                    onClick={() => navigate(tool.path)}
                                    disabled={!tool.available}
                                >
                                    {tool.available ? 'Launch' : 'Coming Soon'}
                                </Button>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>
            <Button onClick={refreshStats} style={{ marginTop: '20px' }}>
                Refresh Stats
            </Button>
        </div>
    );
};

export default DashboardPage;
