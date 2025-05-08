import { create } from 'zustand'

interface VideoStore {
    videoUrl: string;
    isLoading: boolean;
    error: string | null;
    setVideoUrl: (url: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  videoUrl: "",
  isLoading: false,
  error: null,
  setVideoUrl: (url: string) => set({ videoUrl: url }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error })
}))