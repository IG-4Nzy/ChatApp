import { useState } from 'react';
import { MessageSquare, Link, Copy, CheckCircle } from 'lucide-react';
import './Login.css';

interface LoginProps {
  myId: string;
  onConnect: (id: string) => void;
}

export default function Login({ myId, onConnect }: LoginProps) {
  const [remoteId, setRemoteId] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(myId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (remoteId.trim()) {
      onConnect(remoteId.trim());
    }
  };

  return (
    <div className="login-container glass-panel">
      <div className="login-header">
        <div className="logo-circle">
          <MessageSquare size={32} color="white" />
        </div>
        <h2>P2P Nexus</h2>
        <p>Connect directly with another browser</p>
      </div>
      
      <div className="peer-id-section">
        <p className="section-label">Your Peer ID</p>
        <div className="id-display-container">
          <code className="id-display">{myId || 'Generating...'}</code>
          <button 
            className={`copy-btn ${copied ? 'copied' : ''}`} 
            onClick={handleCopy}
            disabled={!myId}
            title="Copy ID"
          >
            {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
          </button>
        </div>
        <p className="helper-text">Share this ID with a friend so they can connect to you.</p>
      </div>

      <div className="divider">
        <span>OR</span>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        <p className="section-label">Connect to a Friend</p>
        <input
          type="text"
          className="input-field"
          placeholder="Paste friend's Peer ID"
          value={remoteId}
          onChange={(e) => setRemoteId(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary" disabled={!remoteId.trim()}>
          <Link size={18} /> Connect
        </button>
      </form>
    </div>
  );
}
