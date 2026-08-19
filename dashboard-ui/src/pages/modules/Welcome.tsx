import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Save } from 'lucide-react';

export default function Welcome() {
  const { guildId, data }: any = useOutletContext();
  const [config, setConfig] = useState({
    enabled: false,
    channelId: '',
    message: '',
    goodbyeChannelId: '',
    goodbyeMessage: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, [guildId]);

  const fetchConfig = async () => {
    try {
      const res = await axios.get(`/api/guilds/${guildId}/welcome`);
      if (res.data) {
        setConfig({
          enabled: res.data.enabled || false,
          channelId: res.data.channelId || '',
          message: res.data.message || '',
          goodbyeChannelId: res.data.goodbyeChannelId || '',
          goodbyeMessage: res.data.goodbyeMessage || ''
        });
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`/api/guilds/${guildId}/welcome`, config);
      alert('Welcome settings saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Welcome & Leave Messages</h1>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={config.enabled}
            onChange={(e) => setConfig({...config, enabled: e.target.checked})}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
        Automatically greet new members and say goodbye when they leave. 
        <br/><br/>
        <strong>Available Variables:</strong><br/>
        <code>{`{user}`}</code> - Mentions the user<br/>
        <code>{`{user.name}`}</code> - User's display name<br/>
        <code>{`{server}`}</code> - The server's name<br/>
        <code>{`{memberCount}`}</code> - Total number of members
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
        
        {/* Welcome Config */}
        <div className="glass-panel" style={{ opacity: config.enabled ? 1 : 0.5, pointerEvents: config.enabled ? 'auto' : 'none' }}>
          <h2 style={{ marginBottom: '20px' }}>Welcome Message</h2>
          
          <div className="form-group">
            <label className="form-label">Welcome Channel</label>
            <select 
              value={config.channelId}
              onChange={(e) => setConfig({...config, channelId: e.target.value})}
              className="form-control"
            >
              <option value="">Select a channel...</option>
              {data.channels.filter((ch: any) => ch.type === 0 || ch.type === 5).map((ch: any) => (
                <option key={ch.id} value={ch.id}>#{ch.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label className="form-label">Message Text</label>
            <textarea 
              value={config.message}
              onChange={(e) => setConfig({...config, message: e.target.value})}
              className="form-control"
              style={{ minHeight: '150px' }}
              placeholder={`Welcome to {server}, {user}! We now have {memberCount} members!`}
            />
          </div>
        </div>

        {/* Leave Config */}
        <div className="glass-panel" style={{ opacity: config.enabled ? 1 : 0.5, pointerEvents: config.enabled ? 'auto' : 'none' }}>
          <h2 style={{ marginBottom: '20px' }}>Goodbye Message</h2>
          
          <div className="form-group">
            <label className="form-label">Goodbye Channel</label>
            <select 
              value={config.goodbyeChannelId}
              onChange={(e) => setConfig({...config, goodbyeChannelId: e.target.value})}
              className="form-control"
            >
              <option value="">Select a channel...</option>
              {data.channels.filter((ch: any) => ch.type === 0 || ch.type === 5).map((ch: any) => (
                <option key={ch.id} value={ch.id}>#{ch.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label className="form-label">Message Text</label>
            <textarea 
              value={config.goodbyeMessage}
              onChange={(e) => setConfig({...config, goodbyeMessage: e.target.value})}
              className="form-control"
              style={{ minHeight: '150px' }}
              placeholder={`We're sad to see you go, {user.name} :(`}
            />
          </div>
        </div>

      </div>

      <button 
        onClick={handleSave}
        className="btn btn-primary" 
        style={{ marginTop: '30px', padding: '12px 30px', fontSize: '1.1rem' }}
      >
        <Save size={20} style={{ marginRight: '8px' }} />
        Save Configuration
      </button>

    </div>
  );
}
