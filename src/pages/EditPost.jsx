import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { LOCATIONS, TIME_RANGES } from '../utils/constants';
import { CAMPUS_CENTER, CAMPUS_ZOOM, CAMPUS_LOCATIONS } from '../campusLocations';
import { getItem, updateItem } from '../api';
import { useItems } from '../contexts/ItemsContext';
import { MapResizer } from './MapView';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

import { createItemIcon } from '../components/MapMarker';

function LocationPickerMap({ position, setPosition, formData }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);

  return position === null ? null : <Marker position={position} icon={createItemIcon(formData)} />;
}

export default function EditPost() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { refreshItems } = useItems();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    postType: 'FOUND', 
    status: 'LEFT_AT_SCENE', 
    title: '', 
    description: '', 
    incidentDate: '',
    incidentTimeRange: '',
    location: LOCATIONS[0], 
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [position, setPosition] = useState(null);

  useEffect(() => {
    getItem(id).then(data => {
      setFormData({
        postType: data.postType,
        status: data.status,
        title: data.title,
        description: data.description,
        incidentDate: data.incidentDate || '',
        incidentTimeRange: data.incidentTimeRange || '',
        location: data.location || LOCATIONS[0],
        tags: data.tags || [],
        imageUrl: data.imageUrl
      });
      if (data.lat && data.lng) {
        setPosition([data.lat, data.lng]);
      } else if (data.location && CAMPUS_LOCATIONS[data.location]) {
        setPosition(CAMPUS_LOCATIONS[data.location]);
      } else {
        setPosition(CAMPUS_CENTER);
      }
    }).catch(err => setError(err.message)).finally(() => setInitialLoading(false));
  }, [id]);

  const addTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({...formData, tags: [...formData.tags, tagInput.trim()]});
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({...formData, tags: formData.tags.filter(t => t !== tagToRemove)});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { ...formData };
      if (position) {
        payload.lat = position[0];
        payload.lng = position[1];
      }
      await updateItem(id, payload);
      refreshItems();
      navigate(`/item/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <LoadingSpinner label="Loading post data..." />;

  return (
    <div className="glass-panel fade-in" style={{padding: '3rem', maxWidth: '700px', margin: '0 auto'}}>
      <button
        onClick={() => navigate(-1)}
        type="button"
        style={{ 
          background: 'none', border: 'none', color: 'var(--text-secondary)', 
          display: 'flex', alignItems: 'center', gap: '0.5rem', 
          cursor: 'pointer', padding: 0, marginBottom: '1.5rem',
          fontSize: '0.9rem', fontWeight: 500
        }}
      >
        <ArrowLeft size={16} /> Cancel
      </button>

      <h2 style={{color: 'var(--color-primary)', marginBottom: '2rem'}}>Edit Post</h2>
      {error && <div style={{background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem'}}>{error}</div>}
      
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
        
        <div className="form-group">
          <label className="form-label">Title / Short Description</label>
          <input 
            required
            type="text" 
            className="form-input"
            value={formData.title} 
            onChange={(e) => setFormData({...formData, title: e.target.value})} 
          />
        </div>

        <div className="form-group">
          <label className="form-label">Details</label>
          <textarea 
            className="form-textarea"
            value={formData.description} 
            onChange={(e) => setFormData({...formData, description: e.target.value})} 
          />
        </div>

        <div className="form-row-mobile" style={{display: 'flex', gap: '1rem', width: '100%'}}>
          <div className="form-group" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
            <label className="form-label">Incident Date</label>
            <input 
              required
              type="date" 
              className="form-input"
              value={formData.incidentDate}
              onChange={(e) => setFormData({...formData, incidentDate: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Approximate time</label>
            <select 
              className="form-select"
              value={formData.incidentTimeRange}
              onChange={(e) => setFormData({...formData, incidentTimeRange: e.target.value})}
            >
              {TIME_RANGES.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Tags</label>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem'}}>
            {formData.tags.map(tag => (
              <span key={tag} className="tag-pill tag-pill--removable">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="tag-pill__remove"><X size={14} /></button>
              </span>
            ))}
          </div>
          <div style={{display: 'flex', gap: '0.5rem'}}>
            <input 
              type="text" 
              className="form-input"
              placeholder="Add manual tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag(e)}
            />
            <button type="button" onClick={addTag} className="btn btn-outline" style={{whiteSpace: 'nowrap'}}>Add Tag</button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">General Location Area</label>
          <select 
            className="form-select"
            value={formData.location} 
            onChange={(e) => {
              setFormData({...formData, location: e.target.value});
              if (CAMPUS_LOCATIONS[e.target.value]) {
                setPosition(CAMPUS_LOCATIONS[e.target.value]);
              }
            }} 
          >
            {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Exact Location Pin (Optional)</label>
          <div style={{height: '250px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', zIndex: 0, position: 'relative'}}>
            <MapContainer center={position || CAMPUS_CENTER} zoom={CAMPUS_ZOOM} style={{height: '100%', width: '100%'}}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" maxZoom={19} />
              <LocationPickerMap position={position} setPosition={setPosition} formData={formData} />
              <MapResizer />
            </MapContainer>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{marginTop: '1rem', padding: '1rem', fontSize: '1rem'}}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
