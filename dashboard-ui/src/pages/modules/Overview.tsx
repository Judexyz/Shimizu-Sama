import { useOutletContext } from 'react-router-dom';

export default function Overview() {
  const { data }: any = useOutletContext();

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Dashboard Overview</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '20px' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '10px' }}>Total Members</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>{data.stats.memberCount}</p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '20px' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '10px' }}>Open Tickets</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>{data.stats.openTickets}</p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '20px' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '10px' }}>Total Economy Coins</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)', margin: 0 }}>{data.stats.totalCoins.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
