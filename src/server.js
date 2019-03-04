const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const BlockChain = require('./blockchain');

const { getBlockChain, createNewBlock } = BlockChain;

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

app.listen(PORT, () => console.log(`Coin Server running on ${PORT}`));
