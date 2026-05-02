import React, { useState, useEffect } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import Login from './components/Login';
import Chat from './components/Chat';

function App() {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [connection, setConnection] = useState<DataConnection | null>(null);

  useEffect(() => {
    const newPeer = new Peer();
    
    newPeer.on('open', (id) => {
      setMyId(id);
    });

    newPeer.on('connection', (conn) => {
      // Someone connected to us
      conn.on('open', () => {
        setConnection(conn);
      });
      conn.on('close', () => {
        setConnection(null);
      });
    });

    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, []);

  const handleConnect = (remoteId: string) => {
    if (!peer) return;
    const conn = peer.connect(remoteId);
    conn.on('open', () => {
      setConnection(conn);
    });
    conn.on('close', () => {
      setConnection(null);
    });
  };

  const handleDisconnect = () => {
    if (connection) {
      connection.close();
      setConnection(null);
    }
  };

  return (
    <>
      {!connection ? (
        <Login myId={myId} onConnect={handleConnect} />
      ) : (
        <Chat connection={connection} onDisconnect={handleDisconnect} myId={myId} />
      )}
    </>
  );
}

export default App;
