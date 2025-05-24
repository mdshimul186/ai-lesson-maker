import { create } from 'zustand'
import { Task } from '../services/index'
export { useAuthStore } from './useAuthStore';
export { useAccountStore } from './useAccountStore';

interface VideoStore {
    videoUrl: string;
    isLoading: boolean;
    error: string | null;
    taskStatus: Task | null;
    setVideoUrl: (url: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setTaskStatus: (status: Task | null) => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  videoUrl: "",
  isLoading: false,
  error: null,
  taskStatus: null,
  setVideoUrl: (url: string) => set({ videoUrl: url }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  setTaskStatus: (status: Task | null) => set({ taskStatus: status })
}))