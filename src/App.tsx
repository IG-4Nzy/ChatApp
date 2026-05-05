import  { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Force HTTPS because Android Chrome blocks WebRTC on HTTP connections
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      window.location.href = window.location.href.replace('http:', 'https:');
      return;
    }

    let newPeer: any = null;

    const initPeer = async () => {
      try {
        // Fetch premium geo-routed TURN servers
        const response = await fetch("https://4nzy.metered.live/api/v1/turn/credentials?apiKey=48b78b68e7a07926fc8545a6403881fe274b");
        const fetchedIceServers = await response.json();

        // Combine Google STUN with the fetched premium TURN servers
        const combinedIceServers = [
          { urls: 'stun:stun.l.google.com:19302' },
          ...fetchedIceServers
        ];

        newPeer = new Peer({
          config: {
            iceServers: combinedIceServers
          }
        });
        
        newPeer.on('open', (id: string) => {
          setMyId(id);
        });

        // Auto-reconnect if the signaling server connection drops (common on mobile)
        newPeer.on('disconnected', () => {
          console.log('Disconnected from signaling server. Reconnecting...');
          newPeer.reconnect();
        });

        newPeer.on('error', (err: any) => {
          console.error('Peer error:', err);
          setError(err.message || 'An error occurred with the peer connection.');
          setIsConnecting(false);
        });

        newPeer.on('connection', (conn: any) => {
          // Someone connected to us
          conn.on('open', () => {
            setConnection(conn);
            setIsConnecting(false);
            setError('');
          });
          conn.on('close', () => {
            setConnection(null);
          });
          conn.on('error', (err: any) => {
            console.error('Connection error:', err);
            setError(err.message || 'Connection error.');
            setConnection(null);
          });
        });

        setPeer(newPeer);
      } catch (err) {
        console.error("Failed to fetch ICE servers", err);
        setError("Network initialization failed. Please refresh the page.");
      }
    };

    initPeer();

    return () => {
      if (newPeer) {
        newPeer.destroy();
      }
    };
  }, []);

  const handleConnect = (remoteId: string) => {
    if (!peer) return;

    const startConnection = () => {
      setIsConnecting(true);
      setError('');
      
      // Removed reliable: true. Some mobile carrier NATs and TURN servers drop the strict 
      // SCTP ordered packets, causing the connection to fail.
      const conn = peer.connect(remoteId);
      
      if (!conn) {
        setIsConnecting(false);
        setError('Failed to initiate connection. Please check your network and try again.');
        return;
      }

      // Track the underlying WebRTC ICE connection state to detect mobile carrier blocking
      const checkIceState = () => {
        if (conn.peerConnection) {
          conn.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE State:', conn.peerConnection.iceConnectionState);
            if (conn.peerConnection.iceConnectionState === 'failed') {
              setError('Connection blocked by mobile carrier firewall. Try using Wi-Fi.');
              setIsConnecting(false);
              conn.close();
            }
          };
        }
      };
      
      // peerConnection might take a few ms to be instantiated
      setTimeout(checkIceState, 500);

      conn.on('open', () => {
        setConnection(conn);
        setIsConnecting(false);
        setError('');
      });
      
      conn.on('close', () => {
        setConnection(null);
        localStorage.removeItem('p2p_chat_history');
      });

      conn.on('error', (err) => {
        console.error('Connection error:', err);
        setError(err.message || 'Connection error.');
        setIsConnecting(false);
        setConnection(null);
        localStorage.removeItem('p2p_chat_history');
      });

      // Fallback timeout in case 'open' or 'error' never fires (e.g. network blocks WebRTC)
      // Mobile networks often take 15-20 seconds to establish TURN relays
      setTimeout(() => {
        if (conn && !conn.open) {
          setIsConnecting(false);
          if (conn.peerConnection && conn.peerConnection.iceConnectionState !== 'failed') {
             setError('Connection timed out after 20s. Please check the ID or try switching networks.');
          }
          conn.close();
        }
      }, 20000);
    };

    if (peer.disconnected) {
      // If we lost connection to the PeerJS server, reconnect first
      setIsConnecting(true);
      setError('Reconnecting to server...');
      peer.reconnect();
      
      // Wait a moment for reconnection to succeed before trying to connect
      setTimeout(() => {
        startConnection();
      }, 2000);
    } else {
      startConnection();
    }
  };

  const handleDisconnect = () => {
    if (connection) {
      connection.close();
      setConnection(null);
    }
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
          <Login myId={myId} onConnect={handleConnect} />
        </div>
      ) : (
        <Chat connection={connection} onDisconnect={handleDisconnect} myId={myId} />
      )}
    </>
  );
}

export default App;
