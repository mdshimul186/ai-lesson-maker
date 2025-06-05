import { useState, useEffect, useRef } from 'react';
import { getTaskStatus } from '../services';

/**
 * Custom hook to track task progress with automatic polling
 * @param taskId - The ID of the task to track
 * @param interval - Polling interval in milliseconds (default: 5000)
 * @param enabled - Whether polling is enabled (default: true)
 * @returns Object containing task data, loading state, and error
 */
export const useTaskProgress = (taskId?: string, interval = 5000, enabled = true) => {
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  // Function to fetch task status
  const fetchTaskStatus = async () => {
    // Don't fetch if no taskId or already loading or disabled
    if (!taskId || !enabled || loading) {
      return;
    }

    // Don't fetch if task is already completed
    if (task && task.status === 'COMPLETED') {
      return;
    }

    // Throttle requests - skip if less than 2 seconds since last request
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 2000) {
      return;
    }
    
    lastFetchTimeRef.current = now;
    setLoading(true);

    try {
      const taskData = await getTaskStatus(taskId);
      setTask(taskData);
      setError(null);
    } catch (err) {
      console.error('Error fetching task status:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch task status'));
    } finally {
      setLoading(false);
    }
  };
  // Effect to start/stop polling
  useEffect(() => {
    // Initial fetch
    if (taskId && enabled) {
      fetchTaskStatus();
    }

    // Start polling interval only if task is not completed
    if (taskId && enabled && !intervalRef.current && (!task || task.status !== 'COMPLETED')) {
      intervalRef.current = window.setInterval(fetchTaskStatus, interval);
    }

    // Stop polling if task is completed
    if (task && task.status === 'COMPLETED' && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [taskId, enabled, interval, task?.status]);

  // If taskId changes, fetch immediately
  useEffect(() => {
    if (taskId) {
      fetchTaskStatus();
    } else {
      setTask(null);
    }
  }, [taskId]);

  return {
    task,
    loading,
    error,
    refetch: fetchTaskStatus
  };
};
