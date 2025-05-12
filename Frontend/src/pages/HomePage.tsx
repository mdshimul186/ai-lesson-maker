import React from 'react';
import { Layout, Row, Col, Button } from 'antd';
import { Link } from 'react-router-dom';
import StoryForm from '../components/StoryFrom';
import VideoResult from '../components/VideoResult';
import { UnorderedListOutlined } from '@ant-design/icons';

const { Content } = Layout;

const HomePage: React.FC = () => {
    return (
        <Layout className="site-layout" style={{ width: '100vw', minHeight: '100vh' }}>
            <Content style={{ padding: 0, display: 'flex', flexDirection: 'column', width: '100%' }}>

                <Row style={{
                    display: 'flex',
                    width: '100%',
                    // height: 'calc(100vh - 52px)', // Adjust height to account for the top bar
                    margin: 0,
                }}>
                    <Col
                        style={{
                            // height: 'calc(100vh - 52px)', // Adjust height to fill remaining vertical space
                            position: 'fixed',
                            left: 0,
                            top: 0, // Position below the top bar
                            width: '500px',
                            backgroundColor: '#f0f0f0',
                            overflowY: 'auto',
                            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
                            zIndex: 1
                        }}
                    >
                        <StoryForm />
                    </Col>
                    <Col
                        style={{
                            flex: 1,
                            width: "calc(100% - 500px)",
                            marginLeft: '500px',
                            // padding: '20px',
                            height: '100vh', // Will take full height of its parent Row
                            overflow: 'auto',
                        }}
                    >
                        <div style={{ padding: '10px 20px', height: '52px', boxSizing: 'border-box' }}> {/* Set fixed height for the top bar */}
                            <Button type="primary" icon={<UnorderedListOutlined />}>
                                <Link to="/tasks">View All Tasks</Link>
                            </Button>
                        </div>
                        <VideoResult />
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
};

export default HomePage;
