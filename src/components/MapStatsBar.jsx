import { useMemo } from 'react';

export default function MapStatsBar({ items }) {
  const { lostCount, foundCount } = useMemo(() => {
    let lost = 0;
    let found = 0;
    for (const item of items) {
      if (item.status === 'RESOLVED') continue;
      if (item.postType === 'LOST') lost++;
      else if (item.postType === 'FOUND') found++;
    }
    return { lostCount: lost, foundCount: found };
  }, [items]);

  return (
    <div
      className="stats-badge glass-panel"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.4rem 0.9rem',
        fontSize: '0.8rem',
        fontWeight: 500,
        color: 'var(--text-primary)',
        borderRadius: 'var(--radius-md)',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#ef4444',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        {lostCount} Lost
      </span>

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#3b82f6',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        {foundCount} Found
      </span>
    </div>
  );
}
