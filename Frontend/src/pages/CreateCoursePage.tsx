import React from 'react';
import { Card, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import CreateCourse from '../components/CreateCourse';

const CreateCoursePage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <Card>
                <div style={{ marginBottom: '16px' }}>
                    <Button 
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/course-maker')}
                    >
                        Back to Course List
                    </Button>
                </div>
                
                <CreateCourse />
            </Card>
        </div>
    );
};

export default CreateCoursePage;
