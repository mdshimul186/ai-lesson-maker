import { useRef } from 'react';
import { useVideoStore } from "../../stores/index";
import styles from './index.module.css'
export default function VideoResult() {

    const { videoUrl ,isLoading,error} = useVideoStore();
    const videoRef = useRef<HTMLVideoElement>(null);
    // Only render when there's loading, error, or a video URL
    if (!videoUrl && !isLoading && !error) {
        return null;
    }
    return (
        <div className={styles.videoResultContainer}>
            <div className={styles.videoTitle}>Video Result</div>
            {/* Loading state */}
            {isLoading && (
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner} />
                </div>
            )}
            {/* Error state */}
            {error && (
                <div className={styles.errorMessage}>{error}</div>
            )}
            {/* Video player */}
            {!isLoading && !error && videoUrl && (
                <div className={styles.videoContainer} key={videoUrl}>
                    <video ref={videoRef} controls className={styles.videoEl}>
                        <source src={videoUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </div>
            )}

        </div>
    )
}