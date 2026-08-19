import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Save } from 'lucide-react';

export default function Moderation() {
  const { guildId, data }: any = useOutletContext();
  const [logConfig, setLogConfig] = useState<any>({});
  const [autoModRules, setAutoModRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    axios.get(`/api/guilds/${guildId}/moderation`)
      .then(res => {
        setLogConfig(res.data.logConfig);
        
        // Ensure default rules exist in state
        const rules = res.data.autoModRules;
        const defaultRules = [
          { type: 'Anti-Link', enabled: false, action: 'Delete & Warn', data: null },
          { type: 'Bad Words', enabled: false, action: 'Delete & Warn', data: { words: '' } }
        ];

        const mergedRules = defaultRules.map(def => {
          const existing = rules.find((r: any) => r.type === def.type);
          return existing ? { ...def, ...existing } : def;
        });

        setAutoModRules(mergedRules);
        setLoading(false);
      });
  }, [guildId]);

  const handleRuleToggle = (type: string, enabled: boolean) => {
    setAutoModRules(prev => prev.map(r => r.type === type ? { ...r, enabled } : r));
  };

  const handleRuleDataChange = (type: string, field: string, value: any) => {
    setAutoModRules(prev => prev.map(r => r.type === type ? { ...r, data: { ...r.data, [field]: value } } : r));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await axios.post(`/api/guilds/${guildId}/moderation`, {
        logConfig,
        autoModRules
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  if (loading) return <div>Loading moderation settings...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Moderation Settings</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
        
        {/* Logging Config */}
        <div className="glass-panel">
          <h2 style={{ marginBottom: '20px' }}>Log Channels</h2>
          
          <div className="form-group">
            <label className="form-label">Moderation Logs (Bans, Kicks, Warns)</label>
            <select 
              value={logConfig.moderationLogs || ''} 
              onChange={(e) => setLogConfig({ ...logConfig, moderationLogs: e.target.value })}
              style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', fontFamily: 'inherit' }}
            >
              <option value="">Disabled</option>
              {data.channels.filter((c: any) => c.type === 0).map((c: any) => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label className="form-label">Message Logs (Edits, Deletes)</label>
            <select 
              value={logConfig.messageLogs || ''} 
              onChange={(e) => setLogConfig({ ...logConfig, messageLogs: e.target.value })}
              style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', fontFamily: 'inherit' }}
            >
              <option value="">Disabled</option>
              {data.channels.filter((c: any) => c.type === 0).map((c: any) => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* AutoMod Filters */}
        <div className="glass-panel">
          <h2 style={{ marginBottom: '20px' }}>AutoMod Filters</h2>
          
          {autoModRules.map(rule => (
            <div key={rule.type} style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>{rule.type} Filter</span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={rule.enabled} onChange={(e) => handleRuleToggle(rule.type, e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              
              {rule.enabled && rule.type === 'Bad Words' && (
                <div style={{ marginTop: '15px' }}>
                  <label className="form-label">Blocked Words (comma separated)</label>
                  <textarea 
                    value={rule.data?.words || ''}
                    onChange={(e) => handleRuleDataChange(rule.type, 'words', e.target.value)}
                    placeholder="badword1, badword2, blockthis"
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', minHeight: '60px', fontFamily: 'inherit' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '30px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {success && <span style={{ color: 'var(--success)', fontWeight: 500 }}>Saved successfully!</span>}
      </div>
    </div>
  );
}
