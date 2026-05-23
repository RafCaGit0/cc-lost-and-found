import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { getUsers, promoteUser } from '../api';

export default function AdminPanel() {
  const { userEmail } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [alertDialog, setAlertDialog] = useState(null);

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

  const requestPromote = (username) => {
    setConfirmDialog({
      title: 'Promote User',
      message: `Are you sure you want to promote ${username} to Admin? They will have full access to manage all posts.`,
      confirmLabel: 'Promote to Admin',
      onConfirm: () => handlePromote(username)
    });
  };

  const handlePromote = async (username) => {
    setConfirmDialog(null);
    try {
      await promoteUser(username);
      setAlertDialog({
        title: 'Success',
        message: `${username} has been promoted to Admin successfully.`,
      });
      fetchUsers();
    } catch (err) {
      setAlertDialog({
        title: 'Error',
        message: "Error promoting user: " + err.message,
        variant: 'danger'
      });
    }
  };

  if (loading && users.length === 0) return <LoadingSpinner label="Loading admin dashboard..." />;

  if (error) return (
    <div className="glass-panel fade-in" style={{padding: '3rem', maxWidth: '600px', margin: '2rem auto', textAlign: 'center'}}>
      <ShieldAlert size={48} color="var(--color-danger)" style={{marginBottom: '1rem'}} />
      <h2 style={{color: 'var(--color-danger)', marginBottom: '1rem'}}>Access Denied</h2>
      <p style={{color: 'var(--text-secondary)'}}>{error}</p>
    </div>
  );

  return (
    <div className="glass-panel fade-in" style={{padding: '2rem', margin: '0 auto', maxWidth: '900px'}}>
      
      <ConfirmDialog 
        open={!!confirmDialog}
        {...(confirmDialog || {})}
        onCancel={() => setConfirmDialog(null)}
      />
      
      <ConfirmDialog 
        open={!!alertDialog}
        title={alertDialog?.title}
        message={alertDialog?.message}
        variant={alertDialog?.variant || 'default'}
        confirmLabel="OK"
        onConfirm={() => setAlertDialog(null)}
        onCancel={() => setAlertDialog(null)}
      />

      <div style={{marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem'}}>
        <div>
          <h2 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', margin: '0 0 0.5rem 0'}}>
            <Users size={28} /> Admin Dashboard
          </h2>
          <p style={{color: 'var(--text-secondary)', margin: 0}}>Manage users and platform access</p>
        </div>
        <div style={{background: 'var(--color-secondary)', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600}}>
          {users.length} registered users
        </div>
      </div>

      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
          <thead>
            <tr style={{borderBottom: '2px solid var(--border-color)'}}>
              <th style={{padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600}}>Email</th>
              <th style={{padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600}}>Status</th>
              <th style={{padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.username} style={{borderBottom: '1px solid rgba(0,0,0,0.05)'}}>
                <td style={{padding: '1rem 0.5rem', fontWeight: 500, color: 'var(--color-primary)'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    {u.email || 'N/A'}
                  </div>
                </td>
                <td style={{padding: '1rem 0.5rem'}}>
                  <span style={{
                    background: u.status === 'CONFIRMED' ? 'var(--color-resolved)' : '#f59e0b', 
                    color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600
                  }}>
                    {u.status}
                  </span>
                </td>
                <td style={{padding: '1rem 0.5rem'}}>
                  {u.email === userEmail || u.isAdmin ? (
                    <span style={{color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem'}}>Already Admin</span>
                  ) : (
                    <button 
                      onClick={() => requestPromote(u.username)} 
                      className="btn btn-outline"
                      style={{padding: '0.4rem 0.8rem', fontSize: '0.85rem'}}
                    >
                      Promote to Admin
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
}
