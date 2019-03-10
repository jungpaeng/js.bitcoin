const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const _ = require('lodash');
const BlockChain = require('./blockchain');
const P2P = require('./p2p');
const Wallet = require('./wallet');
const Mempool = require('./mempool');

const {
  getBlockChain, createNewBlock, getAccountBalance, sendTx, getUTxOutList,
} = BlockChain;
const { startP2PServer, connectToPeers } = P2P;
const { initWallet, getPublicFromWallet, getBalance } = Wallet;
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

app.get('/me/address', (req, res) => {
  res.send(getPublicFromWallet());
});

app.get('/me/balance', (req, res) => {
  const balance = getAccountBalance();
  res.send({ balance });
});

app.get('/block/:hash', (req, res) => {
  const { params: { hash } } = req;
  const block = _.find(getBlockChain(), { hash });
  if (block === undefined) {
    res.status(400).send('Block not found');
  } else {
    res.send(block);
  }
});

app.get('/transactions/:id', (req, res) => {
  const tx = _(getBlockChain())
    .map(blocks => blocks.data)
    .flatten()
    .find({ id: req.params.id });
  if (tx === undefined) {
    res.status(400).send('Transaction not found');
  }
  res.send(tx);
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

app.get('/address/:address', (req, res) => {
  const { params: { address } } = req;
  const balance = getBalance(address, getUTxOutList());
  res.send({ balance });
});

const server = app.listen(PORT, () => {
  console.log(`Coin Server running on ${PORT}`);
});

initWallet();
startP2PServer(server);
