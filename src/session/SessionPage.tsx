import React from 'react';
import VideoChat from '../collaboration/video/VideoChat';
import ScreenSharing from '../collaboration/video/ScreenSharing';
import Annotations from '../collaboration/annotation/Annotations';
import { DailyCall } from '@daily-co/daily-js';

interface SessionPageProps {
  callObject: DailyCall;  // Correctly typing the callObject prop
}

const SessionPage: React.FC<SessionPageProps> = ({ callObject }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
            <div style={{ flex: 2, height: '100%' }}>
                <VideoChat callObject={callObject} />
                <ScreenSharing callObject={callObject} />
            </div>
            <div style={{ flex: 1, height: '100%' }}>
                <Annotations />
            </div>
        </div>
    );
};

export default SessionPage;
