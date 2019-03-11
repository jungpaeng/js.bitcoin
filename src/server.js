const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const _ = require('lodash');
const BlockChain = require('./blockchain');
const P2P = require('./p2p');
const Wallet = require('./wallet');
const Mempool = require('./mempool');

const {
  getBlockChain, createNewBlock, getAccountBalance, sendTx, getUTxOutList,
} = BlockChain;
const { startP2PServer, connectToPeers } = P2P;
const { initWallet, getPublicFromWallet } = Wallet;
const { getMempool } = Mempool;

const PORT = process.env.HTTP_PORT || 3000;

const PAGE_UNIT_LENGTH = 15;

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(morgan('combined'));

app.post('/peers', (req, res) => {
  connectToPeers(req.body.peer);
  res.send();
});

app.get('/blocks', (req, res) => {
  const page = req.query.page || 1;
  const reverseBlockChain = _(getBlockChain()).cloneDeep().reverse();
  // TODO: yarn add paginate(paginate-array)
  const paginateBlockChain = paginate(reverseBlockChain, page, PAGE_UNIT_LENGTH);
  res.send(paginateBlockChain);
});

app.get('/blocks/latest', (req, res) => {
  const latestBlocks = _(getBlockChain())
    .slice(-5)
    .reverse();
  res.send(latestBlocks);
});

app.get('/blocks/:index', (req, res) => {
  const block = _.find(getBlockChain(), { index: Number(req.pareams.index) });
  if (block === undefined) {
    res.status(400).send('Block not found');
  }
  res.send(block);
});

app.post('mine', (req, res) => {
  const newBlock = createNewBlock();
  res.send(newBlock);
});

app.get('/me/address', (req, res) => {
  const address = getPublicFromWallet();

  res.send({ address });
});

app.get('/me/balance', (req, res) => {
  const balance = getAccountBalance();
  res.send({ balance });
});

app.get('/me/uTxOuts', (req, res) => {
  // TODO
  // res.send(myUTxOuts());
});

app.route('/transactions')
  .get((req, res) => {
    const page = req.query.page || 1;
    const txs = _(getBlockChain())
      .map(blocks => blocks.data)
      .flatten()
      .reverse()
      .value();
    // TODO: yarn add paginate(paginate-array)
    const paginateTxs = paginate(txs, page, PAGE_UNIT_LENGTH);
    res.send(paginateTxs);
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

app.get('/transactions/latest', (req, res) => {
  const txs = _(getBlockChain())
    .map(blocks => blocks.data)
    .flatten()
    .slice(-5)
    .reverse();
  res.send(txs);
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

app.get('/address/:address', (req, res) => {
  const { params: { address } } = req;

  const uTxOuts = _.filter(
    getUTxOutList(),
    uTxO => uTxO.address === address,
  );
  const sumedUp = _(uTxOuts)
    .map(uTxO => uTxO.amount)
    .reduce((prev, curr) => prev + curr, 0);

  res.status(200).send(String(sumedUp));
});

app.get('/uTxOuts', (req, res) => {
  res.send(getUTxOutList());
});

app.get('/unconfirmed', (req, res) => {
  res.send(getMempool());
});

app.post('/mineTransaction', (req, res) => {
  const { address, amount } = req.body;

  try {
    // TODO
    // const response = createNewBlockWithTx(address, amount);
    // res.send(response);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

const server = app.listen(PORT, () => {
  console.log(`Coin Server running on port: ${PORT}`);
});

initWallet();
startP2PServer(server);

process.on('unhandledRejection', err => console.error('unhandled', err));
