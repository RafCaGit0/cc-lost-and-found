import React, { useState, useEffect, useRef } from 'react'
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Search, PlusCircle, MapPin, LayoutDashboard, CheckCircle, Trash2, Mail, Users, ShieldAlert } from 'lucide-react'
import { getItems, createItem, resolveItem, deleteItem, getUsers, promoteUser } from './api'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { CAMPUS_CENTER, CAMPUS_ZOOM, CAMPUS_LOCATIONS } from './campusLocations'

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapResizer() {
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

const InteractiveMap = () => {
  const [items, setItems] = useState([]);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const targetLat = queryParams.get('lat') ? parseFloat(queryParams.get('lat')) : null;
  const targetLng = queryParams.get('lng') ? parseFloat(queryParams.get('lng')) : null;
  const targetId = queryParams.get('id');

  const markerRefs = useRef({});

  useEffect(() => {
    getItems('').then(setItems).catch(console.error);
  }, []);

  useEffect(() => {
    if (targetId && markerRefs.current[targetId] && items.length > 0) {
      setTimeout(() => {
        markerRefs.current[targetId].openPopup();
      }, 500);
    }
  }, [targetId, items]);

  function MapFocus() {
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

  return (
    <div style={{ height: 'calc(100vh - 75px)', width: '100%', position: 'relative' }}>
      <MapContainer center={CAMPUS_CENTER} zoom={CAMPUS_ZOOM} maxZoom={19} style={{ height: '100%', width: '100%', zIndex: 1 }}>
        <MapResizer />
        <MapFocus />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" maxZoom={19} />
        {items.filter(i => i.status !== 'RESOLVED').map(item => {
          // Fallback to predefined location coordinates if lat/lng missing
          const pos = (item.lat && item.lng) 
            ? [item.lat, item.lng] 
            : CAMPUS_LOCATIONS[item.location] || CAMPUS_CENTER;

          const customIcon = item.imageUrl ? new L.DivIcon({
            className: 'custom-map-icon',
            html: `<div style="width:40px;height:40px;border-radius:50%;overflow:hidden;border:3px solid ${item.postType==='LOST'?'#ef4444':'#3b82f6'};box-shadow:0 2px 5px rgba(0,0,0,0.3);background:white;"><img src="${item.imageUrl}" style="width:100%;height:100%;object-fit:cover;" /></div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
          }) : new L.Icon.Default();

          return (
            <Marker 
              key={item.id} 
              position={pos} 
              icon={customIcon}
              ref={el => { if (el) markerRefs.current[item.id] = el; }}
            >
              <Popup className="glass-popup">
                <div style={{textAlign: 'center', minWidth: '160px'}}>
                  {item.imageUrl && <img src={item.imageUrl} alt={item.title} style={{width:'100%', height:'100px', objectFit:'cover', borderRadius:'8px', marginBottom:'8px'}} />}
                  <h3 style={{margin: '0 0 5px 0', fontSize: '1.1rem', color: 'var(--color-primary)'}}>{item.title}</h3>
                  <div style={{marginBottom: '8px'}}>
                    <span style={{fontSize: '0.75rem', fontWeight: 600, background: item.postType==='LOST'?'#ef4444':'#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px'}}>{item.status.replace(/_/g, ' ')}</span>
                  </div>
                  <p style={{margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{item.location}</p>
                  <Link to={`/item/${item.id}`} className="btn btn-primary" style={{display: 'block', padding: '6px', fontSize: '0.85rem', textDecoration: 'none', color: 'white'}}>View Details</Link>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  );
}

const LocationPickerMap = ({ position, setPosition }) => {
  function LocationMarker() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng])
      },
    })
    return position === null ? null : <Marker position={position}></Marker>
  }

  function MapUpdater({ pos }) {
    const map = useMap();
    useEffect(() => {
      if (pos) {
        map.flyTo(pos, 18, { animate: true, duration: 1 });
      }
    }, [pos, map]);
    return null;
  }

  return (
    <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer center={CAMPUS_CENTER} zoom={CAMPUS_ZOOM} maxZoom={19} style={{ height: '300px', width: '100%', zIndex: 1 }}>
        <MapResizer />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" maxZoom={19} />
        <LocationMarker />
        <MapUpdater pos={position} />
      </MapContainer>
    </div>
  )
}

const ItemDetails = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const id = pathname.split('/').pop();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('./api').then(({ getItem }) => {
      getItem(id).then(setItem).catch(console.error).finally(() => setLoading(false));
    });
  }, [id]);

  if (loading) return <div style={{textAlign: 'center', padding: '3rem'}}>Loading...</div>;
  if (!item) return <div style={{textAlign: 'center', padding: '3rem'}}>Item not found</div>;

  const pos = (item.lat && item.lng) ? [item.lat, item.lng] : CAMPUS_LOCATIONS[item.location] || CAMPUS_CENTER;

  return (
    <div className="glass-panel" style={{padding: '2rem', maxWidth: '900px', margin: '0 auto'}}>
      <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap'}}>
        <div style={{flex: '1 1 400px'}}>
          <button onClick={() => navigate(-1)} className="btn btn-outline" style={{marginBottom: '1rem', border: 'none', padding: 0}}>← Back</button>
          <h2 style={{marginTop: 0, color: 'var(--color-primary)', fontSize: '2rem'}}>{item.title}</h2>
          <span style={{fontSize: '0.85rem', fontWeight: 600, background: item.status === 'RESOLVED' ? '#10b981' : (item.postType==='LOST'?'#ef4444':'#3b82f6'), color: 'white', padding: '4px 12px', borderRadius: '12px'}}>{item.status.replace(/_/g, ' ')}</span>
          <p style={{fontSize: '1.1rem', lineHeight: 1.6, marginTop: '1.5rem', color: 'var(--text-secondary)'}}>{item.description}</p>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontWeight: 500}}>
            <MapPin size={18} color="var(--color-accent)" /> {item.location}
          </div>
          <a href={`mailto:${item.authorEmail}?subject=Regarding ${item.postType} Item: ${item.title}`} className="btn btn-primary" style={{textDecoration: 'none', display: 'inline-flex'}}>
            <Mail size={18} /> Contact Finder
          </a>
        </div>
        <div style={{flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {item.imageUrl && (
            <img src={item.imageUrl} alt={item.title} style={{width: '100%', height: '250px', objectFit: 'cover', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)'}} />
          )}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: '250px', width: '100%' }}>
            <MapContainer center={pos} zoom={18} maxZoom={19} style={{ height: '100%', width: '100%', zIndex: 1 }}>
              <MapResizer />
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" maxZoom={19} />
              <Marker position={pos} />
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

const EditPost = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const id = pathname.split('/').pop();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    postType: 'FOUND', status: 'LEFT_AT_SCENE', title: '', description: '', location: 'Library'
  });
  const [position, setPosition] = useState(null);

  useEffect(() => {
    import('./api').then(({ getItem }) => {
      getItem(id).then(data => {
        setFormData({
          postType: data.postType,
          status: data.status,
          title: data.title,
          description: data.description,
          location: data.location
        });
        if (data.lat && data.lng) setPosition([data.lat, data.lng]);
      }).catch(err => setError(err.message)).finally(() => setInitialLoading(false));
    });
  }, [id]);

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
      const { updateItem } = await import('./api');
      await updateItem(id, payload);
      navigate(`/item/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const LOCATIONS = ['Library', 'Engineering Building 1', 'Engineering Building 3', 'Student Cafeteria', 'Student Activity Center', 'Admin Office (Lost & Found)', 'Gymnasium', 'Dormitory Area', 'Main Gate', 'Other'];

  if (initialLoading) return <div style={{textAlign: 'center', padding: '3rem'}}>Loading...</div>;

  return (
    <div className="glass-panel" style={{padding: '3rem', maxWidth: '600px', margin: '0 auto'}}>
      <h2 style={{color: 'var(--color-primary)', marginBottom: '2rem'}}>Edit Post</h2>
      {error && <div style={{background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem'}}>{error}</div>}
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Title</label>
          <input required type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box'}} />
        </div>
        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Description</label>
          <textarea rows="4" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit'}} />
        </div>
        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)'}}>General Location Area</label>
          <select 
            value={formData.location} 
            onChange={(e) => {
              setFormData({...formData, location: e.target.value});
              if (CAMPUS_LOCATIONS[e.target.value]) {
                setPosition(CAMPUS_LOCATIONS[e.target.value]);
              }
            }} 
            style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', marginBottom: '1rem'}}
          >
            {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Exact Location Pin</label>
          <LocationPickerMap position={position} setPosition={setPosition} />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary" style={{marginTop: '1rem', justifyContent: 'center', padding: '1rem'}}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

const Dashboard = () => (
  <div className="glass-panel" style={{padding: '3rem', textAlign: 'center'}}>
    <h2 style={{color: 'var(--color-primary)', fontSize: '2.5rem', marginBottom: '1rem'}}>Welcome to NYCU Lost & Found</h2>
    <p style={{color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '2rem'}}>
      Help keep our campus connected. Did you lose something, or find something left behind?
    </p>
    <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
      <Link to="/map" className="btn btn-primary" style={{padding: '1rem 2rem', fontSize: '1.1rem'}}>Open Campus Map</Link>
      <Link to="/lost" className="btn btn-outline" style={{padding: '1rem 2rem', fontSize: '1.1rem'}}>Browse Lost Items</Link>
      <Link to="/found" className="btn btn-outline" style={{padding: '1rem 2rem', fontSize: '1.1rem'}}>Browse Found Items</Link>
    </div>
  </div>
)

const ItemsList = ({ type }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchData();
  }, [type]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getItems(type.toUpperCase());
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await resolveItem(id);
      fetchData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteItem(id);
      fetchData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (loading) return <div style={{textAlign: 'center', padding: '3rem', color: 'var(--color-primary)'}}>Loading items...</div>;
  if (error) return <div style={{color: '#ef4444', padding: '2rem', textAlign: 'center'}}>Error: {error}</div>;

  return (
    <div>
      <div className="page-header">
        <h2>{type} Items</h2>
        <p>Browse all recently {type.toLowerCase()} items on campus.</p>
      </div>
      
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem'}}>
        {items.length === 0 && <p style={{color: 'var(--text-secondary)'}}>No items found.</p>}
        {items.map(item => (
          <div key={item.id} className="glass-panel" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', opacity: item.status === 'RESOLVED' ? 0.6 : 1, transition: 'opacity 0.2s ease'}}>
            {item.imageUrl && (
              <img 
                src={item.imageUrl} 
                alt={item.title} 
                style={{width: '100%', height: '220px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '1rem', filter: item.status === 'RESOLVED' ? 'grayscale(100%)' : 'none'}} 
              />
            )}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <h3 style={{margin: '0 0 0.5rem 0', color: 'var(--color-primary)', fontSize: '1.25rem'}}>{item.title}</h3>
              <span style={{
                background: item.status === 'RESOLVED' ? '#10b981' : (type==='Lost'?'#ef4444':'#3b82f6'),
                color: 'white', padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600
              }}>
                {item.status.replace(/_/g, ' ')}
              </span>
            </div>
            
            <p style={{margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem', flex: 1, lineHeight: 1.5}}>
              {item.description}
            </p>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500}}>
              <MapPin size={16} color="var(--color-accent)" /> {item.location}
            </div>
            
            <div style={{display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)', flexWrap: 'wrap'}}>
              <Link to={`/item/${item.id}`} className="btn btn-outline" style={{flex: 1, justifyContent: 'center', textDecoration: 'none'}}>
                View Details
              </Link>
              
              {item.status !== 'RESOLVED' && (
                <>
                  <Link 
                    to={`/map?lat=${(item.lat && item.lng) ? item.lat : (CAMPUS_LOCATIONS[item.location] ? CAMPUS_LOCATIONS[item.location][0] : CAMPUS_CENTER[0])}&lng=${(item.lat && item.lng) ? item.lng : (CAMPUS_LOCATIONS[item.location] ? CAMPUS_LOCATIONS[item.location][1] : CAMPUS_CENTER[1])}&id=${item.id}`} 
                    className="btn btn-primary" 
                    title="View on Map"
                  >
                    <MapPin size={16} />
                  </Link>
                  
                  <Link to={`/edit/${item.id}`} className="btn btn-outline" title="Edit Post">
                    Edit
                  </Link>
                </>
              )}
              
              {item.status !== 'RESOLVED' && (
                <button onClick={() => handleResolve(item.id)} className="btn btn-primary" title="Mark as Resolved">
                  <CheckCircle size={16} />
                </button>
              )}
              <button onClick={() => handleDelete(item.id)} className="btn btn-outline" style={{color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)'}} title="Delete">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Output as jpeg with 0.8 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const CreatePost = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    postType: 'FOUND',
    status: 'LEFT_AT_SCENE',
    title: '',
    description: '',
    location: 'Library',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [position, setPosition] = useState(null);

  const handleImageSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // 10MB strict limit for original file
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
      const { analyzeImage } = await import('./api');
      const { tags } = await analyzeImage(base64Str);
      
      setFormData(prev => {
        const newTags = Array.from(new Set([...prev.tags, ...tags]));
        // Auto-fill title if empty
        const newTitle = prev.title === '' && tags.length > 0 ? tags[0] : prev.title;
        return { ...prev, tags: newTags, title: newTitle };
      });
    } catch (err) {
      console.error("AI Analysis failed:", err);
      // Don't block upload if AI fails, just log it.
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
      navigate(formData.postType === 'LOST' ? '/lost' : '/found');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const LOCATIONS = ['Library', 'Engineering Building 1', 'Engineering Building 3', 'Student Cafeteria', 'Student Activity Center', 'Admin Office (Lost & Found)', 'Gymnasium', 'Dormitory Area', 'Main Gate', 'Other'];

  return (
    <div className="glass-panel" style={{padding: '3rem', maxWidth: '600px', margin: '0 auto'}}>
      <h2 style={{color: 'var(--color-primary)', marginBottom: '2rem'}}>Report an Item</h2>
      
      {error && <div style={{background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem'}}>{error}</div>}
      
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Image (Upload first to auto-fill details)</label>
          
          {imagePreview && (
            <div style={{marginBottom: '1rem'}}>
              <img src={imagePreview} alt="Preview" style={{width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '8px', boxShadow: 'var(--shadow-sm)'}} />
              <button type="button" onClick={() => { setFile(null); setImagePreview(null); }} className="btn btn-outline" style={{marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.4rem 0.8rem'}}>
                Change Image
              </button>
            </div>
          )}

          {!imagePreview && (
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp"
              onChange={handleImageSelect}
              style={{width: '100%', padding: '0.8rem', background: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1'}}
            />
          )}
          {analyzing && <p style={{fontSize: '0.85rem', color: '#3b82f6', marginTop: '0.5rem'}}>✨ Analyzing image with AI...</p>}
        </div>

        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Tags</label>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem'}}>
            {formData.tags.map(tag => (
              <span key={tag} style={{background: '#e2e8f0', color: '#475569', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem'}}>
                {tag}
                <button type="button" onClick={() => removeTag(tag)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0, fontSize: '1rem', lineHeight: 1}}>&times;</button>
              </span>
            ))}
          </div>
          <div style={{display: 'flex', gap: '0.5rem'}}>
            <input 
              type="text" 
              placeholder="Add manual tag (e.g. Red, Backpack)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag(e)}
              style={{flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1'}}
            />
            <button type="button" onClick={addTag} className="btn btn-outline">Add Tag</button>
          </div>
        </div>

        <div style={{display: 'flex', gap: '1rem'}}>
          <div style={{flex: 1}}>
            <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Type</label>
            <select 
              value={formData.postType}
              onChange={(e) => setFormData({...formData, postType: e.target.value, status: e.target.value === 'LOST' ? 'OPEN' : 'LEFT_AT_SCENE'})}
              style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white'}}
            >
              <option value="FOUND">I Found Something</option>
              <option value="LOST">I Lost Something</option>
            </select>
          </div>
          <div style={{flex: 1}}>
            <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Status</label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white'}}
            >
              {formData.postType === 'LOST' ? (
                <option value="OPEN">Open (Still Lost)</option>
              ) : (
                <>
                  <option value="LEFT_AT_SCENE">Left at the Scene</option>
                  <option value="WITH_FINDER">I kept it with me</option>
                  <option value="AT_OFFICE">Turned in to Office</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Title / Short Description</label>
          <input 
            required
            type="text" 
            placeholder="e.g. Blue Hydroflask, Apple AirPods..."
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box'}}
          />
        </div>

        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)'}}>General Location Area</label>
          <select 
            value={formData.location}
            onChange={(e) => {
              setFormData({...formData, location: e.target.value});
              if (CAMPUS_LOCATIONS[e.target.value]) {
                setPosition(CAMPUS_LOCATIONS[e.target.value]);
              }
            }}
            style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', marginBottom: '1rem'}}
          >
            {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
          
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Exact Location Pin (Optional)</label>
          <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>Click on the map to drop a pin where the item was lost or found.</p>
          <LocationPickerMap position={position} setPosition={setPosition} />
          {position && <p style={{fontSize: '0.85rem', color: 'var(--color-primary)', marginTop: '0.5rem', fontWeight: 500}}>📍 Location pinned successfully</p>}
        </div>

        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Details</label>
          <textarea 
            rows="4"
            placeholder="Any specific details, colors, brands, exact spot..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit'}}
          />
        </div>

        <button type="submit" disabled={loading || analyzing} className="btn btn-primary" style={{marginTop: '1rem', justifyContent: 'center', padding: '1rem'}}>
          {loading ? 'Posting Item...' : 'Post Item'}
        </button>
      </form>
    </div>
  );
}

const components = {
  Header() {
    return (
      <div className="auth-header">
        <h1>NYCU Lost & Found</h1>
        <p>Campus Item Recovery Platform</p>
      </div>
    );
  }
};

const AdminDashboard = () => {
  const { user } = useAuthenticator((context) => [context.user]);
  const currentUsername = user?.username || user?.signInDetails?.loginId;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [promoting, setPromoting] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      if (err.message.includes('403') || err.message.includes('Forbidden')) {
        setError('403 Access Denied: You must be an administrator to view this page.');
      } else {
        setError('Error fetching users: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (username) => {
    if (!window.confirm(`Are you sure you want to promote ${username} to Admin?`)) return;
    try {
      setPromoting(username);
      await promoteUser(username);
      alert(`${username} has been promoted to Admin successfully.`);
      fetchUsers();
    } catch (err) {
      alert("Error promoting user: " + err.message);
    } finally {
      setPromoting(null);
    }
  };

  if (loading && users.length === 0) return <div style={{textAlign: 'center', padding: '3rem', color: 'var(--color-primary)'}}>Loading admin dashboard...</div>;

  if (error) return (
    <div className="glass-panel" style={{padding: '3rem', maxWidth: '600px', margin: '2rem auto', textAlign: 'center'}}>
      <ShieldAlert size={48} color="#ef4444" style={{marginBottom: '1rem'}} />
      <h2 style={{color: '#ef4444', marginBottom: '1rem'}}>Access Denied</h2>
      <p style={{color: 'var(--text-secondary)'}}>{error}</p>
    </div>
  );

  return (
    <div className="glass-panel" style={{padding: '2rem', margin: '0 auto', maxWidth: '900px'}}>
      <div className="page-header" style={{marginBottom: '2rem'}}>
        <h2 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)'}}>
          <Users size={28} /> Admin Dashboard
        </h2>
        <p>Manage users and platform access</p>
      </div>

      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
          <thead>
            <tr style={{borderBottom: '2px solid rgba(0,0,0,0.1)'}}>
              <th style={{padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600}}>Email</th>
              <th style={{padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600}}>Status</th>
              <th style={{padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.username} style={{borderBottom: '1px solid rgba(0,0,0,0.05)'}}>
                <td style={{padding: '1rem 0.5rem', fontWeight: 500, color: 'var(--color-primary)'}}>{u.email || 'N/A'}</td>
                <td style={{padding: '1rem 0.5rem'}}>
                  <span style={{background: u.status === 'CONFIRMED' ? '#10b981' : '#f59e0b', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600}}>
                    {u.status}
                  </span>
                </td>
                <td style={{padding: '1rem 0.5rem'}}>
                  {u.username === currentUsername || u.isAdmin ? (
                    <span style={{color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem'}}>Already Admin</span>
                  ) : (
                    <button 
                      onClick={() => handlePromote(u.username)} 
                      disabled={promoting === u.username}
                      className="btn btn-outline"
                      style={{padding: '0.4rem 0.8rem', fontSize: '0.85rem'}}
                    >
                      {promoting === u.username ? 'Promoting...' : 'Promote to Admin'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="3" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)'}}>No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


const Navigation = () => {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    import('aws-amplify/auth').then(({ fetchAuthSession }) => {
      fetchAuthSession().then(session => {
        const groups = session.tokens?.idToken?.payload?.['cognito:groups'] || [];
        setIsAdmin(groups.includes('Admins'));
      }).catch(console.error);
    });
  }, []);

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <MapPin size={24} color="var(--color-accent)" />
        NYCU Lost & Found
      </Link>
      
      <div className="nav-links">
        <Link to="/map" className={`nav-link ${location.pathname === '/map' ? 'active' : ''}`}>Map View</Link>
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Dashboard</Link>
        <Link to="/lost" className={`nav-link ${location.pathname === '/lost' ? 'active' : ''}`}>Lost Items</Link>
        <Link to="/found" className={`nav-link ${location.pathname === '/found' ? 'active' : ''}`}>Found Items</Link>
        {isAdmin && (
          <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
            <ShieldAlert size={16} style={{display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom'}} /> 
            Admin Panel
          </Link>
        )}
        <Link to="/create" className="btn btn-primary" style={{textDecoration: 'none'}}>
          <PlusCircle size={18} /> Report Item
        </Link>
      </div>

      <div className="nav-user">
        <span style={{marginRight: '1.5rem', color: 'var(--text-secondary)', fontWeight: 500}}>
          {user?.signInDetails?.loginId}
        </span>
        <button className="btn btn-outline" onClick={signOut}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  );
};

function AppContent() {
  const location = useLocation();
  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content" style={location.pathname === '/map' ? {padding: 0, maxWidth: '100%'} : {}}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<InteractiveMap />} />
          <Route path="/lost" element={<ItemsList type="Lost" />} />
          <Route path="/found" element={<ItemsList type="Found" />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/item/:id" element={<ItemDetails />} />
          <Route path="/edit/:id" element={<EditPost />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Authenticator components={components} hideSignUp={false} loginMechanisms={['email']}>
      {({ signOut, user }) => (
        <AppContent />
      )}
    </Authenticator>
  );
}
