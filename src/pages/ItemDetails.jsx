import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createItemIcon } from '../components/MapMarker';
import { MapResizer } from './MapView';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { getItem, resolveItem, deleteItem } from '../api';
import { MapPin, Mail, ArrowLeft, Calendar, Edit3, CheckCircle, Trash2, Tag } from 'lucide-react';
import { formatIncidentDate } from '../utils/formatDate';
import { STATUS_LABELS, TYPE_COLORS } from '../utils/constants';
import { CAMPUS_CENTER, CAMPUS_LOCATIONS } from '../campusLocations';

// Fix Leaflet default icon path
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { userEmail, isAdmin } = useAuth();

  const backUrl = location.state?.from || '/feed';

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    getItem(id)
      .then(setItem)
      .catch(err => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleResolve = async () => {
    setResolveDialogOpen(false);
    try {
      await resolveItem(id);
      const updated = await getItem(id);
      setItem(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    setDeleteDialogOpen(false);
    try {
      await deleteItem(id);
      navigate('/feed');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <LoadingSpinner label="Loading item..." />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', maxWidth: '600px', margin: '2rem auto' }}>
        <h3 style={{ color: 'var(--color-danger)', marginBottom: '0.5rem' }}>{error ? 'Error' : 'Not Found'}</h3>
        <p style={{ color: 'var(--text-secondary)' }}>{error || 'Item not found'}</p>
        <button className="btn btn-outline" onClick={() => navigate(backUrl)} style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  const pos = (item.lat && item.lng)
    ? [item.lat, item.lng]
    : CAMPUS_LOCATIONS[item.location] || CAMPUS_CENTER;

  const getStatusColor = (status) => {
    if (status === 'RESOLVED') return 'var(--color-resolved)';
    return TYPE_COLORS[item.postType] || '#3b82f6';
  };

  const isOwner = userEmail === item.authorEmail;
  const canManage = isOwner || isAdmin;

  // Grid layout styles
  const gridContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '2rem',
    alignItems: 'start'
  };

  // Block style for white rounded panels
  const blockStyle = {
    background: 'white',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-sm)'
  };

  return (
    <div className="fade-in" style={{ padding: '2rem 1rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Back button */}
      <button
        onClick={() => navigate(backUrl)}
        style={{ 
          background: 'none', border: 'none', color: 'var(--text-secondary)', 
          display: 'flex', alignItems: 'center', gap: '0.5rem', 
          cursor: 'pointer', padding: 0, marginBottom: '2rem',
          fontSize: '0.9rem', fontWeight: 500
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={gridContainerStyle}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Image Block */}
          {item.imageUrl ? (
            <div style={{ ...blockStyle, padding: 0, overflow: 'hidden' }}>
              <img
                src={item.imageUrl}
                alt={item.title}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '400px',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            </div>
          ) : (
            <div style={{ ...blockStyle, padding: '3rem', textAlign: 'center', background: 'var(--glass-bg)' }}>
              <p style={{ color: 'var(--text-muted)' }}>No image provided</p>
            </div>
          )}

          {/* Title & Tags */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '1rem' }}>
              <h1 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '2.2rem', fontWeight: 700, lineHeight: 1.2 }}>
                {item.title}
              </h1>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                background: 'transparent',
                border: `1.5px solid ${getStatusColor(item.status)}`,
                color: getStatusColor(item.status),
                padding: '4px 12px',
                borderRadius: '16px',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase'
              }}>
                {STATUS_LABELS[item.status] || item.status.replace(/_/g, ' ')}
              </span>
            </div>

            {item.tags && item.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {item.tags.map(tag => (
                  <span key={tag} className="tag-pill tag-pill--removable" style={{ padding: '0.3rem 0.75rem' }}>
                    <Tag size={12} style={{ opacity: 0.5 }} /> {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description Block */}
          <div style={blockStyle}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1rem' }}>Description</h4>
            <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {item.description}
            </p>
          </div>

          {/* Location & Date Block */}
          <div style={{ ...blockStyle, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: '50%', color: 'var(--color-primary)' }}>
                <MapPin size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Location</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.location}</div>
              </div>
            </div>

            {item.incidentDate && (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: '50%', color: 'var(--color-primary)' }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Reported</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {formatIncidentDate(item.incidentDate, item.incidentTimeRange)}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Map Block */}
          <div style={{ ...blockStyle, padding: 0, overflow: 'hidden', height: '300px' }}>
            <MapContainer center={pos} zoom={17} maxZoom={19} style={{ height: '100%', width: '100%', zIndex: 1 }}>
              <MapResizer />
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" maxZoom={19} />
              <Marker position={pos} icon={createItemIcon(item)} />
            </MapContainer>
          </div>

          {/* Contact Block */}
          <div style={{ ...blockStyle, background: 'var(--glass-bg)' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
              {item.postType === 'LOST' ? 'Found this item?' : 'Lost this item?'}
            </h4>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {item.postType === 'LOST' 
                ? 'If you found this item, please contact the owner to arrange a return.'
                : 'If this is your item, please contact the finder to arrange a pickup.'}
            </p>
            <a
              href={`mailto:${item.authorEmail}?subject=Regarding ${item.postType} Item: ${item.title}`}
              className="btn btn-primary"
              style={{ textDecoration: 'none', display: 'flex', width: '100%', justifyContent: 'center', padding: '0.8rem' }}
            >
              <Mail size={18} />
              Contact {item.postType === 'LOST' ? 'Owner' : 'Finder'}
            </a>
          </div>

          {/* Safety Tips Block */}
          <div style={blockStyle}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1rem' }}>Tips</h4>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.9rem' }}>
              <li>Always meet in a public place on campus</li>
              <li>Verify ownership before handing over items</li>
              <li>Use your NYCU email for communication</li>
            </ul>
          </div>

        </div>
      </div>

      {/* Author/Admin Actions */}
      {canManage && (
        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to={`/edit/${item.id}`} className="btn btn-outline" style={{ padding: '0.6rem 1.5rem', background: 'white' }}>
              <Edit3 size={16} /> Edit
            </Link>
            
            {item.status !== 'RESOLVED' && (
              <button className="btn btn-primary" onClick={() => setResolveDialogOpen(true)} style={{ padding: '0.6rem 1.5rem' }}>
                <CheckCircle size={16} /> Mark Resolved
              </button>
            )}
            
            <button 
              className="btn btn-outline" 
              style={{ color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '0.6rem 1.5rem', background: 'white' }}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
      <ConfirmDialog
        open={resolveDialogOpen}
        title="Mark as Resolved"
        message="Mark this item as resolved? This indicates the item has been returned to its owner."
        confirmLabel="Resolve"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={handleResolve}
        onCancel={() => setResolveDialogOpen(false)}
      />
    </div>
  );
}
