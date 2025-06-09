'use client';

import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  RotateCw, 
  Clock, 
  Info 
} from 'lucide-react';
import { useTaskProgress } from '../../hooks/useTaskProgress';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

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
    return <p className="text-sm text-gray-500">Loading task status...</p>;
  }

  if (!task) {
    return <p className="text-sm text-yellow-600">Task not found</p>;
  }

  // If task is completed, just show the final status without progress bar
  if (task.status === 'COMPLETED') {
    return (
      <div className="w-full">
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
          <span className="text-sm text-green-600">100%</span>
        </div>
      </div>
    );
  }

  // Determine status display
  const getStatusDisplay = () => {
    switch (task.status) {
      case 'COMPLETED':
        return { 
          variant: 'bg-green-500' as const,
          icon: CheckCircle, 
          text: 'Completed' 
        };
      case 'FAILED':
        return { 
          variant: 'bg-red-500' as const,
          icon: XCircle, 
          text: 'Failed' 
        };
      case 'IN_PROGRESS':
        return { 
          variant: 'bg-blue-500' as const,
          icon: RotateCw, 
          text: 'Processing' 
        };
      case 'PENDING':
        return { 
          variant: 'bg-yellow-500' as const,
          icon: Clock, 
          text: 'Pending' 
        };
      case 'QUEUED':
        return { 
          variant: 'bg-gray-500' as const,
          icon: Clock, 
          text: 'Queued' 
        };
      default:
        return { 
          variant: 'bg-gray-500' as const,
          icon: Info, 
          text: task.status 
        };
    }
  };

  const status = getStatusDisplay();
  const progressPercent = task.progress ? Math.round(task.progress * 100) : 0;
  const IconComponent = status.icon;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <Badge className={`${status.variant} text-white`}>
          <IconComponent className={`w-3 h-3 mr-1 ${task.status === 'IN_PROGRESS' ? 'animate-spin' : ''}`} />
          {status.text}
        </Badge>
        <span className="text-sm text-gray-600">{progressPercent}%</span>
      </div>
      
      <Progress 
        value={progressPercent}
        className={`w-full ${task.status === 'FAILED' ? 'progress-error' : ''}`}
      />
      
      {showDetails && task.events && task.events.length > 0 && (
        <div className="mt-4">
          <p className="font-medium text-sm mb-2">Progress Updates:</p>
          <div className="space-y-2">
            {task.events.slice(-5).map((event: any, index: number) => (
              <div key={index} className="flex items-start space-x-2 p-2 bg-muted dark:bg-card rounded text-sm">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  event.status === 'COMPLETED' ? 'bg-green-500' :
                  event.status === 'FAILED' ? 'bg-red-500' :
                  event.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                  'bg-gray-400'
                }`} />
                <div className="flex-1">
                  <p className="text-gray-800">{event.message}</p>
                  {event.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskProgress;
