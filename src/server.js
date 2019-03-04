const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const BlockChain = require('./blockchain');

const { getBlockChain, createNewBlock } = BlockChain;

const PORT = 3000;

const app = express();

app.use(bodyParser.json());
app.use(morgan('combined'));
app.listen(PORT, () => console.log(`Coin Server running on ${PORT}`));
