import React from 'react';
import { Layout} from 'antd';

import TasksList from '../components/TasksList';


const { Content } = Layout;

const TasksPage: React.FC = () => {
  return (
    <Layout style={{
      width: "100vw"
    }}>
      <Content style={{ padding: '0 50px' ,display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
   
        <TasksList />
      </Content>
    </Layout>
  );
};

export default TasksPage;
