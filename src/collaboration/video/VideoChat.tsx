import React, { useEffect, useRef, useState } from 'react';
import { DailyCall } from '@daily-co/daily-js';

interface VideoChatProps {
    callObject: DailyCall | null;
}

const VideoChat: React.FC<VideoChatProps> = ({ callObject }) => {
    const videoRef = useRef<HTMLDivElement>(null);
    const [isConnected, setIsConnected] = useState(false); // Track connection state
    const [error, setError] = useState<string | null>(null); // Track any error messages

    useEffect(() => {
        if (callObject && videoRef.current) {
            try {
                callObject.setLocalVideo(true); // Start the local video
                setIsConnected(true); // Update connection status
            } catch (e) {
                setError('Failed to start video. Please try again.'); // Set error message
            }
        }

        return () => {
            if (callObject) {
                callObject.setLocalVideo(false); // Stop the video on cleanup
                setIsConnected(false); // Reset connection status
            }
        };
    }, [callObject]);

    return (
        <div>
            {/* Display video stream */}
            <div ref={videoRef} style={{ width: '100%', height: 'auto', backgroundColor: '#000' }} />

            {/* Connection status and error messages */}
            <div style={{ marginTop: '8px', color: isConnected ? 'green' : 'red' }}>
                {isConnected ? 'Video connected' : 'Not connected'}
            </div>
            {error && <div style={{ color: 'red' }}>{error}</div>}
        </div>
    );
};

export default VideoChat;
