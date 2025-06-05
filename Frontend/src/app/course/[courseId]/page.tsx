'use client';

import React from 'react';
import CourseView from '../../../components/CourseView';

const CoursePage: React.FC = () => {
    return (
        <div style={{
            width: "100%",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <CourseView />
        </div>
    );
};

export default CoursePage;
