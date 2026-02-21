'use client';

import { usePanels } from '@/contexts/PanelContext';
import { useEffect, useState } from 'react';

export function Panel1Content() {
  const { openPanel } = usePanels();

  const openPanel2 = () => {
    openPanel('Panel 2', <Panel2Content />);
  };

  const openLeftAlignedPanel = () => {
    openPanel('left-aligned', <LeftAlignedPanelContent />, 'Profile Settings', 'left', 'Configure your account');
  };

  const openProfilePanel = () => {
    openPanel('profile', <ProfilePanelContent />, 'John Doe', 'left', 'Online', '/profile/default-profile.jpg');
  };

  const openFullWidthPanel = () => {
    openPanel('fullwidth', <FullWidthPanelContent />, 'Full Width Panel', 'center', undefined, undefined, true);
  };

  const openActionHeaderPanel = () => {
    openPanel(
      'action-header',
      <ActionHeaderPanelContent />,
      'John Doe',
      'left',
      'Online',
      'use-auth-user', // Use dynamic profile image
      false,
      [
        {
          icon: 'far fa-video',
          onClick: () => alert('Video call clicked!'),
          label: 'Video Call'
        },
        {
          icon: 'far fa-phone',
          onClick: () => alert('Audio call clicked!'),
          label: 'Audio Call'
        }
      ]
    );
  };

  const openSubtitleTogglePanel = () => {
    openPanel(
      'subtitle-toggle',
      <SubtitleTogglePanelContent />,
      'Dynamic Title',
      'left',
      'Initial Subtitle',
      'use-auth-user',
      false,
      [
        { icon: 'far fa-cog', onClick: () => alert('Settings clicked'), label: 'Settings' }
      ]
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h3 style={{ color: 'var(--blue-100)', marginBottom: '1rem' }}>Panel 1</h3>
      <p style={{ color: 'var(--blue-300)', marginBottom: '2rem' }}>
        This is the first panel. Click the button below to open Panel 2 on top of this one.
      </p>

      <button onClick={openPanel2} className="btn btn-primary" style={{ marginBottom: '1rem' }}>
        Open Panel 2 ›
      </button>

      <button onClick={openLeftAlignedPanel} className="btn btn-primary" style={{ marginBottom: '1rem' }}>
        Open Left-Aligned with Subtitle ›
      </button>

      <button onClick={openProfilePanel} className="btn btn-primary" style={{ marginBottom: '1rem' }}>
        Open Panel with Profile Image ›
      </button>

      <button onClick={openFullWidthPanel} className="btn btn-primary">
        Open Full Width Panel ›
      </button>

      <button onClick={openActionHeaderPanel} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
        Open Panel with Header Icons ›
      </button>

      <button onClick={openSubtitleTogglePanel} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
        Open Subtitle Toggle Demo ›
      </button>

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem' }}>
        <h4 style={{ color: 'var(--orange-500)', marginBottom: '0.5rem' }}>Demo Features:</h4>
        <ul style={{ color: 'var(--blue-300)', fontSize: '0.875rem', paddingLeft: '1.5rem' }}>
          <li>All panels slide in from the right</li>
          <li>Full-width panels use 100vw (entire screen)</li>
          <li>Each panel stacks on top of previous ones</li>
          <li>Backdrop darkens with each layer</li>
          <li>Chevron (‹) closes the top panel</li>
          <li>Clicking backdrop closes top panel</li>
          <li>Title can be centered, left, or right aligned</li>
          <li>Optional subtitle support</li>
          <li>Optional profile image display</li>
        </ul>
      </div>
    </div>
  );
}

export function Panel2Content() {
  const { openPanel } = usePanels();

  const openPanel3 = () => {
    openPanel('Panel 3', <Panel3Content />);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h3 style={{ color: 'var(--blue-100)', marginBottom: '1rem' }}>Panel 2</h3>
      <p style={{ color: 'var(--blue-300)', marginBottom: '2rem' }}>
        This is the second panel, stacked on top of Panel 1. Notice how Panel 1 is still visible behind the backdrop.
      </p>

      <button onClick={openPanel3} className="btn btn-primary">
        Open Panel 3 ›
      </button>

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
        <p style={{ color: 'var(--orange-500)', fontSize: '0.875rem' }}>
          <strong>Try this:</strong> Click the chevron (‹) to close this panel and return to Panel 1.
        </p>
      </div>
    </div>
  );
}

export function Panel3Content() {
  const { openPanel } = usePanels();

  const openPanel4 = () => {
    openPanel('Panel 4', <Panel4Content />);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h3 style={{ color: 'var(--blue-100)', marginBottom: '1rem' }}>Panel 3</h3>
      <p style={{ color: 'var(--blue-300)', marginBottom: '2rem' }}>
        Three panels deep! The system handles as many panels as you need.
      </p>

      <button onClick={openPanel4} className="btn btn-primary">
        Open Panel 4 (Final Level) ›
      </button>

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
        <p style={{ color: '#a855f7', fontSize: '0.875rem' }}>
          Each panel has its own z-index level, ensuring proper stacking order.
        </p>
      </div>
    </div>
  );
}

export function Panel4Content() {
  const { closeAllPanels } = usePanels();

  return (
    <div style={{ padding: '2rem' }}>
      <h3 style={{ color: 'var(--blue-100)', marginBottom: '1rem' }}>Panel 4 - Maximum Depth!</h3>
      <p style={{ color: 'var(--blue-300)', marginBottom: '2rem' }}>
        You've reached the deepest panel in this demo. You can close all panels at once or go back one by one.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button onClick={closeAllPanels} className="btn btn-primary">
          Close All Panels
        </button>

        <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <h4 style={{ color: '#22c55e', marginBottom: '0.5rem', fontSize: '0.875rem' }}><i className="fas fa-check"></i> Panel System Ready!</h4>
          <p style={{ color: 'var(--blue-300)', fontSize: '0.875rem' }}>
            This panel system can be used throughout the app for:
          </p>
          <ul style={{ color: 'var(--blue-300)', fontSize: '0.875rem', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>User profiles</li>
            <li>Settings</li>
            <li>Chat details</li>
            <li>Image viewers</li>
            <li>Any nested navigation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function LeftAlignedPanelContent() {
  const { openPanel } = usePanels();

  const openRightAlignedPanel = () => {
    openPanel('right-aligned', <RightAlignedPanelContent />, 'User Profile', 'right', 'John Doe');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h3 style={{ color: 'var(--blue-100)', marginBottom: '1rem' }}>Left-Aligned Title Demo</h3>
      <p style={{ color: 'var(--blue-300)', marginBottom: '2rem' }}>
        This panel demonstrates a left-aligned title with a subtitle. Perfect for profile or settings pages where you want the title to align with the content below.
      </p>

      <button onClick={openRightAlignedPanel} className="btn btn-primary">
        Open Right-Aligned Panel ›
      </button>

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
        <h4 style={{ color: 'var(--orange-500)', marginBottom: '0.5rem' }}>Title Positioning</h4>
        <p style={{ color: 'var(--blue-300)', fontSize: '0.875rem' }}>
          Notice how the title "Profile Settings" is left-aligned with the subtitle "Configure your account" below it.
        </p>
      </div>
    </div>
  );
}

export function RightAlignedPanelContent() {
  return (
    <div style={{ padding: '2rem' }}>
      <h3 style={{ color: 'var(--blue-100)', marginBottom: '1rem' }}>Right-Aligned Title Demo</h3>
      <p style={{ color: 'var(--blue-300)', marginBottom: '2rem' }}>
        This panel demonstrates a right-aligned title with a subtitle. Less common but available for special use cases.
      </p>

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
        <h4 style={{ color: '#a855f7', marginBottom: '0.5rem' }}>API Usage</h4>
        <pre style={{
          color: 'var(--blue-300)',
          fontSize: '0.75rem',
          background: 'rgba(0,0,0,0.2)',
          padding: '0.5rem',
          borderRadius: '0.25rem',
          overflow: 'auto'
        }}>
{`openPanel(
  'panel-id',
  <Component />,
  'Title Text',
  'left' | 'center' | 'right',
  'Optional Subtitle'
);`}
        </pre>
      </div>
    </div>
  );
}

export function ProfilePanelContent() {
  return (
    <div style={{ padding: '2rem' }}>
      <h3 style={{ color: 'var(--blue-100)', marginBottom: '1rem' }}>Profile Panel Demo</h3>
      <p style={{ color: 'var(--blue-300)', marginBottom: '2rem' }}>
        This panel demonstrates a profile image in the header along with a title and subtitle. Perfect for user profiles, chat details, or contact information.
      </p>

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
        <h4 style={{ color: '#22c55e', marginBottom: '0.5rem' }}>Profile Layout</h4>
        <p style={{ color: 'var(--blue-300)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          The header shows:
        </p>
        <ul style={{ color: 'var(--blue-300)', fontSize: '0.875rem', paddingLeft: '1.5rem' }}>
          <li>40px circular profile image</li>
          <li>Title (user name)</li>
          <li>Subtitle (status or description)</li>
          <li>Left-aligned layout</li>
        </ul>
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
        <h4 style={{ color: '#a855f7', marginBottom: '0.5rem' }}>API Usage</h4>
        <pre style={{
          color: 'var(--blue-300)',
          fontSize: '0.75rem',
          background: 'rgba(0,0,0,0.2)',
          padding: '0.5rem',
          borderRadius: '0.25rem',
          overflow: 'auto'
        }}>
{`openPanel(
  'panel-id',
  <Component />,
  'John Doe',              // Title
  'left',                  // Position
  'Online',                // Subtitle
  '/profile/profile.jpg'   // Profile Image
);`}
        </pre>
      </div>
    </div>
  );
}

export function FullWidthPanelContent() {
  const { openPanel } = usePanels();

  const openAnotherFullWidth = () => {
    openPanel('fullwidth2', <FullWidthPanel2Content />, 'Another Full Width', 'center', undefined, undefined, true);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h3 style={{ color: 'var(--blue-100)', marginBottom: '1rem' }}>Full Width Panel</h3>
      <p style={{ color: 'var(--blue-300)', marginBottom: '2rem' }}>
        This panel stretches across the entire screen width. It slides in from the right just like regular panels - the only difference is it uses the full viewport width. Perfect for content that needs more horizontal space like image galleries, dashboards, or detailed views.
      </p>

      <button onClick={openAnotherFullWidth} className="btn btn-primary" style={{ marginBottom: '2rem' }}>
        Open Another Full Width Panel ›
      </button>

      <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
        <h4 style={{ color: 'var(--orange-500)', marginBottom: '0.75rem' }}>Full Width Features</h4>
        <ul style={{ color: 'var(--blue-300)', fontSize: '0.875rem', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
          <li>Spans 100% viewport width</li>
          <li>Slides in from right (same as regular panels)</li>
          <li>Still maintains backdrop and z-index stacking</li>
          <li>Responsive and mobile-friendly</li>
          <li>Perfect for galleries, dashboards, or detailed content</li>
        </ul>
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
        <h4 style={{ color: '#a855f7', marginBottom: '0.75rem' }}>API Usage</h4>
        <pre style={{
          color: 'var(--blue-300)',
          fontSize: '0.75rem',
          background: 'rgba(0,0,0,0.2)',
          padding: '0.75rem',
          borderRadius: '0.25rem',
          overflow: 'auto'
        }}>
{`openPanel(
  'panel-id',
  <Component />,
  'Panel Title',
  'center',      // titlePosition
  undefined,     // subtitle
  undefined,     // profileImage
  true           // fullWidth ← NEW!
);`}
        </pre>
      </div>

      <div style={{
        marginTop: '1.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem'
      }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{
            padding: '2rem',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '0.5rem',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            textAlign: 'center'
          }}>
            <h5 style={{ color: 'var(--blue-100)', marginBottom: '0.5rem' }}>Content Block {i}</h5>
            <p style={{ color: 'var(--blue-300)', fontSize: '0.875rem' }}>
              Full width allows for better content layouts
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FullWidthPanel2Content() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h3 style={{ color: 'var(--blue-100)', marginBottom: '1rem' }}>Stacked Full Width Panel</h3>
      <p style={{ color: 'var(--blue-300)', marginBottom: '2rem' }}>
        Even full-width panels can be stacked! This panel is on top of the previous full-width panel.
      </p>

      <div style={{ padding: '1.5rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
        <h4 style={{ color: '#22c55e', marginBottom: '0.5rem' }}><i className="fas fa-check"></i> Full Width Ready!</h4>
        <p style={{ color: 'var(--blue-300)', fontSize: '0.875rem' }}>
          Use full-width panels for:
        </p>
        <ul style={{ color: 'var(--blue-300)', fontSize: '0.875rem', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li>Image galleries</li>
          <li>Data tables and dashboards</li>
          <li>Detailed product views</li>
          <li>Rich content editors</li>
          <li>Any content needing horizontal space</li>
        </ul>
      </div>
    </div>
  );
}

export function ActionHeaderPanelContent() {
  return (
    <div style={{ padding: '2rem' }}>
      <h3 style={{ color: 'var(--blue-100)', marginBottom: '1rem' }}>Action Header Panel</h3>
      <p style={{ color: 'var(--blue-300)', marginBottom: '2rem' }}>
        This panel includes actionable icons in the top right of the header title bar.
        Try clicking the Video or Phone icons in the top right!
      </p>

      <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
        <h4 style={{ color: '#a855f7', marginBottom: '0.75rem' }}>API Usage</h4>
        <pre style={{
          color: 'var(--blue-300)',
          fontSize: '0.75rem',
          background: 'rgba(0,0,0,0.2)',
          padding: '0.75rem',
          borderRadius: '0.25rem',
          overflow: 'auto'
        }}>
{`openPanel(
  'panel-id',
  <Component />,
  'Title',
  'left',
  'Subtitle',
  'use-auth-user', // Dynamic User Profile
  false, // fullWidth
  [ // actionIcons
    {
      icon: 'far fa-video',
      onClick: () => handleVideo(),
      label: 'Video Call'
    },
    {
      icon: 'far fa-phone',
      onClick: () => handlePhone(),
      label: 'Audio Call'
    }
  ]
);`}
        </pre>
      </div>
    </div>
  );
}

export function SubtitleTogglePanelContent() {
  const { openPanel } = usePanels();
  const [hasSubtitle, setHasSubtitle] = useState(true);

  // Function to update the panel header by re-opening it with new props
  const toggleSubtitle = () => {
    const newStatus = !hasSubtitle;
    setHasSubtitle(newStatus);

    // Re-open same panel ID to update header props
    openPanel(
      'subtitle-toggle',
      <SubtitleTogglePanelContent />, // Recursively render itself
      'Dynamic Title',
      'left',
      newStatus ? 'Dynamic Subtitle' : undefined, // Toggle subtitle
      'use-auth-user',
      false,
      [
        { icon: 'far fa-cog', onClick: () => alert('Settings clicked'), label: 'Settings' }
      ]
    );
  };

  // We need to sync local state with the actual panel state when it re-renders
  // This ensures the button text matches the header state
  useEffect(() => {
    // In a real app, you might use a global store or context to sync this
    // For this demo, we just trust the local state matches the last action
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h3 style={{ color: 'var(--blue-100)', marginBottom: '1rem' }}>Subtitle Toggle Demo</h3>
      <p style={{ color: 'var(--blue-300)', marginBottom: '2rem' }}>
        This panel demonstrates how the title behaves when a subtitle is present vs absent.
      </p>

      <div style={{
        padding: '1.5rem',
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '0.5rem',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        marginBottom: '2rem'
      }}>
        <h4 style={{ color: 'var(--blue-100)', marginBottom: '0.5rem' }}>Current State:</h4>
        <p style={{ color: hasSubtitle ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
          {hasSubtitle ? 'Has Subtitle' : 'No Subtitle'}
        </p>
      </div>

      <button
        onClick={toggleSubtitle}
        className="btn btn-primary"
        style={{ width: '100%' }}
      >
        {hasSubtitle ? 'Remove Subtitle' : 'Add Subtitle'}
      </button>

      <p style={{ color: 'var(--blue-300)', fontSize: '0.875rem', marginTop: '1rem', textAlign: 'center' }}>
        Watch the header title position when you click this button.
      </p>
    </div>
  );
}
