export default function LoadingSpinner({ label }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        gap: '1rem',
      }}
    >
      <div className="spinner" />
      {label && (
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            fontWeight: 500,
            margin: 0,
          }}
        >
          {label}
        </p>
      )}
    </div>
  );
}
