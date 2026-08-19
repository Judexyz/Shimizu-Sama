import { useEffect, useState } from 'react';
import { useParams, Link, Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';
import { LayoutDashboard, Shield, Ticket, Coins, Terminal, ArrowLeft, UserPlus, Tag } from 'lucide-react';

export default function ServerLayout() {
  const { guildId } = useParams();
  const location = useLocation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get(`/api/guilds/${guildId}/settings`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to load server data');
        setLoading(false);
      });
  }, [guildId]);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading server config...</div>;
  if (error && !data) return <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: '50px' }}>{error}</div>;

  const currentPath = location.pathname;

  return (
    <div className="server-layout">
      <div className="sidebar">
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '20px', padding: '0 16px' }}>
          <ArrowLeft size={18} />
          Back to Servers
        </Link>
        
        <Link 
          to={`/dashboard/${guildId}`} 
          className={`sidebar-item ${currentPath === `/dashboard/${guildId}` ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          Overview
        </Link>

        <Link 
          to={`/dashboard/${guildId}/welcome`} 
          className={`sidebar-item ${currentPath.includes('/welcome') ? 'active' : ''}`}
        >
          <UserPlus size={20} />
          Welcome & Leave
        </Link>

        <Link 
          to={`/dashboard/${guildId}/button-roles`} 
          className={`sidebar-item ${currentPath.includes('/button-roles') ? 'active' : ''}`}
        >
          <Tag size={20} />
          Button Roles
        </Link>

        <Link 
          to={`/dashboard/${guildId}/tickets`} 
          className={`sidebar-item ${currentPath.includes('/tickets') ? 'active' : ''}`}
        >
          <Ticket size={20} />
          Tickets
        </Link>

        <Link 
          to={`/dashboard/${guildId}/economy`} 
          className={`sidebar-item ${currentPath.includes('/economy') ? 'active' : ''}`}
        >
          <Coins size={20} />
          Economy & Leveling
        </Link>

        <Link 
          to={`/dashboard/${guildId}/moderation`} 
          className={`sidebar-item ${currentPath.includes('/moderation') ? 'active' : ''}`}
        >
          <Shield size={20} />
          Moderation
        </Link>
        
        <Link 
          to={`/dashboard/${guildId}/custom-commands`} 
          className={`sidebar-item ${currentPath.includes('/custom-commands') ? 'active' : ''}`}
        >
          <Terminal size={20} />
          Custom Commands
        </Link>

      </div>

      <div className="main-content">
        <Outlet context={{ data, setData, guildId }} />
      </div>
    </div>
  );
}
