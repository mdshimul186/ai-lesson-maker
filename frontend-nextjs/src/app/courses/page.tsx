'use client';

import React from 'react';
import { Layout } from 'antd';
import CourseMaker from '../../components/CourseMaker';

const { Content } = Layout;

export default function CourseMakerPage() {
    return (
        <Layout style={{
            width: "100vw"
        }}>
            <Content style={{ padding: '0 50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <CourseMaker />
            </Content>
        </Layout>
    );
}
