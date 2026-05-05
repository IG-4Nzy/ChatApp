import { useState } from 'react';
import { Radio } from 'lucide-react';
import './Login.css';

interface LoginProps {
  onConnect: (channel: string) => void;
}

export default function Login({ onConnect }: LoginProps) {
  const [channel, setChannel] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (channel.trim()) {
      onConnect(channel.trim());
    }
  };

  return (
    <div className="login-container glass-panel">
      <div className="login-info-section">
        <div className="login-header">
          <div className="logo-circle">
            <Radio size={32} color="white" />
          </div>
          <h2>Let's Chat</h2>
          <p>Tune into a channel and start talking</p>
        </div>
      </div>

      <div className="divider">
        <span>TUNE IN</span>
      </div>

      <div className="login-form-section">
        <form onSubmit={handleSubmit} className="login-form">
          <p className="section-label">Select Channel (1-999)</p>
          <input
            type="number"
            min="1"
            max="999"
            className="input-field"
            placeholder="e.g. 42"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary" disabled={!channel.trim()}>
            <Radio size={18} /> Join Channel
          </button>
        </form>
      </div>
    </div>
  );
}
