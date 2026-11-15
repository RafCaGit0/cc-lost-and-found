import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createItemIcon } from '../components/MapMarker';
import SearchFilterBar from '../components/SearchFilterBar';
import MapStatsBar from '../components/MapStatsBar';
import LoadingSpinner from '../components/LoadingSpinner';
import { useItems } from '../contexts/ItemsContext';
import { useSearch, useFilteredItems } from '../contexts/SearchContext';
import { useAuth } from '../hooks/useAuth';
import { CAMPUS_CENTER, CAMPUS_ZOOM, CAMPUS_LOCATIONS } from '../campusLocations';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Named export — other pages (ItemDetails, CreatePost, EditPost) reuse this
export function MapResizer() {
  const map = useMap();
  useEffect(() => {
    let timer;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        map.invalidateSize();
      }, 100);
    });
    const container = map.getContainer();
    resizeObserver.observe(container);
    return () => {
      resizeObserver.unobserve(container);
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [map]);
  return null;
}

// Fly to a target position on the map (for deep-linking)
function MapFocus({ targetLat, targetLng }) {
  const map = useMap();
  useEffect(() => {
    if (targetLat && targetLng) {
      const timer = setTimeout(() => {
        map.flyTo([targetLat, targetLng], 19, { animate: true, duration: 1.5 });
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [map, targetLat, targetLng]);
  return null;
}

export default function MapView() {
  const { items, loading, error } = useItems();
  const { userEmail } = useAuth();

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const targetLat = queryParams.get('lat') ? parseFloat(queryParams.get('lat')) : null;
  const targetLng = queryParams.get('lng') ? parseFloat(queryParams.get('lng')) : null;
  const targetId = queryParams.get('id');

  const markerRefs = useRef({});

  const visibleItems = useFilteredItems(items, userEmail);

  // Auto-open popup for deep-linked item
  useEffect(() => {
    if (targetId && markerRefs.current[targetId] && items.length > 0) {
      setTimeout(() => {
        markerRefs.current[targetId].openPopup();
      }, 500);
    }
  }, [targetId, items]);

  return (
    <div className="fade-in" style={{ height: 'calc(100vh - 65px)', width: '100%', position: 'relative', background: '#f8fafc', overflow: 'hidden' }}>
      {/* Floating search bar */}
      <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '90%', maxWidth: '800px' }}>
        <SearchFilterBar collapsible={true} showTypeFilter={true} showMobileToggle={true} />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
          <LoadingSpinner label="Loading map data..." />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, background: '#fee2e2', color: '#991b1b', padding: '1rem 2rem', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}>
          {error}
        </div>
      )}

      {/* Map */}
      <MapContainer center={CAMPUS_CENTER} zoom={CAMPUS_ZOOM} maxZoom={19} style={{ height: '100%', width: '100%', zIndex: 1 }}>
        <MapResizer />
        <MapFocus targetLat={targetLat} targetLng={targetLng} />
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' maxZoom={19} />
        {visibleItems.map(item => {
          const pos = (item.lat && item.lng)
            ? [item.lat, item.lng]
            : CAMPUS_LOCATIONS[item.location] || CAMPUS_CENTER;

          return (
            <Marker
              key={item.id}
              position={pos}
              icon={createItemIcon(item)}
              ref={el => { if (el) markerRefs.current[item.id] = el; }}
            >
              <Popup className="glass-popup">
                <div style={{ textAlign: 'center', minWidth: '160px' }}>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
                    />
                  )}
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                    {item.title}
                  </h3>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: item.status === 'RESOLVED' ? '#10b981' : (item.postType === 'LOST' ? '#ef4444' : '#3b82f6'),
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}>
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {item.location}
                  </p>
                  <Link
                    to={`/item/${item.id}`}
                    state={{ from: window.location.pathname + window.location.search }}
                    className="btn btn-primary"
                    style={{ display: 'block', padding: '6px', fontSize: '0.85rem', textDecoration: 'none', color: 'white' }}
                  >
                    View Details
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating stats */}
      <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000 }}>
        <MapStatsBar items={items} />
      </div>
    </div>
  );
}
