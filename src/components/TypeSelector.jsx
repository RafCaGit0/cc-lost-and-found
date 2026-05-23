import { Search, Package, CheckCircle } from 'lucide-react';

const types = [
  {
    value: 'LOST',
    label: 'I Lost Something',
    subtitle: 'Report a missing item to get help finding it',
    Icon: Search,
    activeColor: '#ef4444',
  },
  {
    value: 'FOUND',
    label: 'I Found Something',
    subtitle: 'Report an item you have found on campus',
    Icon: Package,
    activeColor: '#3b82f6',
  },
];

export default function TypeSelector({ value, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '1rem',
        width: '100%',
      }}
    >
      {types.map(({ value: typeValue, label, subtitle, Icon, activeColor }) => {
        const isSelected = value === typeValue;

        return (
          <button
            key={typeValue}
            type="button"
            onClick={() => onChange(typeValue)}
            style={{
              flex: 1,
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              border: isSelected
                ? `2px solid ${activeColor}`
                : '2px solid rgba(0, 0, 0, 0.1)',
              background: isSelected ? activeColor : 'white',
              color: isSelected ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
              textAlign: 'center',
              fontFamily: 'inherit',
              position: 'relative',
              boxShadow: isSelected
                ? `0 8px 20px ${activeColor}33`
                : 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {isSelected && (
              <CheckCircle
                size={18}
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  right: '0.75rem',
                }}
              />
            )}

            <Icon
              size={32}
              style={{
                color: isSelected ? 'white' : activeColor,
              }}
            />

            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: 600,
              }}
            >
              {label}
            </span>

            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 400,
                opacity: isSelected ? 0.9 : 0.6,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </span>
          </button>
        );
      })}
    </div>
  );
}
