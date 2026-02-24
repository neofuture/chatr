'use client';

import { usePanels } from '@/contexts/PanelContext';
import { Panel1Content } from '@/components/panels/DemoPanels/DemoPanels';

export default function GroupsPage() {
  const { openPanel } = usePanels();

  const openDemoPanel = () => {
    openPanel('Panel Demo', <Panel1Content />);
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <i className="fad fa-users" style={{ fontSize: '64px', marginBottom: '20px' }}></i>
        <h2 style={{ fontSize: '24px', marginBottom: '10px', color: 'inherit' }}>No Groups Yet</h2>
        <p style={{ fontSize: '16px', opacity: 0.7 }}>Create a group to chat with multiple people</p>
      </div>
    </div>
  );
}
