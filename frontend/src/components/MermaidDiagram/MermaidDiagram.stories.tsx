import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import dynamic from 'next/dynamic';

// MermaidDiagram must be loaded client-side only
const MermaidDiagram = dynamic(() => import('./MermaidDiagram'), { ssr: false });

const meta: Meta = {
  title: 'Utility/MermaidDiagram',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Renders a Mermaid diagram from a chart string. Loaded dynamically (no SSR) to avoid build-time bundling issues.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Flowchart: StoryObj = {
  render: () => (
    <div style={{ padding: 24, background: '#1e293b', borderRadius: 12, minWidth: 400 }}>
      <MermaidDiagram chart={`flowchart TD
    A[User sends message] --> B{WebSocket connected?}
    B -- Yes --> C[Emit message:send]
    B -- No --> D[Queue message]
    C --> E[Server broadcasts to recipient]
    E --> F[Recipient receives message]`} />
    </div>
  ),
};

export const SequenceDiagram: StoryObj = {
  render: () => (
    <div style={{ padding: 24, background: '#1e293b', borderRadius: 12, minWidth: 400 }}>
      <MermaidDiagram chart={`sequenceDiagram
    participant C as Client
    participant S as Server
    C->>S: connect (token)
    S-->>C: presence:update
    C->>S: message:send
    S-->>C: message:ack
    S-->>C: message:received (other party)`} />
    </div>
  ),
};

export const ERDiagram: StoryObj = {
  render: () => (
    <div style={{ padding: 24, background: '#1e293b', borderRadius: 12, minWidth: 400 }}>
      <MermaidDiagram chart={`erDiagram
    USER ||--o{ MESSAGE : sends
    USER ||--o{ MESSAGE : receives
    MESSAGE ||--o{ REACTION : has
    MESSAGE ||--o{ MESSAGE_EDIT : has`} />
    </div>
  ),
};

