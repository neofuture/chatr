import { render, screen, fireEvent } from '@testing-library/react';
import MessageInput from './MessageInput';

const mockSend = jest.fn();
const mockSetText = jest.fn();

jest.mock('@/hooks/useMessageInput', () => ({
  useMessageInput: () => ({
    message: '',
    selectedFiles: [],
    filePreviews: [],
    uploadingFile: false,
    effectivelyOnline: true,
    handleMessageChange: mockSetText,
    handleSend: mockSend,
    handleEmojiInsert: jest.fn(),
    handleFileSelect: jest.fn(),
    cancelFileSelection: jest.fn(),
    sendFiles: jest.fn(),
    handleVoiceRecording: jest.fn(),
    handleVoiceRecordingStart: jest.fn(),
    handleVoiceRecordingStop: jest.fn(),
  }),
}));

jest.mock('@/hooks/useGroupMessageInput', () => ({
  useGroupMessageInput: () => ({
    message: '',
    selectedFiles: [],
    filePreviews: [],
    uploadingFile: false,
    effectivelyOnline: true,
    handleMessageChange: jest.fn(),
    handleSend: jest.fn(),
    handleEmojiInsert: jest.fn(),
    handleFileSelect: jest.fn(),
    cancelFileSelection: jest.fn(),
    sendFiles: jest.fn(),
    handleVoiceRecording: jest.fn(),
    handleVoiceRecordingStart: jest.fn(),
    handleVoiceRecordingStop: jest.fn(),
  }),
}));

jest.mock('@/components/VoiceRecorder', () => ({
  __esModule: true,
  default: () => <div data-testid="voice-recorder" />,
}));

jest.mock('@/components/EmojiPicker/EmojiPicker', () => ({
  __esModule: true,
  default: () => <div data-testid="emoji-picker" />,
}));

describe('MessageInput', () => {
  it('renders textarea', () => {
    render(<MessageInput isDark={false} recipientId="u1" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows placeholder when no recipient', () => {
    render(<MessageInput isDark={false} />);
    expect(screen.getByText(/Select a conversation to start messaging/)).toBeInTheDocument();
  });

  it('renders send button when recipientId provided', () => {
    render(<MessageInput isDark={false} recipientId="u1" />);
    expect(screen.getByTitle('Send message')).toBeInTheDocument();
  });

  it('shows reply banner when replyingTo is set', () => {
    const replyMsg = {
      id: 'msg1',
      content: 'Hello there',
      senderId: 'u2',
      senderDisplayName: 'Alice',
    };
    render(<MessageInput isDark={false} recipientId="u1" replyingTo={replyMsg as any} />);
    expect(screen.getByText(/Replying to Alice/)).toBeInTheDocument();
    expect(screen.getByText('Hello there')).toBeInTheDocument();
  });

  it('shows edit banner when editingMessage is set', () => {
    const editMsg = {
      id: 'msg2',
      content: 'Edit this message',
      senderId: 'me',
    };
    render(<MessageInput isDark={false} recipientId="u1" editingMessage={editMsg as any} />);
    expect(screen.getByText('Editing message')).toBeInTheDocument();
    expect(screen.getByText('Edit this message')).toBeInTheDocument();
  });

  it('calls onCancelReply when cancel clicked on reply banner', () => {
    const onCancelReply = jest.fn();
    const replyMsg = {
      id: 'msg1',
      content: 'Hello there',
      senderId: 'u2',
      senderDisplayName: 'Alice',
    };
    render(
      <MessageInput isDark={false} recipientId="u1" replyingTo={replyMsg as any} onCancelReply={onCancelReply} />,
    );
    fireEvent.click(screen.getByTitle('Cancel reply'));
    expect(onCancelReply).toHaveBeenCalled();
  });

  it('calls onCancelEdit when cancel clicked on edit banner', () => {
    const onCancelEdit = jest.fn();
    const editMsg = {
      id: 'msg2',
      content: 'Edit this',
      senderId: 'me',
    };
    render(
      <MessageInput isDark={false} recipientId="u1" editingMessage={editMsg as any} onCancelEdit={onCancelEdit} />,
    );
    fireEvent.click(screen.getByTitle('Cancel edit'));
    expect(onCancelEdit).toHaveBeenCalled();
  });
});
