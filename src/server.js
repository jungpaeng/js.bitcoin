const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const BlockChain = require('./blockchain');
const P2P = require('./p2p');
const Wallet = require('./wallet');

const { getBlockChain, createNewBlock, getAccountBalance } = BlockChain;
const { startP2PServer, connectToPeers } = P2P;
const { initWallet } = Wallet;

const PORT = process.env.HTTP_PORT || 3000;

const app = express();

app.use(bodyParser.json());
app.use(morgan('combined'));

app.route('/block')
  .get((req, res) => {
    res.send(getBlockChain());
  })
  .post((req, res) => {
    const { body: { data } } = req;
    const newBlock = createNewBlock(data);
    res.send(newBlock);
  });

app.post('/peers', (req, res) => {
  const { body: { peer } } = req;
  connectToPeers(peer);
  res.send();
});

app.get('/me/balance', (req, res) => {
  const balance = getAccountBalance();
  res.send({ balance });
});

const server = app.listen(PORT, () => {
  console.log(`Coin Server running on ${PORT}`);
});

initWallet();
startP2PServer(server);
