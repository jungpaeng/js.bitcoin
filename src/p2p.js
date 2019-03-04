const WebSockets = require('ws');

const sockets = [];

const getSockets = () => sockets;

const startP2PServer = (server) => {
  const wsServer = new WebSockets.Server({ server });
  wsServer.on('connection', (ws) => {
    console.log('hello ws');
  });
  console.log('Coin P2P Server running!');
};

const initSocketConnection = (socket) => {
  sockets.push(socket);
};

const connectToPeers = (newPeer) => {
  const ws = new WebSockets(newPeer);
  ws.on('open', () => {
    initSocketConnection(ws);
  });
};

module.exports = {
  startP2PServer,
  connectToPeers,
};
