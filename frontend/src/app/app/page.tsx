'use client';

import { usePanels } from '@/contexts/PanelContext';
import { Panel1Content } from '@/components/panels/DemoPanels/DemoPanels';

export default function AppPage() {
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
        <i className="fad fa-comments" style={{ fontSize: '64px', marginBottom: '20px' }}></i>
        <h2 style={{ fontSize: '24px', marginBottom: '10px', color: 'inherit' }}>No Chats Yet</h2>
        <p style={{ fontSize: '16px', opacity: 0.7, marginBottom: '20px' }}>Your conversations will appear here</p>
        <button
          onClick={openDemoPanel}
          style={{
            padding: '12px 24px',
            backgroundColor: '#f97316',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f97316'}
        >
          Open Panel Demo
        </button>
      </div>
    </div>
  );
}
