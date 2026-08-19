import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Save } from 'lucide-react';

export default function Economy() {
  const { data, setData, guildId }: any = useOutletContext();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      settings: { ...prev.settings, [field]: value }
    }));
  };

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

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Economy & Leveling Config</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
        
        {/* Core Systems */}
        <div className="glass-panel">
          <h2 style={{ marginBottom: '20px' }}>Global Settings</h2>
          
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Command Prefix</label>
            <input 
              type="text" 
              value={data.settings.prefix || 's!'} 
              onChange={(e) => handleChange('prefix', e.target.value)}
              style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', fontFamily: 'inherit' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>The prefix used for bot commands (e.g. {data.settings.prefix || 's!'}help).</span>
          </div>

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
          <h2 style={{ marginBottom: '20px' }}>Level Up Rewards</h2>
          
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

          <div className="form-group" style={{ marginTop: '20px' }}>
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

      </div>

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
