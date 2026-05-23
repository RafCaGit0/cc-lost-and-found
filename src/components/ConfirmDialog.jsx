import { createPortal } from 'react-dom';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const isDanger = variant === 'danger';

  const confirmButtonStyle = isDanger
    ? {
        background: '#ef4444',
        color: 'white',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
      }
    : {};

  const confirmButtonHoverStyle = isDanger
    ? {
        background: '#dc2626',
      }
    : {};

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="modal-panel glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '1.75rem',
          margin: '1rem',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <h3
          style={{
            margin: '0 0 0.75rem 0',
            fontSize: '1.15rem',
            fontWeight: 600,
            color: isDanger ? '#ef4444' : 'var(--text-primary)',
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: '0 0 1.5rem 0',
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
          }}
        >
          <button
            className="btn btn-outline"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`btn ${isDanger ? '' : 'btn-primary'}`}
            style={confirmButtonStyle}
            onMouseEnter={(e) => {
              if (isDanger) {
                Object.assign(e.currentTarget.style, confirmButtonHoverStyle);
              }
            }}
            onMouseLeave={(e) => {
              if (isDanger) {
                Object.assign(e.currentTarget.style, confirmButtonStyle);
              }
            }}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
