import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import ItemCard from '../components/ItemCard';
import SearchFilterBar from '../components/SearchFilterBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { useItems } from '../contexts/ItemsContext';
import { useSearch, useFilteredItems } from '../contexts/SearchContext';
import { useAuth } from '../hooks/useAuth';
import { resolveItem, deleteItem } from '../api';

export default function Feed() {
  const { items, loading, error, refreshItems } = useItems();
  const { userEmail } = useAuth();

  const { typeFilter, setTypeFilter, myPostsOnly, setMyPostsOnly } = useSearch();
  const location = useLocation();

  // Confirm dialog state for delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // Check for ?mine=true on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mine') === 'true') {
      setMyPostsOnly(true);
    }
  }, [location.search, setMyPostsOnly]);

  const visibleItems = useFilteredItems(items, userEmail);

  const handleResolve = async (id) => {
    try {
      await resolveItem(id);
      refreshItems();
    } catch (err) {
      console.error('Error resolving:', err.message);
    }
  };

  const handleDeleteClick = (id) => {
    setPendingDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleteDialogOpen(false);
    try {
      await deleteItem(pendingDeleteId);
      refreshItems();
    } catch (err) {
      console.error('Error deleting:', err.message);
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="fade-in">
      {/* Tab bar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', background: 'var(--bg-main)', borderRadius: 'var(--radius-full)', padding: '0.35rem', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
          {['ALL', 'LOST', 'FOUND'].map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              style={{
                padding: '0.6rem 2rem',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: typeFilter === type ? 'white' : 'transparent',
                fontWeight: typeFilter === type ? 600 : 500,
                color: typeFilter === type ? 'var(--color-primary)' : 'var(--text-secondary)',
                boxShadow: typeFilter === type ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {type === 'ALL' ? 'All Items' : type === 'LOST' ? 'Lost' : 'Found'}
            </button>
          ))}
        </div>
      </div>

      {/* Search and filter bar (type handled by tabs) */}
      <div style={{ marginBottom: '2rem', position: 'relative', zIndex: 100 }}>
        <SearchFilterBar collapsible={true} showTypeFilter={false} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <LoadingSpinner label="Loading items..." />
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ background: '#f1f5f9', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Search size={24} color="#94a3b8" />
          </div>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No items found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
          {visibleItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onResolve={handleResolve}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteDialogOpen(false); setPendingDeleteId(null); }}
      />
    </div>
  );
}
