import React from 'react';
import { Layout } from 'antd';
import CourseView from '../components/CourseView';


const { Content } = Layout;

const CourseViewPage: React.FC = () => {
    return (
        <Layout style={{
            width: "100vw"
        }}>
            <Content style={{ padding: '0 50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <CourseView />
            </Content>
        </Layout>
    );
};

export default CourseViewPage;
