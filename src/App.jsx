import React, { useState, useEffect } from 'react'
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Search, PlusCircle, MapPin, LayoutDashboard, CheckCircle, Trash2, Mail } from 'lucide-react'
import { getItems, createItem, resolveItem, deleteItem } from './api'

const Dashboard = () => (
  <div className="glass-panel" style={{padding: '3rem', textAlign: 'center'}}>
    <h2 style={{color: 'var(--color-primary)', fontSize: '2.5rem', marginBottom: '1rem'}}>Welcome to NYCU Lost & Found</h2>
    <p style={{color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '2rem'}}>
      Help keep our campus connected. Did you lose something, or find something left behind?
    </p>
    <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
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
          <div key={item.id} className="glass-panel" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column'}}>
            {item.imageUrl && (
              <img 
                src={item.imageUrl} 
                alt={item.title} 
                style={{width: '100%', height: '220px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '1rem'}} 
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
            
            <div style={{display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)'}}>
              <a href={`mailto:${item.authorEmail}?subject=Regarding ${type} Item: ${item.title}`} className="btn btn-outline" style={{flex: 1, justifyContent: 'center', textDecoration: 'none'}}>
                <Mail size={16} /> Contact
              </a>
              
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

const CreatePost = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    postType: 'FOUND',
    status: 'LEFT_AT_SCENE',
    title: '',
    description: '',
    location: 'Library'
  });
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createItem(formData, file);
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
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Location</label>
          <select 
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white'}}
          >
            {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
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

        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Image (Optional)</label>
          <input 
            type="file" 
            accept="image/png, image/jpeg, image/webp"
            onChange={(e) => setFile(e.target.files[0])}
            style={{width: '100%', padding: '0.8rem', background: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1'}}
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{marginTop: '1rem', justifyContent: 'center', padding: '1rem'}}>
          {loading ? 'Submitting to DynamoDB...' : 'Post Item'}
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

const Navigation = () => {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const location = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <MapPin size={24} color="var(--color-accent)" />
        NYCU Lost & Found
      </Link>
      
      <div className="nav-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Dashboard</Link>
        <Link to="/lost" className={`nav-link ${location.pathname === '/lost' ? 'active' : ''}`}>Lost Items</Link>
        <Link to="/found" className={`nav-link ${location.pathname === '/found' ? 'active' : ''}`}>Found Items</Link>
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
  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/lost" element={<ItemsList type="Lost" />} />
          <Route path="/found" element={<ItemsList type="Found" />} />
          <Route path="/create" element={<CreatePost />} />
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
