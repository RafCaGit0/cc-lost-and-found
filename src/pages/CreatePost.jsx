import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Upload, X, ArrowLeft } from 'lucide-react';
import { createItemIcon } from '../components/MapMarker';
import TypeSelector from '../components/TypeSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import { LOCATIONS, STATUS_DESCRIPTIONS, TIME_RANGES } from '../utils/constants';
import { CAMPUS_CENTER, CAMPUS_ZOOM, CAMPUS_LOCATIONS } from '../campusLocations';
import { compressImage } from '../utils/compressImage';
import { getTodayISO } from '../utils/formatDate';
import { analyzeImage, createItem } from '../api';
import { MapResizer } from './MapView';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationPickerMap({ position, setPosition, formData }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  
  const map = useMap();
  React.useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);

  return position === null ? null : <Marker position={position} icon={createItemIcon(formData)} />;
}

export default function CreatePost() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialType = queryParams.get('type') === 'LOST' ? 'LOST' : 'FOUND';

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    postType: initialType,
    status: initialType === 'LOST' ? 'OPEN' : 'LEFT_AT_SCENE',
    title: '',
    description: '',
    incidentDate: getTodayISO(),
    incidentTimeRange: '',
    location: LOCATIONS[0],
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  // Initialize position to the first location in the list to avoid map pin bugs
  const [position, setPosition] = useState(CAMPUS_LOCATIONS[LOCATIONS[0]] || CAMPUS_CENTER);

  const handleImageSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Image is too large. Maximum allowed size is 10MB.");
      e.target.value = '';
      return;
    }
    
    setFile(selectedFile);
    setError('');
    
    try {
      setAnalyzing(true);
      const base64Str = await compressImage(selectedFile);
      setImagePreview(base64Str);
      const { tags } = await analyzeImage(base64Str);
      
      setFormData(prev => {
        const newTags = Array.from(new Set([...prev.tags, ...tags]));
        const newTitle = prev.title === '' && tags.length > 0 ? tags[0] : prev.title;
        return { ...prev, tags: newTags, title: newTitle };
      });
    } catch (err) {
      console.error("AI Analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

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
      await createItem(payload, file);
      navigate('/feed');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

      <h2 style={{color: 'var(--color-primary)', marginBottom: '2rem'}}>Report an Item</h2>
      
      {error && <div style={{background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem'}}>{error}</div>}
      
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
        
        <div className="form-group">
          <TypeSelector 
            value={formData.postType} 
            onChange={(type) => setFormData({...formData, postType: type, status: type === 'LOST' ? 'OPEN' : 'LEFT_AT_SCENE'})} 
          />
        </div>

        <div className="form-group">
          <label className="form-label">Image (Upload first to auto-fill details)</label>
          {imagePreview ? (
            <div style={{marginBottom: '1rem'}}>
              <img src={imagePreview} alt="Preview" style={{width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)'}} />
              <button type="button" onClick={() => { setFile(null); setImagePreview(null); }} className="btn btn-outline" style={{marginTop: '0.75rem'}}>
                Change Image
              </button>
            </div>
          ) : (
            <div className="upload-area" onClick={() => document.getElementById('imageUpload').click()}>
              <Upload className="upload-area__icon" size={32} />
              <div className="upload-area__text">Click to upload or drag an image</div>
              <div className="upload-area__hint">Supports JPG, PNG (Max 10MB)</div>
              <input id="imageUpload" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImageSelect} style={{display: 'none'}} />
            </div>
          )}
          {analyzing && <div style={{marginTop: '0.75rem'}}><LoadingSpinner label="Analyzing image with AI..." /></div>}
        </div>

        <div className="form-group">
          <label className="form-label">Title / Short Description</label>
          <input 
            required
            type="text" 
            className="form-input"
            placeholder="e.g. Blue Hydroflask, Apple AirPods..."
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Details</label>
          <textarea 
            className="form-textarea"
            placeholder="Any specific details, colors, brands, exact spot..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div style={{display: 'flex', gap: '1rem', width: '100%'}}>
          <div className="form-group" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
            <label className="form-label">When did you {formData.postType === 'LOST' ? 'lose' : 'find'} this item?</label>
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
          <p className="form-hint" style={{marginBottom: '0.75rem'}}>Click on the map to drop a pin where the item was {formData.postType === 'LOST' ? 'lost' : 'found'}.</p>
          <div style={{height: '250px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', zIndex: 0, position: 'relative'}}>
            <MapContainer center={position || CAMPUS_CENTER} zoom={CAMPUS_ZOOM} style={{height: '100%', width: '100%'}}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" maxZoom={19} />
              <LocationPickerMap position={position} setPosition={setPosition} formData={formData} />
              <MapResizer />
            </MapContainer>
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
              placeholder="Add manual tag (e.g. Red, Backpack)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag(e)}
            />
            <button type="button" onClick={addTag} className="btn btn-outline" style={{whiteSpace: 'nowrap'}}>Add Tag</button>
          </div>
        </div>

        {formData.postType === 'FOUND' && (
          <div className="form-group">
            <label className="form-label">Status</label>
            <select 
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="LEFT_AT_SCENE">{STATUS_DESCRIPTIONS.LEFT_AT_SCENE}</option>
              <option value="WITH_FINDER">{STATUS_DESCRIPTIONS.WITH_FINDER}</option>
              <option value="AT_OFFICE">{STATUS_DESCRIPTIONS.AT_OFFICE}</option>
            </select>
          </div>
        )}

        <button type="submit" disabled={loading || analyzing} className="btn btn-primary" style={{marginTop: '1rem', padding: '1rem', fontSize: '1rem'}}>
          {loading ? 'Posting...' : 'Post Item'}
        </button>
      </form>
    </div>
  );
}
