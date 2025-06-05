import React from 'react';
import { Progress, Tag, Typography, Space, Timeline } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  SyncOutlined, 
  ClockCircleOutlined, 
  InfoCircleOutlined 
} from '@ant-design/icons';
import { useTaskProgress } from '../../hooks/useTaskProgress';

const { Text } = Typography;

interface TaskProgressProps {
  taskId?: string;
  showDetails?: boolean;
  interval?: number;
}

const TaskProgress: React.FC<TaskProgressProps> = ({ 
  taskId, 
  showDetails = false, 
  interval = 5000
}) => {
  // Only enable polling if task is not completed
  const { task, loading } = useTaskProgress(
    taskId, 
    interval, 
    !!taskId
  );

  if (!taskId) {
    return null;
  }

  if (!task && loading) {
    return <Text type="secondary">Loading task status...</Text>;
  }

  if (!task) {
    return <Text type="warning">Task not found</Text>;
  }

  // If task is completed, just show the final status without progress bar
  if (task.status === 'COMPLETED') {
    return (
      <div style={{ width: '100%' }}>
        <Space>
          <Tag color="success" icon={<CheckCircleOutlined />}>Completed</Tag>
          <Text type="success">100%</Text>
        </Space>
      </div>
    );
  }

  // Determine status color and icon
  const getStatusDisplay = () => {
    switch (task.status) {
      case 'COMPLETED':
        return { 
          color: 'success', 
          icon: <CheckCircleOutlined />, 
          text: 'Completed' 
        };
      case 'FAILED':
        return { 
          color: 'error', 
          icon: <CloseCircleOutlined />, 
          text: 'Failed' 
        };
      case 'IN_PROGRESS':
        return { 
          color: 'processing', 
          icon: <SyncOutlined spin />, 
          text: 'Processing' 
        };
      case 'PENDING':
        return { 
          color: 'warning', 
          icon: <ClockCircleOutlined />, 
          text: 'Pending' 
        };
      case 'QUEUED':
        return { 
          color: 'default', 
          icon: <ClockCircleOutlined />, 
          text: 'Queued' 
        };
      default:
        return { 
          color: 'default', 
          icon: <InfoCircleOutlined />, 
          text: task.status 
        };
    }
  };

  const status = getStatusDisplay();
  const progressPercent = task.progress ? Math.round(task.progress * 100) : 0;

  return (
    <div style={{ width: '100%' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tag color={status.color} icon={status.icon}>{status.text}</Tag>
          <Text type="secondary">{progressPercent}%</Text>
        </div>
        
        <Progress 
          percent={progressPercent}
          status={
            task.status === 'FAILED' ? 'exception' :
            task.status === 'COMPLETED' ? 'success' :
            'active'
          }
          size="small"
        />
        
        {showDetails && task.events && task.events.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong>Progress Updates:</Text>
            <Timeline style={{ marginTop: 8 }}>
              {task.events.slice(-5).map((event: any, index: number) => (
                <Timeline.Item key={index} color={
                  event.status === 'COMPLETED' ? 'green' :
                  event.status === 'FAILED' ? 'red' :
                  event.status === 'IN_PROGRESS' ? 'blue' :
                  'gray'
                }>
                  <Text>{event.message}</Text>
                  {event.timestamp && (
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {new Date(event.timestamp).toLocaleString()}
                      </Text>
                    </div>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        )}
      </Space>
    </div>
  );
};

export default TaskProgress;
