import React from 'react';
import { Row, Col, Button } from 'antd';
import { Link } from 'react-router-dom';
import StoryForm from '../components/StoryFrom';
import VideoResult from '../components/VideoResult';
import { UnorderedListOutlined, ArrowLeftOutlined } from '@ant-design/icons';

const LessonMakerPage: React.FC = () => {
    return (
        <Row style={{
            display: 'flex',
            width: '100%',
            margin: 0,
        }}>
            <Col
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 64, // Position below the header
                    width: '500px',
                    backgroundColor: '#f0f0f0',
                    overflowY: 'hidden',
                    boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
                    zIndex: 1,
                    height: 'calc(100vh - 70px)', // Adjust for header and footer
                }}
            >
                <StoryForm />
            </Col>
            <Col
                style={{
                    flex: 1,
                    width: "calc(100% - 500px)",
                    marginLeft: '500px',
                    height: 'calc(100vh - 70px)', // Adjust for header and footer
                    overflow: 'auto',
                }}
            >
                <div style={{ padding: '10px 20px', height: '52px', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between' }}>
                    <Button type="default" icon={<ArrowLeftOutlined />}>
                        <Link to="/dashboard">Back to Dashboard</Link>
                    </Button>
                    <Button type="primary" icon={<UnorderedListOutlined />}>
                        <Link to="/tasks">View All Tasks</Link>
                    </Button>
                </div>
                <VideoResult />
            </Col>
        </Row>
    );
};

export default LessonMakerPage;
