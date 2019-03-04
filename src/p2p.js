const WebSockets = require('ws');

const sockets = [];

const startP2PServer = (server) => {
  const wsServer = new WebSockets.Server({ server });
  wsServer.on('connection', (ws) => {
    console.log(`hello ${ws}`);
  });
  console.log('Coin P2P Server running!');
};

module.exports = {
  startP2PServer,
};
