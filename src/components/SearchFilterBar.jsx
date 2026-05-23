import React, { useState, useRef, useEffect } from 'react';
import { Search, X, SlidersHorizontal, Check } from 'lucide-react';
import { useSearch } from '../contexts/SearchContext';
import { LOCATIONS } from '../utils/constants';
import { useAuth } from '../hooks/useAuth';

export default function SearchFilterBar({
  collapsible = false,
  showTypeFilter = false,
  showSortBy = false,
}) {
  const {
    searchTerm, setSearchTerm,
    locationFilter, setLocationFilter,
    statusFilter, setStatusFilter,
    typeFilter, setTypeFilter,
    myPostsOnly, setMyPostsOnly,
    sortBy, setSortBy,
    clearFilters, isActive,
  } = useSearch();
  
  const { userEmail } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // For Map View (collapsible)
  if (collapsible) {
    return (
      <div className="glass-panel" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search campus..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.25rem', width: '100%', boxSizing: 'border-box', border: 'none', background: 'transparent', boxShadow: 'none' }}
          />
        </div>
        
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.25rem' }} />

        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            type="button" 
            className={`btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ padding: '0.5rem 0.75rem', border: isActive ? undefined : 'none' }}
          >
            <SlidersHorizontal size={18} />
            <span style={{ marginLeft: '0.25rem', fontSize: '0.85rem' }}>Filters</span>
          </button>

          {showDropdown && (
            <div className="dropdown-menu" style={{ position: 'absolute', zIndex: 1000, display: 'flex', right: 0, left: 'auto', width: '250px', padding: '1rem', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem', background: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Filters</span>
                {isActive && (
                  <button type="button" onClick={clearFilters} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>
                    Clear all
                  </button>
                )}
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Location</label>
                <select className="form-select" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }}>
                  <option value="">All Locations</option>
                  {LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Status</label>
                <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }}>
                  <option value="ALL">All</option>
                  <option value="">Active</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>

              {userEmail && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={myPostsOnly} onChange={(e) => setMyPostsOnly(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }} />
                  Show my posts only
                </label>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // For Feed View (Expanded single row)
  return (
    <div className="glass-panel" style={{ padding: '0.75rem 1rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '150px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.25rem', width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Location select */}
        <select className="form-select" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={{ flex: '0 1 auto', minWidth: '130px' }}>
          <option value="">All Locations</option>
          {LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
        </select>

        {/* Status select */}
        <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ flex: '0 1 auto', minWidth: '110px' }}>
          <option value="ALL">All</option>
          <option value="">Active</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        {/* Type filter (optional) */}
        {showTypeFilter && (
          <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ flex: '0 1 auto', minWidth: '110px' }}>
            <option value="ALL">All Types</option>
            <option value="LOST">Lost Only</option>
            <option value="FOUND">Found Only</option>
          </select>
        )}

        {/* Sort by (optional) */}
        {showSortBy && (
          <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ flex: '0 1 auto', minWidth: '130px' }}>
            <option value="newest">Newest First</option>
            <option value="incident">Most Recent Incident</option>
          </select>
        )}

        {/* My Posts Toggle */}
        {userEmail && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={myPostsOnly} onChange={(e) => setMyPostsOnly(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }} />
            My posts only
          </label>
        )}

        {/* Clear filters */}
        {isActive && (
          <button
            type="button"
            onClick={clearFilters}
            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
