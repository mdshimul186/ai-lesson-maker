'use client';

import React from 'react';
import { Layout } from 'antd';
import TasksList from '../../components/TasksList';

const { Content } = Layout;

export default function TasksPage() {
  return (
    <Layout style={{
      width: "100vw"
    }}>
      <Content style={{ padding: '0 50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <TasksList />
      </Content>
    </Layout>
  );
}
