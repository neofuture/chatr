'use client';

import { usePanels } from '@/contexts/PanelContext';
import { Panel1Content } from '@/components/panels/DemoPanels/DemoPanels';

export default function UpdatesPage() {
  const { openPanel } = usePanels();

  const openDemoPanel = () => {
    openPanel('Panel Demo', <Panel1Content />);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      padding: '20px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <i className="fad fa-newspaper" style={{ fontSize: '64px', marginBottom: '20px' }}></i>
        <h2 style={{ fontSize: '24px', marginBottom: '10px', color: 'inherit' }}>Coming Soon</h2>
        <p style={{ fontSize: '16px', opacity: 0.7 }}>Product updates and announcements will appear here</p>
      </div>
    </div>
  );
}
