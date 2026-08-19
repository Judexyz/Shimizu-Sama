import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';

export default function CustomCommands() {
  const { guildId, data }: any = useOutletContext();
  const [commands, setCommands] = useState<any[]>([]);
  const [trigger, setTrigger] = useState('');
  const [response, setResponse] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommands();
  }, [guildId]);

  const fetchCommands = async () => {
    try {
      const res = await axios.get(`/api/guilds/${guildId}/custom-commands`);
      setCommands(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trigger.trim() || !response.trim()) return;

    try {
      if (editId) {
        await axios.put(`/api/guilds/${guildId}/custom-commands/${editId}`, { trigger, response });
      } else {
        await axios.post(`/api/guilds/${guildId}/custom-commands`, { trigger, response });
      }
      setTrigger('');
      setResponse('');
      setEditId(null);
      fetchCommands();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/guilds/${guildId}/custom-commands/${id}`);
      fetchCommands();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading custom commands...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Custom Commands</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px', alignItems: 'start' }}>
        
        {/* Commands List */}
        <div className="glass-panel">
          <h2 style={{ marginBottom: '20px' }}>Active Commands</h2>
          {commands.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No custom commands configured.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {commands.map(cmd => (
                <div key={cmd.id} style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '5px' }}>{cmd.trigger}</div>
                    <div style={{ fontSize: '0.9rem', color: '#fff' }}>{cmd.response}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      onClick={() => {
                        setEditId(cmd.id);
                        setTrigger(cmd.trigger);
                        setResponse(cmd.response);
                      }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '5px' }}
                      title="Edit Command"
                    >
                      <Plus size={18} style={{ transform: 'rotate(45deg)' }} /> 
                    </button>
                    <button 
                      onClick={() => handleDelete(cmd.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '5px' }}
                      title="Delete Command"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Command Form */}
        <div className="glass-panel">
          <h2 style={{ marginBottom: '20px' }}>{editId ? 'Edit Command' : 'Add Command'}</h2>
          <form onSubmit={handleAddOrEdit}>
            <div className="form-group">
              <label className="form-label">Trigger (e.g. !rules)</label>
              <input 
                type="text" 
                value={trigger} 
                onChange={(e) => setTrigger(e.target.value)}
                placeholder={`${data.settings.prefix || 's!'}rules`}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', fontFamily: 'inherit' }}
              />
            </div>
            
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">Bot Response</label>
              <textarea 
                value={response} 
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Read the rules in #rules!"
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', minHeight: '100px', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                <Plus size={18} style={editId ? { display: 'none' } : {}} />
                {editId ? 'Save Changes' : 'Add Command'}
              </button>
              {editId && (
                <button type="button" className="btn btn-secondary" onClick={() => { setEditId(null); setTrigger(''); setResponse(''); }} style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
