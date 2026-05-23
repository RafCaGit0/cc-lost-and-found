import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, Edit3, CheckCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function OverflowMenu({ item, onResolve, onDelete }) {
  const { userEmail, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const isOwnerOrAdmin = item.authorEmail === userEmail || isAdmin;

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!isOwnerOrAdmin) return null;

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        style={{
          padding: 0,
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'white',
          color: 'var(--text-secondary)',
          cursor: 'pointer'
        }}
        type="button"
        aria-label="More options"
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div
          className="dropdown-menu"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: '4px',
            minWidth: '180px',
            zIndex: 50,
            background: 'white',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          <Link
            to={`/edit/${item.id}`}
            className="dropdown-item"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontSize: '0.9rem',
              transition: 'background 0.15s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Edit3 size={15} />
            Edit Post
          </Link>

          {item.status !== 'RESOLVED' && (
            <button
              className="dropdown-item"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                onResolve?.(item.id);
              }}
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                width: '100%',
                border: 'none',
                background: 'none',
                color: '#10b981',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <CheckCircle size={15} />
              Mark as Resolved
            </button>
          )}

          <div
            className="dropdown-divider"
            style={{
              height: '1px',
              background: 'rgba(0,0,0,0.08)',
              margin: '0.25rem 0',
            }}
          />

          <button
            className="dropdown-item"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onDelete?.(item.id);
            }}
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              width: '100%',
              border: 'none',
              background: 'none',
              color: '#ef4444',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Trash2 size={15} />
            Delete Post
          </button>
        </div>
      )}
    </div>
  );
}
