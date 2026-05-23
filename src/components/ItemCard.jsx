import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Package } from 'lucide-react';
import OverflowMenu from './OverflowMenu';
import { TYPE_COLORS, STATUS_LABELS } from '../utils/constants';
import { formatRelativeTime, formatIncidentDateShort } from '../utils/formatDate';
import { CAMPUS_LOCATIONS, CAMPUS_CENTER } from '../campusLocations';

export default function ItemCard({ item, onResolve, onDelete }) {
  const navigate = useNavigate();
  
  const isResolved = item.status === 'RESOLVED';
  const typeColor = TYPE_COLORS[item.postType] || '#6b7280';
  const statusLabel = STATUS_LABELS[item.status] || item.status;

  // Badge color: green for resolved, type color otherwise
  const badgeColor = isResolved ? 'var(--color-resolved)' : typeColor;

  // Compute map coordinates
  const lat = item.lat || (CAMPUS_LOCATIONS[item.location] || CAMPUS_CENTER)[0];
  const lng = item.lng || (CAMPUS_LOCATIONS[item.location] || CAMPUS_CENTER)[1];

  const shortDate = formatIncidentDateShort(item.incidentDate);
  const relativeTime = formatRelativeTime(item.timestamp);

  const handleCardClick = () => {
    navigate(`/item/${item.id}`, { state: { from: window.location.pathname + window.location.search } });
  };

  const handleActionClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`item-card item-card--${item.postType.toLowerCase()}`}
      onClick={handleCardClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        opacity: isResolved ? 0.6 : 1,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        borderRadius: 'var(--radius-lg)'
      }}
    >
      {/* IMAGE AREA */}
      <div style={{ position: 'relative' }}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className={`item-card__image ${isResolved ? 'item-card__image--resolved' : ''}`}
          />
        ) : (
          <div className={`item-card__placeholder item-card__placeholder--${item.postType.toLowerCase()}`}>
            <Package
              size={40}
              style={{
                color: isResolved ? '#9ca3af' : 'white',
                opacity: 0.8,
              }}
            />
          </div>
        )}
        
        {/* Floating actions on top right of the image */}
        <div 
          onClick={handleActionClick}
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            display: 'flex',
            gap: '0.5rem',
            zIndex: 10
          }}
        >
            <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/?lat=${lat}&lng=${lng}&id=${item.id}`);
            }}
            className="btn btn-primary"
            style={{
              padding: 0,
              width: '32px',
              height: '32px',
              minWidth: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
            title="Show on map"
          >
            <MapPin size={16} />
          </button>
          
          <div style={{ background: 'white', borderRadius: '50%', display: 'flex', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            <OverflowMenu item={item} onResolve={onResolve} onDelete={onDelete} />
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '1rem',
        }}
      >
        {/* Title + badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, flex: 1, lineHeight: 1.3, color: 'var(--color-primary)' }}>
            {item.title}
          </h3>
          <span
            style={{
              display: 'inline-block',
              padding: '0.15rem 0.6rem',
              background: badgeColor,
              color: 'white',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Description */}
        <p className="item-card__description">
          {item.description}
        </p>

        {/* Meta row — pushed to bottom */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <MapPin size={13} />
            {item.location}
          </span>

          {shortDate && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={13} />
              {shortDate}
            </span>
          )}

          {relativeTime && (
            <span style={{ marginLeft: 'auto', opacity: 0.7, fontSize: '0.75rem' }}>
              {relativeTime}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
