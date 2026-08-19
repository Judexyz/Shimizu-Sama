import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Save } from 'lucide-react';

export default function Tickets() {
  const { data, setData, guildId }: any = useOutletContext();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setData((prev: any) => ({
      ...prev,
      ticketSettings: { ...prev.ticketSettings, [field]: value }
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
      <h1 style={{ marginBottom: '30px' }}>Tickets Config</h1>

      <div className="glass-panel" style={{ maxWidth: '600px' }}>
        <div className="form-group">
          <label className="form-label">Support Role</label>
          <select 
            value={data.ticketSettings.supportRoleId || ''} 
            onChange={(e) => handleChange('supportRoleId', e.target.value)}
            style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', fontFamily: 'inherit' }}
          >
            <option value="">None</option>
            {data.roles.map((r: any) => (
              <option key={r.id} value={r.id}>@{r.name}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>This role can view and manage tickets.</span>
        </div>

        <div className="form-group" style={{ marginTop: '20px' }}>
          <label className="form-label">Ticket Category</label>
          <select 
            value={data.ticketSettings.categoryId || ''} 
            onChange={(e) => handleChange('categoryId', e.target.value)}
            style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', fontFamily: 'inherit' }}
          >
            <option value="">No Category</option>
            {data.channels.filter((c: any) => c.type === 4).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginTop: '20px' }}>
          <label className="form-label">Transcript Channel</label>
          <select 
            value={data.ticketSettings.transcriptChannelId || ''} 
            onChange={(e) => handleChange('transcriptChannelId', e.target.value)}
            style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', fontFamily: 'inherit' }}
          >
            <option value="">No Transcripts</option>
            {data.channels.filter((c: any) => c.type === 0).map((c: any) => (
              <option key={c.id} value={c.id}>#{c.name}</option>
            ))}
          </select>
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
    </div>
  );
}
