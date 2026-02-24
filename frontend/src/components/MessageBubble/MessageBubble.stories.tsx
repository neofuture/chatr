import type { Meta, StoryObj } from '@storybook/react';
import { useRef, useEffect, useState } from 'react';
import MessageBubble, { type Message } from './MessageBubble';
import { extractWaveformFromFile } from '@/utils/extractWaveform';

const meta: Meta<typeof MessageBubble> = {
  title: 'Messaging/MessageBubble',
  component: MessageBubble,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Renders a list of direct messages with support for text, image, file, audio, reactions, replies, edit history, and unsent states.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const now = new Date('2026-01-15T14:30:00Z');
const earlier = new Date('2026-01-15T14:28:00Z');
const evenEarlier = new Date('2026-01-15T14:25:00Z');

const sentBase: Message = {
  id: '1',
  content: 'Hey! How are you doing?',
  senderId: 'me',
  recipientId: 'them',
  direction: 'sent',
  status: 'read',
  timestamp: evenEarlier,
  type: 'text',
  senderDisplayName: 'You',
};

const receivedBase: Message = {
  id: '2',
  content: "I'm doing great, thanks for asking! What about you?",
  senderId: 'them',
  senderDisplayName: 'Alice',
  senderUsername: '@alice',
  senderProfileImage: '/profile/default-profile.jpg',
  recipientId: 'me',
  direction: 'received',
  status: 'delivered',
  timestamp: earlier,
  type: 'text',
};

function Wrapper(props: Partial<React.ComponentProps<typeof MessageBubble>> & { minHeight?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { minHeight = '400px', ...rest } = props;
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1rem', minHeight }}>
      <MessageBubble
        messages={[sentBase, receivedBase]}
        currentUserId="me"
        messagesEndRef={ref}
        onImageClick={() => {}}
        onAudioPlayStatusChange={() => {}}
        listeningMessageIds={new Set()}
        {...rest}
      />
      <div ref={ref} />
    </div>
  );
}

export const Conversation: Story = {
  render: () => <Wrapper />,
};

export const SentAndReceived: Story = {
  render: () => (
    <Wrapper
      messages={[
        sentBase,
        receivedBase,
        { ...sentBase, id: '3', content: 'All good here too 😊', timestamp: now, status: 'delivered' },
      ]}
    />
  ),
};

export const WithReactions: Story = {
  render: () => (
    <Wrapper
      messages={[
        {
          ...sentBase,
          reactions: [
            { userId: 'them', username: '@alice', emoji: '❤️' },
            { userId: 'other', username: '@bob', emoji: '😂' },
          ],
        },
        receivedBase,
      ]}
    />
  ),
};

export const WithReply: Story = {
  render: () => (
    <Wrapper
      messages={[
        sentBase,
        {
          ...receivedBase,
          id: '3',
          content: 'Replying to that!',
          replyTo: {
            id: sentBase.id,
            content: sentBase.content,
            senderUsername: '@you',
          },
        },
      ]}
    />
  ),
};

export const ImageMessage: Story = {
  render: () => (
    <Wrapper
      messages={[
        {
          ...sentBase,
          type: 'image',
          content: 'photo.jpg',
          fileUrl: '/cover/default-cover.jpg',
          fileName: 'default-cover.jpg',
          fileType: 'image/jpeg',
        },
      ]}
    />
  ),
};

export const FileMessage: Story = {
  render: () => (
    <Wrapper
      messages={[
        {
          ...sentBase,
          type: 'file',
          content: 'report.pdf',
          fileUrl: '/uploads/report.pdf',
          fileName: 'report.pdf',
          fileSize: 204800,
          fileType: 'application/pdf',
        },
      ]}
    />
  ),
};

export const EditedMessage: Story = {
  render: () => (
    <Wrapper
      messages={[
        { ...sentBase, content: 'This message was edited ✏️', edited: true, editedAt: now },
      ]}
    />
  ),
};

export const UnsentMessage: Story = {
  render: () => (
    <Wrapper
      messages={[
        { ...sentBase, content: '', unsent: true },
        receivedBase,
      ]}
    />
  ),
};

export const TypingIndicator: Story = {
  render: () => (
    <Wrapper
      messages={[sentBase, receivedBase]}
      isRecipientTyping={true}
      minHeight="500px"
    />
  ),
};

export const RecordingIndicator: Story = {
  render: () => (
    <Wrapper
      messages={[sentBase, receivedBase]}
      isRecipientRecording={true}
      minHeight="500px"
    />
  ),
};

export const LongConversation: Story = {
  render: () => (
    <Wrapper
      messages={Array.from({ length: 12 }, (_, i) => ({
        ...(i % 2 === 0 ? sentBase : receivedBase),
        id: String(i + 1),
        content: i % 2 === 0
          ? `Sent message ${Math.ceil((i + 1) / 2)}: Lorem ipsum dolor sit amet.`
          : `Received message ${Math.ceil((i + 1) / 2)}: Consectetur adipiscing elit.`,
        timestamp: new Date(now.getTime() - (12 - i) * 60000),
      }))}
      minHeight="600px"
    />
  ),
};

function AudioWaveformStory() {
  const [waveform, setWaveform] = useState<number[]>([]);
  const [duration, setDuration] = useState<number>(12);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadWaveform() {
      try {
        const res = await fetch('/audio/I%20look%20in%20the%20mirror%20(Acoustic%20Mix).mp3');
        const blob = await res.blob();
        const file = new File([blob], 'I look in the mirror (Acoustic Mix).mp3', { type: 'audio/mpeg' });
        const { waveform: generated, duration: dur } = await extractWaveformFromFile(file);
        if (!cancelled) {
          setWaveform(generated);
          setDuration(Math.round(dur));
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to generate waveform for story:', err);
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadWaveform();
    return () => { cancelled = true; };
  }, []);

  if (loading || waveform.length === 0) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1rem', minHeight: '300px', color: '#94a3b8' }}>
        Generating waveform…
      </div>
    );
  }

  const audioMessage: Message = {
    ...sentBase,
    type: 'audio',
    content: 'I look in the mirror (Acoustic Mix).mp3',
    fileUrl: '/audio/I%20look%20in%20the%20mirror%20(Acoustic%20Mix).mp3',
    fileName: 'I look in the mirror (Acoustic Mix).mp3',
    fileType: 'audio/mpeg',
    duration,
    waveformData: waveform,
  };

  return (
    <Wrapper
      messages={[audioMessage]}
      minHeight="400px"
    />
  );
}

export const AudioMessage: Story = {
  render: () => <AudioWaveformStory />,
};
