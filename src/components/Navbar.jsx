import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, PlusCircle, Menu, X } from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';

export default function Navbar() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Map', isActive: pathname === '/' },
    { to: '/feed', label: 'Feed', isActive: pathname.startsWith('/feed') },
  ];

  return (
    <nav className="navbar">
      {/* Brand */}
      <Link to="/" className="nav-brand" onClick={() => setMobileOpen(false)}>
        <MapPin size={24} color="var(--color-accent)" />
        NYCU Lost &amp; Found
      </Link>

      {/* Desktop nav + profile grouped on the right */}
      <div className="nav-desktop-group" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${link.isActive ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/create"
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            <PlusCircle size={18} />
            Report Item
          </Link>
        </div>

        <div className="nav-user">
          <ProfileDropdown />
        </div>
      </div>

      {/* Mobile hamburger */}
      <button
        className="navbar-mobile-toggle"
        onClick={() => setMobileOpen(prev => !prev)}
        aria-label="Toggle navigation"
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-primary)',
          padding: '0.5rem',
        }}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile slide-in nav */}
      {mobileOpen && (
        <div
          className="mobile-nav-overlay"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="mobile-nav-panel"
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.25rem' }}>
                <MapPin size={24} color="var(--color-accent)" />
                NYCU Lost &amp; Found
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.2rem' }}
                aria-label="Close menu"
              >
                <X size={28} />
              </button>
            </div>

            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link ${link.isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <Link
              to="/create"
              className="btn btn-primary"
              onClick={() => setMobileOpen(false)}
              style={{ textDecoration: 'none', justifyContent: 'center', padding: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}
            >
              <PlusCircle size={20} />
              Report Item
            </Link>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
              <ProfileDropdown onClose={() => setMobileOpen(false)} centered={true} />
            </div>
          </div>
        </div>
      )}

      {/* Inline responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .navbar .nav-desktop-group { display: none !important; }
          .navbar-mobile-toggle { display: block !important; }
        }
        @media (min-width: 769px) {
          .navbar-mobile-toggle { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
