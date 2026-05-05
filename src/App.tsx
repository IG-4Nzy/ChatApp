import { useState, useEffect } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import Login from './components/Login';
import Chat from './components/Chat';

function App() {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [error, setError] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [waitingForPeer, setWaitingForPeer] = useState<boolean>(false);

  useEffect(() => {
    // Force HTTPS because Android Chrome blocks WebRTC on HTTP connections
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      window.location.href = window.location.href.replace('http:', 'https:');
    }
  }, []);

  const handleConnect = async (channelStr: string) => {
    setIsConnecting(true);
    setError('');
    setWaitingForPeer(false);
    
    // Disconnect existing peer if any
    if (peer) {
      peer.destroy();
      setPeer(null);
    }

    const channelId = `radio-${channelStr}`;

    try {
      // Fetch premium geo-routed TURN servers
      const response = await fetch("https://4nzy.metered.live/api/v1/turn/credentials?apiKey=48b78b68e7a07926fc8545a6403881fe274b");
      const fetchedIceServers = await response.json();

      const combinedIceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        ...fetchedIceServers
      ];

      // Try to become the channel host
      const hostPeer = new Peer(channelId, {
        config: { iceServers: combinedIceServers }
      });

      hostPeer.on('open', (id) => {
        // Success! We are the host. No one was on this channel.
        setPeer(hostPeer);
        setMyId(id);
        setIsConnecting(false);
        setWaitingForPeer(true);
      });

      hostPeer.on('error', (err: any) => {
        if (err.type === 'unavailable-id') {
          // The channel is already occupied! We will become a guest and connect to it.
          hostPeer.destroy();

          const guestPeer = new Peer({
            config: { iceServers: combinedIceServers }
          });

          guestPeer.on('open', (guestId) => {
            setPeer(guestPeer);
            setMyId(guestId);
            
            // Connect to the host
            const conn = guestPeer.connect(channelId);
            setupConnectionEvents(conn);
            
            // Fallback timeout in case 'open' or 'error' never fires
            setTimeout(() => {
              if (conn && !conn.open) {
                setIsConnecting(false);
                if (conn.peerConnection && conn.peerConnection.iceConnectionState !== 'failed') {
                   setError('Connection timed out after 20s. Please check the network.');
                }
                conn.close();
              }
            }, 20000);
          });

          guestPeer.on('error', (guestErr: any) => {
            console.error('Guest peer error:', guestErr);
            setError(guestErr.message || 'Error initializing guest peer.');
            setIsConnecting(false);
          });
        } else {
          console.error('Host peer error:', err);
          setError(err.message || 'An error occurred with the peer connection.');
          setIsConnecting(false);
        }
      });

      let activeConn: DataConnection | null = null;

      hostPeer.on('connection', (conn) => {
        if (activeConn) {
          // Channel is full. Tell the guest and close.
          conn.on('open', () => {
            conn.send({ type: 'system', action: 'reject', reason: 'Channel is full' });
            setTimeout(() => conn.close(), 500);
          });
          return;
        }
        
        activeConn = conn;
        setWaitingForPeer(false);
        setupConnectionEvents(conn);
        
        conn.on('close', () => {
          if (activeConn === conn) activeConn = null;
        });
      });

      hostPeer.on('disconnected', () => {
        console.log('Host disconnected from signaling server. Reconnecting...');
        hostPeer.reconnect();
      });
      
    } catch (err) {
      console.error("Failed to fetch ICE servers", err);
      setError("Network initialization failed. Please try again.");
      setIsConnecting(false);
    }
  };

  const setupConnectionEvents = (conn: DataConnection) => {
    // Check ICE state
    const checkIceState = () => {
      if (conn.peerConnection) {
        conn.peerConnection.oniceconnectionstatechange = () => {
          if (conn.peerConnection.iceConnectionState === 'failed') {
            setError('Connection blocked by firewall or network error.');
            setIsConnecting(false);
            conn.close();
          }
        };
      }
    };
    setTimeout(checkIceState, 500);

    conn.on('open', () => {
      setConnection(conn);
      setIsConnecting(false);
      setError('');
    });
    
    conn.on('data', (data: any) => {
      if (data && data.type === 'system' && data.action === 'reject') {
        setError(data.reason || 'Connection rejected.');
        conn.close();
      }
    });

    conn.on('close', () => {
      setConnection(null);
      setWaitingForPeer(false);
      localStorage.removeItem('p2p_chat_history');
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
      setError(err.message || 'Connection error.');
      setIsConnecting(false);
      setConnection(null);
      localStorage.removeItem('p2p_chat_history');
    });
  };

  const handleDisconnect = () => {
    if (connection) {
      connection.close();
      setConnection(null);
    }
    if (peer) {
      peer.destroy();
      setPeer(null);
    }
    setWaitingForPeer(false);
  };

  return (
    <>
      {error && (
        <div style={{ padding: '10px', background: '#ff4d4d', color: 'white', textAlign: 'center', position: 'fixed', top: 0, width: '100%', zIndex: 1000 }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: '10px', background: 'transparent', border: '1px solid white', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}
      {!connection ? (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {isConnecting && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderRadius: '24px' }}>
              <div style={{ padding: '20px 40px', background: 'var(--primary)', color: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', fontWeight: '600', letterSpacing: '1px' }}>Connecting...</div>
            </div>
          )}
          {waitingForPeer && !isConnecting && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderRadius: '24px' }}>
              <div style={{ padding: '20px 40px', background: 'var(--primary)', color: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', fontWeight: '600', letterSpacing: '1px', textAlign: 'center' }}>
                Waiting for someone to join...
                <button onClick={handleDisconnect} style={{ display: 'block', margin: '10px auto 0', padding: '5px 15px', background: 'white', color: 'var(--primary)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
          <Login onConnect={handleConnect} />
        </div>
      ) : (
        <Chat connection={connection} onDisconnect={handleDisconnect} myId={myId} />
      )}
    </>
  );
}

export default App;
