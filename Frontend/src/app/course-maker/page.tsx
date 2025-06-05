'use client';

import React from 'react';
import CourseMaker from '../../components/CourseMaker';

const CourseMakerPage: React.FC = () => {
    return (
        <div style={{
            width: "100%",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <CourseMaker />
        </div>
    );
};

export default CourseMakerPage;
