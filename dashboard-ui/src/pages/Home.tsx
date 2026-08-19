import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Shield, Zap } from 'lucide-react';

export default function Home() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If the URL has an error param from oauth failure
    const err = searchParams.get('error');
    if (err) {
      setError('Failed to authenticate with Discord. Please try again.');
    }
  }, [searchParams]);

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '60px 40px' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '20px' }}>
          Welcome to <span className="title-gradient">Shimizu</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
          The ultimate multipurpose Discord bot. Configure your economy, leveling, and ticket systems with a beautiful web interface.
        </p>

        {error && (
          <div style={{ background: 'rgba(247, 118, 142, 0.2)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '15px', borderRadius: '8px', marginBottom: '30px' }}>
            {error}
          </div>
        )}

        <button onClick={handleLogin} className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.2rem', gap: '12px' }}>
          <img src="https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" alt="Discord" style={{ width: '24px', filter: 'brightness(0) invert(1)' }} />
          Login with Discord
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', marginTop: '60px' }}>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <Zap size={40} color="var(--primary)" style={{ marginBottom: '20px' }} />
          <h3>Lightning Fast</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>Powered by a modern tech stack ensuring zero downtime and rapid responses.</p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <Shield size={40} color="var(--success)" style={{ marginBottom: '20px' }} />
          <h3>Secure Tickets</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>Advanced ticket system with auto-transcripts and strict permission management.</p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <MessageSquare size={40} color="var(--secondary)" style={{ marginBottom: '20px' }} />
          <h3>Dynamic Economy</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>Fully featured leveling and economy with shop, achievements, and stats.</p>
        </div>
      </div>

    </div>
  );
}
