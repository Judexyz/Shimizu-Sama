import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { LogOut } from 'lucide-react';

axios.defaults.withCredentials = true;

export default function DashboardLayout() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check auth status
    axios.get('/api/users/@me')
      .then(res => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        // Not authenticated, redirect
        navigate('/');
      });
  }, [navigate]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  return (
    <div>
      <nav className="navbar">
        <Link to="/dashboard" className="nav-brand">
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f111a' }}>S</div>
          Shimizu
        </Link>
        <div className="nav-user">
          <span style={{ fontWeight: 500 }}>{user.username}</span>
          <img 
            src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
            alt="Avatar" 
            className="avatar" 
          />
          <button 
            className="btn" 
            style={{ background: 'transparent', color: 'var(--danger)', padding: '8px' }}
            onClick={() => {
              document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              navigate('/');
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <div className="container">
        <Outlet />
      </div>
    </div>
  );
}
