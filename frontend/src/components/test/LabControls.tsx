'use client';

import ConnectionStatus from './ConnectionStatus';
import LabActionControls from './LabActionControls';
import type { AvailableUser } from './types';

export interface LabControlsProps {
  isDark: boolean;
  effectivelyOnline: boolean;
  manualOffline: boolean;
  uploadingFile: boolean;
  testMessage: string;
  testRecipientId: string;
  ghostTypingEnabled: boolean;
  availableUsers: AvailableUser[];
  loadingUsers: boolean;
  selectedFile: File | null;
  filePreviewUrl: string | null;
  isUserTyping: boolean;
  isRecipientTyping: boolean;
  isRecipientRecording: boolean;
  isRecipientListeningToMyAudio: string | null;
  onManualOfflineChange: (val: boolean) => void;
  onMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMessageSend: () => void;
  onRecipientChange: (id: string) => void;
  onGhostTypingToggle: (val: boolean) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onPresenceUpdate: (status: 'online' | 'away') => void;
  onPresenceRequest: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileSend: () => void;
  onFileCancelSelection: () => void;
  onVoiceRecording: (blob: Blob, waveform: number[]) => void;
  onVoiceRecordingStart: () => void;
  onVoiceRecordingStop: () => void;
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
        effectivelyOnline={props.effectivelyOnline}
        uploadingFile={props.uploadingFile}
        testMessage={props.testMessage}
        testRecipientId={props.testRecipientId}
        ghostTypingEnabled={props.ghostTypingEnabled}
        availableUsers={props.availableUsers}
        loadingUsers={props.loadingUsers}
        selectedFile={props.selectedFile}
        filePreviewUrl={props.filePreviewUrl}
        onMessageChange={props.onMessageChange}
        onMessageSend={props.onMessageSend}
        onRecipientChange={props.onRecipientChange}
        onGhostTypingToggle={props.onGhostTypingToggle}
        onTypingStart={props.onTypingStart}
        onTypingStop={props.onTypingStop}
        onPresenceUpdate={props.onPresenceUpdate}
        onPresenceRequest={props.onPresenceRequest}
        onFileSelect={props.onFileSelect}
        onFileSend={props.onFileSend}
        onFileCancelSelection={props.onFileCancelSelection}
        onVoiceRecording={props.onVoiceRecording}
        onVoiceRecordingStart={props.onVoiceRecordingStart}
        onVoiceRecordingStop={props.onVoiceRecordingStop}
      />
    </div>
  );
}

