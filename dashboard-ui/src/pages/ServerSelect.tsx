import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function ServerSelect() {
  const [guilds, setGuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/guilds')
      .then(res => {
        setGuilds(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading your servers...</div>;
  }

  if (guilds.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '50px' }}>
        <h2>No Servers Found</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '15px' }}>
          It looks like you don't manage any servers that Shimizu is in.<br />
          Make sure you have the "Manage Server" permission and the bot is invited.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Select a Server</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {guilds.map(guild => (
          <Link key={guild.id} to={`/dashboard/${guild.id}`} style={{ textDecoration: 'none' }}>
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}>
              {guild.icon ? (
                <img src={guild.icon} alt={guild.name} style={{ width: '60px', height: '60px', borderRadius: '50%' }} />
              ) : (
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f111a', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {guild.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{guild.name}</h3>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage Server</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
