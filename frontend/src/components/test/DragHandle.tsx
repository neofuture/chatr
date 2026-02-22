'use client';

interface Props {
  isDark: boolean;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

export default function DragHandle({ isDark, isDragging, onMouseDown }: Props) {
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        width: '5px', flexShrink: 0, height: '100%', cursor: 'col-resize', position: 'relative', zIndex: 10,
        backgroundColor: isDragging ? '#3b82f6' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
        transition: isDragging ? 'none' : 'background-color 0.15s',
      }}
    >
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        display: 'flex', flexDirection: 'column', gap: '4px', pointerEvents: 'none',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '3px', height: '3px', borderRadius: '50%',
            backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
          }} />
        ))}
      </div>
    </div>
  );
}

