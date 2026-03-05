'use client';

import { usePanels } from '@/contexts/PanelContext';
import { Panel1Content } from '@/components/panels/DemoPanels/DemoPanels';

export default function TestPage() {
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
          <i className="fad fa-flask" style={{ fontSize: '64px', marginBottom: '20px' }}></i>
          <h2 style={{ fontSize: '24px', marginBottom: '10px', color: 'inherit' }}>No Tests Yet</h2>
          <p style={{ fontSize: '16px', opacity: 0.7 }}>Test page</p>
        </div>
      </div>
  );
}
