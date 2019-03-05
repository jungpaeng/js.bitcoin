const WebSockets = require('ws');

const sockets = [];

const getSockets = () => sockets;

const initSocketConnection = (socket) => {
  sockets.push(socket);
  socket.on('message', (data) => {
    console.log(data);
  });
  setTimeout(() => {
    socket.send('welcone');
  }, 3000);
};

const startP2PServer = (server) => {
  const wsServer = new WebSockets.Server({ server });
  wsServer.on('connection', (ws) => {
    initSocketConnection(ws);
  });
  console.log('Coin P2P Server running!');
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
