import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, ShieldAlert, LogOut, FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function ProfileDropdown() {
  const { userEmail, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    signOut();
  };

  const itemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.6rem 1rem',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s',
    border: 'none',
    background: 'none',
    width: '100%',
    fontFamily: 'inherit',
    fontWeight: 500,
  };

  const handleItemHover = (e, entering) => {
    e.currentTarget.style.background = entering
      ? 'var(--color-secondary)'
      : 'transparent';
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="User menu"
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--color-secondary)',
          color: 'var(--color-primary)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          padding: 0,
        }}
      >
        <User size={18} />
      </button>

      {open && (
        <div
          className="dropdown-menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            minWidth: '220px',
            zIndex: 200,
            background: 'white',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid rgba(0,0,0,0.08)',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* User email */}
          <div
            style={{
              padding: '0.75rem 1rem',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              fontWeight: 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {userEmail}
          </div>

          <div
            className="dropdown-divider"
            style={{
              height: '1px',
              background: 'rgba(0,0,0,0.08)',
            }}
          />

          {/* My Posts */}
          <Link
            to="/feed?mine=true"
            className="dropdown-item"
            onClick={() => setOpen(false)}
            style={itemStyle}
            onMouseEnter={(e) => handleItemHover(e, true)}
            onMouseLeave={(e) => handleItemHover(e, false)}
          >
            <FileText size={16} />
            My Posts
          </Link>

          {/* Admin Panel */}
          {isAdmin && (
            <Link
              to="/admin"
              className="dropdown-item"
              onClick={() => setOpen(false)}
              style={itemStyle}
              onMouseEnter={(e) => handleItemHover(e, true)}
              onMouseLeave={(e) => handleItemHover(e, false)}
            >
              <ShieldAlert size={16} />
              Admin Panel
            </Link>
          )}

          <div
            className="dropdown-divider"
            style={{
              height: '1px',
              background: 'rgba(0,0,0,0.08)',
            }}
          />

          {/* Logout */}
          <button
            type="button"
            className="dropdown-item"
            onClick={handleLogout}
            style={{
              ...itemStyle,
              color: '#ef4444',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
