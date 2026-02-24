'use client';

import ConnectionStatus from './ConnectionStatus';
import LabActionControls from './LabActionControls';

export interface LabControlsProps {
  isDark: boolean;
  effectivelyOnline: boolean;
  manualOffline: boolean;
  testRecipientId: string;
  ghostTypingEnabled: boolean;
  isUserTyping: boolean;
  isRecipientTyping: boolean;
  isRecipientRecording: boolean;
  isRecipientListeningToMyAudio: string | null;
  onManualOfflineChange: (val: boolean) => void;
  onGhostTypingToggle: (val: boolean) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onPresenceUpdate: (status: 'online' | 'away') => void;
  onPresenceRequest: () => void;
}

export default function LabControls(props: LabControlsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <ConnectionStatus
        isDark={props.isDark}
        effectivelyOnline={props.effectivelyOnline}
        manualOffline={props.manualOffline}
        isUserTyping={props.isUserTyping}
        isRecipientTyping={props.isRecipientTyping}
        isRecipientRecording={props.isRecipientRecording}
        isRecipientListeningToMyAudio={props.isRecipientListeningToMyAudio}
        onManualOfflineChange={props.onManualOfflineChange}
      />
      <LabActionControls
        isDark={props.isDark}
        testRecipientId={props.testRecipientId}
        ghostTypingEnabled={props.ghostTypingEnabled}
        onGhostTypingToggle={props.onGhostTypingToggle}
      />
    </div>
  );
}
