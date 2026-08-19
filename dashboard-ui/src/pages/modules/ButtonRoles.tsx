import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, Send } from 'lucide-react';

export default function ButtonRoles() {
  const { guildId, data }: any = useOutletContext();
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [channelId, setChannelId] = useState('');
  const [title, setTitle] = useState('Role Selection');
  const [description, setDescription] = useState('Click the buttons below to receive the corresponding role!');
  const [roles, setRoles] = useState([{ roleId: '', label: '', emoji: '' }]);

  useEffect(() => {
    fetchMenus();
  }, [guildId]);

  const fetchMenus = async () => {
    try {
      const res = await axios.get(`/api/guilds/${guildId}/role-menus`);
      setMenus(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleAddRoleRow = () => {
    if (roles.length >= 5) return; // Discord ActionRow limits to 5 buttons
    setRoles([...roles, { roleId: '', label: '', emoji: '' }]);
  };

  const handleRemoveRoleRow = (index: number) => {
    const newRoles = [...roles];
    newRoles.splice(index, 1);
    setRoles(newRoles);
  };

  const handleRoleChange = (index: number, field: string, value: string) => {
    const newRoles = [...roles];
    (newRoles[index] as any)[field] = value;
    setRoles(newRoles);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId) return alert('Please select a channel');
    
    const validRoles = roles.filter(r => r.roleId && r.label.trim());
    if (validRoles.length === 0) return alert('Please add at least one valid role with a label');

    try {
      await axios.post(`/api/guilds/${guildId}/role-menus`, {
        channelId,
        title,
        description,
        roles: validRoles
      });
      alert('Role Panel created successfully!');
      
      // Reset form
      setChannelId('');
      setTitle('Role Selection');
      setDescription('Click the buttons below to receive the corresponding role!');
      setRoles([{ roleId: '', label: '', emoji: '' }]);
      
      fetchMenus();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to create role panel.');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Reaction & Button Roles</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px', alignItems: 'start' }}>
        
        {/* Active Menus Sidebar */}
        <div className="glass-panel">
          <h2 style={{ marginBottom: '20px' }}>Active Panels</h2>
          {menus.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No role panels created yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {menus.map(menu => (
                <div key={menu.id} style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '5px' }}>
                    Channel: #{data.channels.find((c: any) => c.id === menu.channelId)?.name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    {menu.items.length} roles configured
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {menu.items.map((item: any) => (
                      <span key={item.id} style={{ background: 'var(--primary)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {item.emoji ? `${item.emoji} ` : ''}{item.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Panel Form */}
        <div className="glass-panel">
          <h2 style={{ marginBottom: '20px' }}>Create New Role Panel</h2>
          <form onSubmit={handleCreate}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Target Channel</label>
                <select 
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="form-control"
                  required
                >
                  <option value="">Select a channel...</option>
                  {data.channels.filter((ch: any) => ch.type === 0 || ch.type === 5).map((ch: any) => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">Embed Title</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">Embed Description</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                className="form-control"
                style={{ minHeight: '80px' }}
              />
            </div>

            <div style={{ marginTop: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.2rem' }}>Role Buttons</h3>
                {roles.length < 5 && (
                  <button type="button" onClick={handleAddRoleRow} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.9rem' }}>
                    <Plus size={16} style={{ marginRight: '5px' }} />
                    Add Button
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {roles.map((r, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                    
                    <div style={{ flex: 2 }}>
                      <select 
                        value={r.roleId} 
                        onChange={(e) => handleRoleChange(index, 'roleId', e.target.value)}
                        className="form-control"
                      >
                        <option value="">Select Role...</option>
                        {data.roles.filter((role: any) => role.name !== '@everyone' && !role.managed).map((role: any) => (
                          <option key={role.id} value={role.id} style={{ color: role.hexColor !== '#000000' ? role.hexColor : undefined }}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: 1 }}>
                      <input 
                        type="text" 
                        placeholder="Button Label" 
                        value={r.label} 
                        onChange={(e) => handleRoleChange(index, 'label', e.target.value)}
                        className="form-control"
                      />
                    </div>

                    <div style={{ width: '80px' }}>
                      <input 
                        type="text" 
                        placeholder="Emoji" 
                        value={r.emoji} 
                        onChange={(e) => handleRoleChange(index, 'emoji', e.target.value)}
                        className="form-control"
                      />
                    </div>

                    {roles.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveRoleRow(index)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '5px' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                {roles.length >= 5 && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--warning)', marginTop: '5px' }}>
                    Discord limits action rows to a maximum of 5 buttons.
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '30px', justifyContent: 'center' }}>
              <Send size={18} style={{ marginRight: '8px' }} />
              Create & Send Panel to Discord
            </button>

          </form>
        </div>

      </div>
    </div>
  );
}
