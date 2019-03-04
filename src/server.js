const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const BlockChain = require('./blockchain');
const P2P = require('./p2p');

const { getBlockChain, createNewBlock } = BlockChain;
const { startP2PServer } = P2P;

const PORT = process.env.HTTP_PORT || 3000;

const app = express();

app.use(bodyParser.json());
app.use(morgan('combined'));

app.get('/block', (req, res) => {
  res.send(getBlockChain());
});

app.post('/block', (req, res) => {
  const { body: { data } } = req;
  const newBlock = createNewBlock(data);
  res.send(newBlock);
});

const server = app.listen(PORT, () => {
  console.log(`Coin Server running on ${PORT}`);
});

startP2PServer(server);
