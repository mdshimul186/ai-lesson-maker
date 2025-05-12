import React from 'react';
import { Layout, Breadcrumb, Button } from 'antd';
import { Link } from 'react-router-dom';
import TasksList from '../components/TasksList';
import { HomeOutlined, UnorderedListOutlined } from '@ant-design/icons';

const { Content } = Layout;

const TasksPage: React.FC = () => {
  return (
    <Layout className="site-layout">
      <Content style={{ padding: '0 50px' }}>
        <Breadcrumb style={{ margin: '16px 0' }}>
          <Breadcrumb.Item>
            <Link to="/"><HomeOutlined /> Home</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <UnorderedListOutlined /> All Tasks
          </Breadcrumb.Item>
        </Breadcrumb>
        <div style={{ marginBottom: '20px' }}>
          <Button type="primary">
            <Link to="/">Back to Video Generator</Link>
          </Button>
        </div>
        <TasksList />
      </Content>
    </Layout>
  );
};

export default TasksPage;
