const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const BlockChain = require('./blockchain');
const P2P = require('./p2p');
const Wallet = require('./wallet');
const Mempool = require('./mempool');

const {
  getBlockChain, createNewBlock, getAccountBalance, sendTx,
} = BlockChain;
const { startP2PServer, connectToPeers } = P2P;
const { initWallet } = Wallet;
const { getMempool } = Mempool;

const PORT = process.env.HTTP_PORT || 3000;

const app = express();

app.use(bodyParser.json());
app.use(morgan('combined'));

app.route('/block')
  .get((req, res) => {
    res.send(getBlockChain());
  })
  .post((req, res) => {
    const newBlock = createNewBlock();
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

app.route('/transactions')
  .get((req, res) => {
    res.send(getMempool());
  })
  .post((req, res) => {
    try {
      const { body: { address, amount } } = req;
      if (address === undefined || amount === undefined) {
        throw Error('Please specify and address and an amount');
      } else {
        const resPonse = sendTx(address, amount);
        res.send(resPonse);
      }
    } catch (e) {
      res.status(400).send(e.message);
    }
  });

const server = app.listen(PORT, () => {
  console.log(`Coin Server running on ${PORT}`);
});

initWallet();
startP2PServer(server);
