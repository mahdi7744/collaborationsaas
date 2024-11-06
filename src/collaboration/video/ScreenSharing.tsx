import React, { useCallback, useState } from 'react';
import { useDailyEvent } from '@daily-co/daily-react';
import { DailyCall, DailyEvent } from '@daily-co/daily-js';

interface ScreenSharingProps {
    callObject: DailyCall | null;
}

const ScreenSharing: React.FC<ScreenSharingProps> = ({ callObject }) => {
    const [screenSharingState, setScreenSharingState] = useState<'started' | 'stopped'>('stopped');
    const [error, setError] = useState<string | null>(null); // Track error messages

    // Correct event names with type casting
    useDailyEvent('started-screen-share' as DailyEvent, useCallback(() => {
        setScreenSharingState('started');
        setError(null); // Clear any previous errors on success
    }, []));

    useDailyEvent('stopped-screen-share' as DailyEvent, useCallback(() => {
        setScreenSharingState('stopped');
    }, []));

    // Listen for any errors from Daily, including screen sharing issues
    useDailyEvent('error' as DailyEvent, useCallback((event: any) => {
        if (event?.action === 'start-screen-share' || event?.action === 'stop-screen-share') {
            setError(`Failed to ${event.action === 'start-screen-share' ? 'start' : 'stop'} screen sharing. Please try again.`);
        }
    }, []));

    const startScreenShare = () => {
        if (callObject) {
            callObject.startScreenShare();
        }
    };

    const stopScreenShare = () => {
        if (callObject) {
            callObject.stopScreenShare();
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '8px' }}>Screen Sharing State: {screenSharingState}</div>

            {/* Buttons to start/stop screen sharing */}
            <button onClick={startScreenShare} disabled={screenSharingState === 'started'}>
                Start Screen Share
            </button>
            <button onClick={stopScreenShare} disabled={screenSharingState === 'stopped'}>
                Stop Screen Share
            </button>

            {/* Display error messages if any */}
            {error && <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>}
        </div>
    );
};

export default ScreenSharing;
