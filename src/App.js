import React, { useEffect, useState, useRef } from 'react';
import P2PT from 'p2pt';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [peerId, setPeerId] = useState('');
  const [peersConnected, setPeersConnected] = useState([]);
  const peersObjectConnectionRef = useRef({});
  const p2ptRef = useRef(null);

  //logic to use verify messages sent by peers
  const messagesSentRef = useRef({});
  const [refreshMessagesSent, setRefreshMessagesSent] = useState(false);

  useEffect(() => {
    if (refreshMessagesSent) {
      setRefreshMessagesSent(false);
    }
  }, [refreshMessagesSent]);

  const generateRandomID = () => {
    return Math.floor(Math.random() * 100000 + 100000);
  }


  const verifyMessage = (id) => {
    console.log('Verifying message:', id);
    messagesSentRef.current[id] = true;
  }

  const receivedLogic = (peer, data) => {
    let message_received_id = data.id;
    console.log('Received message ID:', message_received_id);

    sendMessage(peer, message_received_id, 'received')
      .then((response) => {
        console.log('Response sent to peer:', response);
      })
      .catch((err) => {
        console.error('Error sending response:', err);
      });
  }



  const TRACKERS = [
    "wss://tracker.sloppyta.co:443/announce",
    "wss://tracker.novage.com.ua:443/announce",
    "wss://tracker.openwebtorrent.com",
    "wss://tracker.webtorrent.io",
    "wss://tracker.btorrent.xyz",
    "wss://tracker.files.fm:7073/announce",
  ];

  const TOPIC = 'p2pt-react-app-teste-2931209319213';

  if (!window.Buffer) {
    window.Buffer = require('buffer').Buffer;
  }

  if (!window.process) {
    window.process = require('process');
  }

  if (!window.process.browser) {
    window.process.browser = true;
  }

  const listen = () => {

    p2ptRef.current.on('peerconnect', (peer) => {
      console.log(peer.id + " connected");
      setPeersConnected(prevPeers => [...prevPeers, peer.id]);
      peersObjectConnectionRef.current[peer.id] = peer;
    })
    p2ptRef.current.on('peerclose', (peer) => {
      console.log(peer.id + " disconnected");
      setPeersConnected(prevPeers => prevPeers.filter(p => p !== peer.id));
      delete peersObjectConnectionRef.current[peer.id];
    })

    p2ptRef.current.on('msg', (peer, msg) => {
      console.log('Received message from peer:', peer.id, msg);
      const data = JSON.parse(msg);
      let message = data.msg;

      if (data.o) {
        console.log('Parsing JSON message:', data.msg);
        message = JSON.parse(data.msg);
      }

      if (data.type === 'received') {
        console.log('Received confirmation from peer:', peer.id, message);
        verifyMessage(message);
        setRefreshMessagesSent(!refreshMessagesSent);
        return;
      }

      setMessages(prevMessages => [...prevMessages, { from: peer.id, message }]);
      receivedLogic(peer, data);

    })
    p2ptRef.current.start()

    console.log('P2PT instance created:', p2ptRef.current._peerId);
    setPeerId(p2ptRef.current._peerId);
  }

  useEffect(() => {
    if (!p2ptRef.current) {
      p2ptRef.current = new P2PT(TRACKERS, TOPIC);
      console.log('Listening for peer ID...');
      listen()
    }
  }, []);


  const sendMessage = (peer, msg, type = "message", IDMessage = Math.floor(Math.random() * 100000 + 100000), repeat_message = false) => {
    return new Promise((resolve, reject) => {
      const data = {
        id: IDMessage,
        msg,
        type
      };

      if (typeof msg === 'object') {
        data.msg = JSON.stringify(msg);
        data.o = 1;
      }

      if (!peer.connected) {
        return reject(new Error('Connection to peer closed'));
      }

      if (type !== 'received') {
        console.log('ID: ', data.id);
        messagesSentRef.current[data.id] = false;
        if (!repeat_message) {
          setMessages(prevMessages => [...prevMessages, { from: peerId, message: msg, id: data.id, IDMessage }]);
        }
      }

      p2ptRef.current.send(peer, JSON.stringify(data));
    });
  };

  const handleSendMessage = () => {
    let IDMessage = generateRandomID();
    if (inputMessage.trim() && p2ptRef.current) {
      const peers = Object.values(peersObjectConnectionRef.current);
      for (const [index, peertest] of peers.entries()) {
        console.log(index)
        sendMessage(peertest, inputMessage, 'message', IDMessage, index !== 0)
          .then((response) => {
            console.log('Response received:', response);
          })
          .catch((err) => {
            console.error('Error sending message:', err);
          });
      }
      setInputMessage('');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>P2P Chat with P2PT</h1>
      <div>
        <strong>Your Peer ID:</strong> {peerId}
      </div>
      <div>
        <strong>Peers connected:</strong> {peersConnected.length}
        {peersConnected.length > 0 && (
          <ul>
            {peersConnected.map((peer, index) => (
              <li key={index}>{peer}</li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message"
          style={{ padding: '10px', width: '300px', marginRight: '10px' }}
        />
        <button onClick={handleSendMessage} style={{ padding: '10px' }}>
          Send
        </button>
      </div>
      <div>
        <h2>Messages</h2>
        <ul>
          {messages.map((msg, index) => (
            console.log('Message:', msg),
            <li key={index}>
              <strong>{msg.from === peerId ? 'Você' : msg.from}</strong>: {msg.message}
              {msg.from === peerId && (
                <span style={{
                  marginLeft: '10px',
                  color: messagesSentRef.current[msg.id] ? 'green' : 'red'
                }}>{messagesSentRef.current[msg.id] ? 'Received' : 'Not received'}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;
