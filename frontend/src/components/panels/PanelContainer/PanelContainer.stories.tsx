import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { PanelProvider, usePanels } from '@/contexts/PanelContext';
import PanelContainer from './PanelContainer';
import Button from '@/components/form-controls/Button/Button';

const meta: Meta = {
  title: 'Panels/PanelContainer',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
PanelContainer renders slide-in panels managed by PanelContext.

**Panel config options:**
- \`title\` — header title text
- \`titlePosition\` — \`'center'\` | \`'left'\` | \`'right'\`
- \`subTitle\` — small subtitle below the title (animates in/out)
- \`profileImage\` — avatar shown in the title bar (URL or \`'use-auth-user'\`)
- \`fullWidth\` — \`true\` makes the panel cover the full viewport width
- \`actionIcons\` — array of \`{ icon, onClick, label }\` icon buttons in the header
- Multiple panels stack with depth animation (covered panel slides left + scales down)
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <PanelProvider>
        <div style={{ width: '100vw', height: '100vh', background: '#0f172a', position: 'relative', overflow: 'hidden' }}>
          <Story />
          <PanelContainer />
        </div>
      </PanelProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj;

// ─── Simple panel content ────────────────────────────────────────────────────

function PanelContent({ title }: { title: string }) {
  return (
    <div style={{ padding: '1.5rem', color: '#e2e8f0' }}>
      <h3 style={{ color: '#93c5fd', marginBottom: '1rem' }}>{title}</h3>
      <p style={{ opacity: 0.7, lineHeight: 1.6 }}>
        This is the panel body content. Panels slide in from the right and can be dismissed by
        tapping the back button or the backdrop.
      </p>
      <ul style={{ marginTop: '1rem', opacity: 0.6, paddingLeft: '1.25rem', lineHeight: 2 }}>
        <li>Item one</li>
        <li>Item two</li>
        <li>Item three</li>
      </ul>
    </div>
  );
}

// ─── Stories ─────────────────────────────────────────────────────────────────

/** Basic panel with centred title */
export const Basic: Story = {
  render: () => {
    function Demo() {
      const { openPanel } = usePanels();
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Button variant="primary" onClick={() => openPanel('basic', <PanelContent title="Basic Panel" />, 'Basic Panel')}>
            Open Basic Panel
          </Button>
        </div>
      );
    }
    return <Demo />;
  },
};

/** Title aligned to the left */
export const TitleLeft: Story = {
  render: () => {
    function Demo() {
      const { openPanel } = usePanels();
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Button variant="primary" onClick={() => openPanel('left', <PanelContent title="Left Title Panel" />, 'Settings', 'left')}>
            Open Left-Title Panel
          </Button>
        </div>
      );
    }
    return <Demo />;
  },
};

/** Panel with a subtitle below the title */
export const WithSubtitle: Story = {
  render: () => {
    function Demo() {
      const { openPanel } = usePanels();
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Button variant="primary" onClick={() =>
            openPanel('sub', <PanelContent title="Profile Panel" />, 'Alice Johnson', 'left', 'Online')
          }>
            Open Panel with Subtitle
          </Button>
        </div>
      );
    }
    return <Demo />;
  },
};

/** Panel with a profile image in the title bar */
export const WithProfileImage: Story = {
  render: () => {
    function Demo() {
      const { openPanel } = usePanels();
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Button variant="primary" onClick={() =>
            openPanel(
              'profile',
              <PanelContent title="User Profile" />,
              'Alice Johnson',
              'left',
              'Last seen today at 14:32',
              '/profile/default-profile.jpg'
            )
          }>
            Open Panel with Avatar
          </Button>
        </div>
      );
    }
    return <Demo />;
  },
};

/** Panel with action icon buttons in the header */
export const WithActionIcons: Story = {
  render: () => {
    function Demo() {
      const { openPanel } = usePanels();
      const [log, setLog] = useState<string[]>([]);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
          <Button variant="primary" onClick={() =>
            openPanel(
              'actions',
              <PanelContent title="Panel with Actions" />,
              'Conversation',
              'left',
              undefined,
              undefined,
              undefined,
              [
                { icon: 'fad fa-trash', label: 'Delete', onClick: () => setLog(l => [...l, 'Delete clicked']) },
                { icon: 'fad fa-list', label: 'Logs', onClick: () => setLog(l => [...l, 'Logs clicked']) },
              ]
            )
          }>
            Open Panel with Action Icons
          </Button>
          {log.length > 0 && (
            <div style={{ color: '#93c5fd', fontSize: '0.8rem' }}>
              {log.slice(-3).map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
        </div>
      );
    }
    return <Demo />;
  },
};

/** Full-width panel (covers entire viewport) */
export const FullWidth: Story = {
  render: () => {
    function Demo() {
      const { openPanel } = usePanels();
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Button variant="primary" onClick={() =>
            openPanel('fw', <PanelContent title="Full Width Panel" />, 'Full Width', 'center', undefined, undefined, true)
          }>
            Open Full-Width Panel
          </Button>
        </div>
      );
    }
    return <Demo />;
  },
};

/** Stacked panels — open a second panel from inside the first */
export const StackedPanels: Story = {
  render: () => {
    function InnerContent() {
      const { openPanel } = usePanels();
      return (
        <div style={{ padding: '1.5rem', color: '#e2e8f0' }}>
          <p style={{ opacity: 0.7, marginBottom: '1rem' }}>This is panel one. Open a second panel on top.</p>
          <Button variant="primary" onClick={() =>
            openPanel(
              'panel2',
              <PanelContent title="Panel Two (stacked)" />,
              'Panel Two',
              'center',
              'Stacked on top'
            )
          }>
            Open Second Panel
          </Button>
        </div>
      );
    }
    function Demo() {
      const { openPanel } = usePanels();
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Button variant="primary" onClick={() =>
            openPanel('panel1', <InnerContent />, 'Panel One', 'center')
          }>
            Open First Panel
          </Button>
        </div>
      );
    }
    return <Demo />;
  },
};

/** Three levels deep */
export const ThreeLevelStack: Story = {
  render: () => {
    function Level3Content() {
      return <PanelContent title="Level 3 — deepest panel" />;
    }
    function Level2Content() {
      const { openPanel } = usePanels();
      return (
        <div style={{ padding: '1.5rem', color: '#e2e8f0' }}>
          <p style={{ opacity: 0.7, marginBottom: '1rem' }}>Level 2 panel.</p>
          <Button variant="primary" onClick={() =>
            openPanel('p3', <Level3Content />, 'Level 3', 'left', 'Deepest')
          }>
            Open Level 3
          </Button>
        </div>
      );
    }
    function Level1Content() {
      const { openPanel } = usePanels();
      return (
        <div style={{ padding: '1.5rem', color: '#e2e8f0' }}>
          <p style={{ opacity: 0.7, marginBottom: '1rem' }}>Level 1 panel.</p>
          <Button variant="primary" onClick={() =>
            openPanel('p2', <Level2Content />, 'Level 2', 'left', 'Middle layer')
          }>
            Open Level 2
          </Button>
        </div>
      );
    }
    function Demo() {
      const { openPanel } = usePanels();
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Button variant="primary" onClick={() =>
            openPanel('p1', <Level1Content />, 'Level 1', 'left')
          }>
            Open Level 1
          </Button>
        </div>
      );
    }
    return <Demo />;
  },
};

/** Full kitchen sink — profile image, subtitle, action icons, left title */
export const KitchenSink: Story = {
  render: () => {
    function Demo() {
      const { openPanel } = usePanels();
      const [log, setLog] = useState<string[]>([]);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
          <Button variant="primary" onClick={() =>
            openPanel(
              'ks',
              <PanelContent title="Full featured panel" />,
              'Alice Johnson',
              'left',
              'Active now',
              '/profile/default-profile.jpg',
              false,
              [
                { icon: 'fad fa-trash', label: 'Delete conversation', onClick: () => setLog(l => [...l, 'Delete']) },
                { icon: 'fad fa-list', label: 'View logs', onClick: () => setLog(l => [...l, 'Logs']) },
              ]
            )
          }>
            Open Kitchen Sink Panel
          </Button>
          {log.length > 0 && (
            <div style={{ color: '#93c5fd', fontSize: '0.8rem' }}>
              {log.slice(-3).map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
        </div>
      );
    }
    return <Demo />;
  },
};

/** closeAllPanels — open two panels then close all at once */
export const CloseAll: Story = {
  render: () => {
    function Demo() {
      const { openPanel, closeAllPanels } = usePanels();
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => {
            openPanel('ca1', <PanelContent title="Panel One" />, 'Panel One');
            setTimeout(() => openPanel('ca2', <PanelContent title="Panel Two" />, 'Panel Two'), 350);
          }}>
            Open Two Panels
          </Button>
          <Button variant="danger" onClick={closeAllPanels}>
            Close All Panels
          </Button>
        </div>
      );
    }
    return <Demo />;
  },
};
