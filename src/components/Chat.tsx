import  { useState, useEffect, useRef } from 'react';
import { Send, LogOut, MessageSquare, Trash2 } from 'lucide-react';
import type { DataConnection } from 'peerjs';
import './Chat.css';

interface Message {
  id: string;
  senderId: string;
  text: string;
  time: number;
}

interface ChatProps {
  connection: DataConnection;
  onDisconnect: () => void;
  myId: string;
}

export default function Chat({ connection, onDisconnect, myId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleData = (data: any) => {
      if (data && data.type === 'system') return;
      
      setMessages((prev) => [...prev, data]);
    };

    connection.on('data', handleData);

    return () => {
      connection.off('data', handleData);
    };
  }, [connection]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg: Message = {
      id: Math.random().toString(36).substring(7),
      senderId: myId,
      text: input.trim(),
      time: Date.now()
    };

    connection.send(newMsg);
    
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
  };

  const clearHistory = () => {
    setMessages([]);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <div className="app-brand">
            <MessageSquare size={24} color="var(--primary)" />
            <h2>Let's Chat</h2>
          </div>
          <p className="online-count">
            <span className="dot"></span> Connected
          </p>
        </div>
        
        <div className="users-list">
          <h3>Connection Info</h3>
          <div className="info-card">
            <p className="label">Channel:</p>
            <p className="value">{myId.startsWith('radio-') ? myId.replace('radio-', '') : connection.peer.replace('radio-', '')}</p>
          </div>
          <div className="info-card remote">
            <p className="label">Role:</p>
            <p className="value">{myId.startsWith('radio-') ? 'Host' : 'Guest'}</p>
          </div>
        </div>

        {messages.length >= 50 && (
          <button className="clear-btn" onClick={clearHistory}>
            <Trash2 size={18} /> Clear Chat History
          </button>
        )}

        <button className="logout-btn" onClick={onDisconnect}>
          <LogOut size={18} /> Disconnect
        </button>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main glass-panel">
        <div className="chat-header">
          <div className="header-info">
            <h2>Direct Chat</h2>
            <p>End-to-end encrypted connection</p>
          </div>
          <div className="message-counter">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="messages-area">
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === myId;
            const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
            
            return (
              <div key={msg.id} className={`message-wrapper ${isMe ? 'me' : 'other'} ${!showAvatar ? 'continued' : ''}`}>
                {!isMe && showAvatar && (
                  <div className="message-avatar">P</div>
                )}
                <div className="message-content">
                  <div className="message-bubble">
                    <p>{msg.text}</p>
                    <span className="message-time">{formatTime(msg.time)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form className="message-input-area" onSubmit={handleSend}>
          <input
            type="text"
            className="input-field chat-input"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn-primary send-btn" disabled={!input.trim()}>
            <Send size={18} />
          </button>
        </form>
      </main>
    </div>
  );
}
