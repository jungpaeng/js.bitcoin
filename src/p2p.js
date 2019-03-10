const WebSockets = require('ws');
const BlockCahin = require('./blockchain');
const Mempool = require('./mempool');

const {
  getBlockChain,
  getNewestBlock,
  isStructureValid,
  addBlockToChain,
  replaceChain,
  handleIncomingTx,
} = BlockCahin;
const { getMempool } = Mempool;

const sockets = [];

// Message Types
const GET_LASTEST = 'GET_LASTEST';
const GET_ALL = 'GET_ALL';
const BLOCKCHAIN_RESPONSE = 'BLOCKCHAIN_RESPONSE';
const REQUEST_MEMPOOL = 'REQUEST_MEMPOOL';
const MEMPOOL_RESPONSE = 'MEMPOOL_RESPONSE';

// Message Creators
const getLatest = () => ({
  type: GET_LASTEST,
  data: null,
});

const getAll = () => ({
  type: GET_ALL,
  data: null,
});

const blockchainResponse = data => ({
  type: BLOCKCHAIN_RESPONSE,
  data,
});

const getAllMempool = () => ({
  type: REQUEST_MEMPOOL,
  data: null,
});

const mempoolResponse = data => ({
  type: MEMPOOL_RESPONSE,
  data,
});

const getSockets = () => sockets;

const parseData = (data) => {
  try {
    return JSON.parse(data);
  } catch (e) {
    console.eror(e);
    return null;
  }
};

const sendMessage = (ws, message) => ws.send(JSON.stringify(message));

const sendMessageToAll = message => sockets.forEach(ws => sendMessage(ws, message));

const responseLatest = () => blockchainResponse([getNewestBlock()]);

const responseAll = () => blockchainResponse(getBlockChain());

const broadcastNewBlock = () => sendMessageToAll(responseLatest());

const returnMempool = () => mempoolResponse(getMempool());

const broadcastMempool = () => sendMessageToAll(returnMempool());

const handleBlockChainResponse = (receivedBlocks) => {
  if (receivedBlocks.length === 0) {
    console.log('Received blocks have a length of 0');
    return null;
  }
  const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
  if (!isStructureValid(latestBlockReceived)) {
    console.log('The block structure of the block received is not valid');
    return null;
  }
  const newestBlock = getNewestBlock();
  if (latestBlockReceived.index > newestBlock.index) {
    if (latestBlockReceived.prevHash === newestBlock.hash) {
      if (addBlockToChain(latestBlockReceived)) {
        broadcastNewBlock();
      }
    } else if (receivedBlocks.length === 1) {
      sendMessageToAll(getAll());
    } else {
      replaceChain(receivedBlocks);
    }
  }
  return null;
};

const handleSocketMessages = (ws) => {
  ws.on('message', (data) => {
    const message = parseData(data);
    if (message === null) {
      return null;
    }
    switch (message.type) {
      case GET_LASTEST:
        sendMessage(ws, responseLatest());
        break;
      case GET_ALL:
        sendMessage(ws, responseAll());
        break;
      case BLOCKCHAIN_RESPONSE:
        {
          const receivedBlocks = message.data;
          if (receivedBlocks === null) {
            break;
          }
          handleBlockChainResponse(receivedBlocks);
        }
        break;
      case REQUEST_MEMPOOL:
        sendMessage(ws, returnMempool());
        break;
      case MEMPOOL_RESPONSE:
        {
          const receivedTxs = message.data;
          if (receivedTxs === null) {
            return null;
          }
          receivedTxs.forEach((tx) => {
            try {
              handleIncomingTx(tx);
              broadcastMempool();
            } catch (e) {
              console.error(e);
            }
          });
        }
        break;
      default:
        return null;
    }
    return null;
  });
};

const handleSocketError = (ws) => {
  const closeSocketConnection = (ws) => {
    ws.close();
    sockets.splice(sockets.indexOf(ws), 1);
  };
  ws.on('error', () => closeSocketConnection(ws));
};

const initSocketConnection = (ws) => {
  sockets.push(ws);
  handleSocketMessages(ws);
  handleSocketError(ws);
  sendMessage(ws, getLatest());
  setTimeout(() => {
    sendMessage(ws, getAllMempool());
  }, 1000);
};

const startP2PServer = (server) => {
  const wsServer = new WebSockets.Server({ server });
  wsServer.on('connection', (ws) => {
    initSocketConnection(ws);
  });
  wsServer.on('error', () => {
    console.error('error');
  });
  console.log('Coin P2P Server running!');
};

const connectToPeers = (newPeer) => {
  const ws = new WebSockets(newPeer);
  ws.on('open', () => {
    initSocketConnection(ws);
  });
  ws.on('error', () => console.error('Connection failed'));
  ws.on('close', () => console.error('Connection failed'));
};

module.exports = {
  startP2PServer,
  connectToPeers,
  broadcastNewBlock,
  broadcastMempool,
};
