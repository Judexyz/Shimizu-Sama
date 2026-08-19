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
  const [autoroles, setAutoroles] = useState<string[]>([]);
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
      
      const roleRes = await axios.get(`/api/guilds/${guildId}/autoroles`);
      setAutoroles(roleRes.data || []);
      
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
      await axios.post(`/api/guilds/${guildId}/autoroles`, { roleIds: autoroles });
      alert('Settings saved successfully!');
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

      <div className="glass-panel" style={{ marginTop: '30px', opacity: config.enabled ? 1 : 0.5, pointerEvents: config.enabled ? 'auto' : 'none' }}>
        <h2 style={{ marginBottom: '20px' }}>Automatic Roles (Autorole)</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '15px', fontSize: '0.9rem' }}>
          Select roles to automatically give to members the moment they join your server.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', maxHeight: '300px', overflowY: 'auto', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          {data.roles.filter((role: any) => role.name !== '@everyone' && !role.managed).map((role: any) => (
            <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '5px' }}>
              <input 
                type="checkbox" 
                checked={autoroles.includes(role.id)}
                onChange={(e) => {
                  if (e.target.checked) setAutoroles([...autoroles, role.id]);
                  else setAutoroles(autoroles.filter(id => id !== role.id));
                }}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ color: role.hexColor !== '#000000' ? role.hexColor : '#fff', fontWeight: 500 }}>{role.name}</span>
            </label>
          ))}
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
