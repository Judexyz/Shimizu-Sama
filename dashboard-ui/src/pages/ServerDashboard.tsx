import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save } from 'lucide-react';

export default function ServerDashboard() {
  const { guildId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await axios.post(`/api/guilds/${guildId}/settings`, {
        ...data.settings,
        ...data.ticketSettings
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save settings');
    }
    setSaving(false);
  };

  const handleChange = (field: string, value: any, category: 'settings' | 'ticketSettings' = 'settings') => {
    setData((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading server config...</div>;
  if (error && !data) return <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: '50px' }}>{error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
        <Link to="/dashboard" style={{ color: 'var(--text-main)' }}>
          <ArrowLeft />
        </Link>
        <h1 style={{ margin: 0 }}>Server Dashboard</h1>
      </div>

      {/* Statistics Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '20px' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '10px' }}>Total Members</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>{data.stats.memberCount}</p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '20px' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '10px' }}>Open Tickets</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>{data.stats.openTickets}</p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '20px' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '10px' }}>Total Economy Coins</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)', margin: 0 }}>{data.stats.totalCoins.toLocaleString()}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
        {/* Core Systems */}
        <div className="glass-panel">
          <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '24px', background: 'var(--primary)', borderRadius: '4px' }}></div>
            Core Systems
          </h2>
          
          <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label className="form-label">Economy System</label>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Enable global economy, daily rewards, and shops.</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={data.settings.economyEnabled} onChange={(e) => handleChange('economyEnabled', e.target.checked)} />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <div>
              <label className="form-label">Leveling System</label>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Grant XP for chatting and unlock role rewards.</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={data.settings.levelingEnabled} onChange={(e) => handleChange('levelingEnabled', e.target.checked)} />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Leveling Config */}
        <div className="glass-panel">
          <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '24px', background: 'var(--secondary)', borderRadius: '4px' }}></div>
            Leveling Config
          </h2>
          
          <div className="form-group">
            <label className="form-label">Level Up Channel</label>
            <select 
              value={data.settings.levelUpChannelId || ''} 
              onChange={(e) => handleChange('levelUpChannelId', e.target.value)}
              style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', fontFamily: 'inherit' }}
            >
              <option value="">Default (Current Channel)</option>
              {data.channels.filter((c: any) => c.type === 0).map((c: any) => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Custom Level Up Message</label>
            <textarea 
              value={data.settings.levelUpMessage || ''} 
              onChange={(e) => handleChange('levelUpMessage', e.target.value)}
              placeholder="GG {user}, you just advanced to level {level}!"
              style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', minHeight: '80px', fontFamily: 'inherit' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Use {"{user}"} and {"{level}"} as placeholders.</span>
          </div>
        </div>

        {/* Ticket Config */}
        <div className="glass-panel">
          <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '24px', background: 'var(--success)', borderRadius: '4px' }}></div>
            Ticket System Config
          </h2>
          
          <div className="form-group">
            <label className="form-label">Support Role</label>
            <select 
              value={data.ticketSettings.supportRoleId || ''} 
              onChange={(e) => handleChange('supportRoleId', e.target.value, 'ticketSettings')}
              style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', fontFamily: 'inherit' }}
            >
              <option value="">None</option>
              {data.roles.map((r: any) => (
                <option key={r.id} value={r.id}>@{r.name}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>This role can view and manage tickets.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Ticket Category</label>
            <select 
              value={data.ticketSettings.categoryId || ''} 
              onChange={(e) => handleChange('categoryId', e.target.value, 'ticketSettings')}
              style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', fontFamily: 'inherit' }}
            >
              <option value="">No Category</option>
              {data.channels.filter((c: any) => c.type === 4).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Transcript Channel</label>
            <select 
              value={data.ticketSettings.transcriptChannelId || ''} 
              onChange={(e) => handleChange('transcriptChannelId', e.target.value, 'ticketSettings')}
              style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', fontFamily: 'inherit' }}
            >
              <option value="">No Transcripts</option>
              {data.channels.filter((c: any) => c.type === 0).map((c: any) => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: '30px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {success && <span style={{ color: 'var(--success)', fontWeight: 500 }}>Saved successfully!</span>}
        {error && <span style={{ color: 'var(--danger)', fontWeight: 500 }}>{error}</span>}
      </div>

    </div>
  );
}
