const CryptoJS = require('crypto-js');
const hexToBinary = require('hex-to-binary');
const _ = require('lodash');
const Wallet = require('./wallet');
const Transaction = require('./transaction');
const Mempool = require('./mempool');

const {
  getBalance, getPublicFromWallet, getPrivateFromWallet, createTx, findUTxOuts,
} = Wallet;
const { isAddressValid, createCoinbaseTx, processTxs } = Transaction;
const { addToMempool, getMempool, updateMempool } = Mempool;

const BLOCK_GENERATION_INTERVAL = 10;
const DIFFICULTY_ADJUSMENT_INTERVAL = 10;

class Block {
  constructor(index, hash, prevHash, timeStamp, data, difficulty, nonce) {
    this.index = index;
    this.hash = hash;
    this.prevHash = prevHash;
    this.timeStamp = timeStamp;
    this.data = data;
    this.difficulty = difficulty;
    this.nonce = nonce;
    this.amount = _(data)
      .map(tx => tx.amount)
      .reduce((a, b) => a + b);
  }
}

const genesisTx = {
  txIns: [{ signature: '', txOutId: '', txOutIndex: 0 }],
  txOuts: [
    {
      address: '042c08776955fc93c81bf4aa2e67337142ff35a6925f278c31ba1e66291774e75a61b376a85e78ebac31b177e711c2a6814c141ba6b56a048eab54a3f53b6f0a4d',
      amount: 10,
    },
  ],
  amount: 10,
  timeStamp: 1552058917,
  to: '042c08776955fc93c81bf4aa2e67337142ff35a6925f278c31ba1e66291774e75a61b376a85e78ebac31b177e711c2a6814c141ba6b56a048eab54a3f53b6f0a4d',
  id: 'c56c241bf782094ce497adf5e855b45478eb4cc6a81de83a81f8a97b427c47cc',
};

const genesisBlock = new Block(
  0,
  '33156b8dcba9314966c2cbd5578d1f646bafc6da42ba6cc35c9f1aa019e01802',
  '',
  1552058917,
  [genesisTx],
  0,
  0,
);

let blockChain = [genesisBlock];

let uTxOuts = processTxs(blockChain[0].data, [], 0);

const updateUTxOutsList = (newUTxOuts) => {
  uTxOuts = newUTxOuts;
};

const getUTxOutList = () => _.cloneDeep(uTxOuts);

const getBlockChain = () => blockChain;

const getNewestBlock = () => blockChain[blockChain.length - 1];

const getTimeStamp = () => Math.round(new Date().getTime() / 1000);

const createHash = (index, prevHash, timeStamp, data, difficulty, nonce) => CryptoJS.SHA256(
  index
  + prevHash
  + timeStamp
  + (typeof data === 'string' ? data : JSON.stringify(data))
  + difficulty
  + nonce,
).toString();

const hashMatchedDifficulty = (hash, difficulty = 0) => {
  const hashInBinary = hexToBinary(hash);
  const requiredZeros = '0'.repeat(difficulty);
  console.log('Trying difficulty: ', difficulty, 'with hash ', hashInBinary);
  return hashInBinary.startsWith(requiredZeros);
};

const findBlock = (index, prevHash, timeStamp, data, difficulty) => {
  let nonce = 0;
  while (true) {
    console.log('Current nonce', nonce);
    const hash = createHash(
      index, prevHash, timeStamp, data, difficulty, nonce,
    );
    if (hashMatchedDifficulty(hash, difficulty)) {
      return new Block(
        index, hash, prevHash, timeStamp, data, difficulty, nonce,
      );
    }
    nonce += 1;
  }
};

const getBlockHash = block => createHash(
  block.index,
  block.prevHash,
  block.timeStamp,
  block.data,
  block.difficulty,
  block.nonce,
);

const isStructureValid = block => (
  typeof block.index === 'number'
  && typeof block.hash === 'string'
  && typeof block.prevHash === 'string'
  && typeof block.timeStamp === 'number'
  && typeof block.data === 'object'
);

const isTimeStampValid = (newBlock, oldBlock) => (
  oldBlock.timeStamp - 60 < newBlock.timeStamp
  && newBlock.timeStamp - 60 < getTimeStamp()
);

const isBlockValid = (candidateBlock, latestBlock) => {
  if (!isStructureValid(candidateBlock)) {
    console.error('The candidate block structure is not valid');
    return false;
  }
  if (latestBlock.index + 1 !== candidateBlock.index) {
    console.error("The candidate block doesn't have a valid index");
    return false;
  }
  if (latestBlock.hash !== candidateBlock.prevHash) {
    console.error('The previousHash of the candidate block is not the hash of the latest block');
    return false;
  }
  if (getBlockHash(candidateBlock) !== candidateBlock.hash) {
    console.error('The hash of this block is invalid');
    return false;
  }
  if (!isTimeStampValid(candidateBlock, latestBlock)) {
    console.error('The time stamp of this block is dodgy');
    return false;
  }
  return true;
};

const isChainValid = (candidateChain) => {
  const isGenesisValid = block => (
    JSON.stringify(block) === JSON.stringify(genesisBlock)
  );
  if (!isGenesisValid(candidateChain[0])) {
    console.error("The candidateChains's genesisBlock is not same as our genesisBlock");
    return null;
  }

  let foreignUTxOuts = [];

  for (let i = 0; i < candidateChain.length; i += 1) {
    const currentBlock = candidateChain[i];
    if (i !== 0 && !isBlockValid(currentBlock, candidateChain[i - 1])) {
      return null;
    }

    foreignUTxOuts = processTxs(currentBlock.data, foreignUTxOuts, currentBlock.index);
    if (foreignUTxOuts === null) {
      return null;
    }
  }
  return foreignUTxOuts;
};

const sumOfiDifficulty = anyBlockChain => (
  anyBlockChain
    .map(block => block.difficulty)
    .map(difficulty => 2 ** difficulty)
    .reduce((prev, curr) => prev + curr)
);

const replaceChain = (candidateChain) => {
  const foreignUTxOuts = isChainValid(candidateChain);
  const validChain = foreignUTxOuts !== null;
  if (
    validChain
    && sumOfiDifficulty(candidateChain) > sumOfiDifficulty(getBlockChain())
  ) {
    blockChain = candidateChain;
    updateUTxOutsList(foreignUTxOuts);
    updateMempool(getUTxOutList());
    require('./p2p').broadcastNewBlock();
    return true;
  }
  return false;
};

const addBlockToChain = (candidateBlock) => {
  if (isBlockValid(candidateBlock, getNewestBlock())) {
    const processedTxs = processTxs(candidateBlock.data, uTxOuts, candidateBlock.index);
    if (processedTxs === null) {
      console.error("Couldn't process txs");
      return false;
    }
    blockChain.push(candidateBlock);
    updateUTxOutsList(processedTxs);
    updateMempool(uTxOuts);
    return true;
  }
  return false;
};

const calculateNewDifficulty = (newestBlock, blockChain) => {
  const lastCalculatedBlock = blockChain[blockChain.length - DIFFICULTY_ADJUSMENT_INTERVAL];
  const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSMENT_INTERVAL;
  const timeTaken = newestBlock.timeStamp - lastCalculatedBlock.timeStamp;
  if (timeTaken > timeExpected * 2 && lastCalculatedBlock.difficulty !== 0) {
    return lastCalculatedBlock.difficulty - 1;
  }
  if (timeTaken < timeExpected / 2) {
    return lastCalculatedBlock.difficulty + 1;
  }
  return lastCalculatedBlock.difficulty;
};

const findDifficulty = () => {
  const newestBlock = getNewestBlock();
  if (newestBlock.index % DIFFICULTY_ADJUSMENT_INTERVAL === 0 && newestBlock.index !== 0) {
    return calculateNewDifficulty(newestBlock, getBlockChain());
  }
  return newestBlock.difficulty;
};

const createNewRawBlock = (data) => {
  const prevBlock = getNewestBlock();
  const newBlockIndex = prevBlock.index + 1;
  const newTimeStamp = getTimeStamp();
  const difficulty = findDifficulty();
  const newBlock = findBlock(
    newBlockIndex,
    prevBlock.hash,
    newTimeStamp,
    data,
    difficulty,
  );
  if (addBlockToChain(newBlock)) {
    require('./p2p').broadcastNewBlock();
    return newBlock;
  }
  return null;
};

// Create a new block with a transaction on it
const createNewBlockWithTx = (receiverAddress, amount) => {
  if (!isAddressValid(receiverAddress)) {
    throw Error('Address is invalid');
  } else if (typeof amount !== 'number') {
    throw Error('Amount is invalid');
  }

  const coinbaseTx = createCoinbaseTx(
    getPublicFromWallet(),
    getNewestBlock().index + 1,
  );

  const tx = createTx(
    receiverAddress,
    amount,
    getPrivateFromWallet(),
    uTxOuts,
    getMempool(),
  );

  const blockData = [coinbaseTx, tx];
  return createNewRawBlock(blockData);
};

const createNewBlock = () => {
  const coinbaseTx = createCoinbaseTx(getPublicFromWallet(), getNewestBlock().index + 1);
  const blockData = [coinbaseTx].concat(getMempool());
  return createNewRawBlock(blockData);
};

const getAccountBalance = () => getBalance(getPublicFromWallet(), uTxOuts);

const sendTx = (address, amount) => {
  const uTxOutList = getUTxOutList();
  const tx = createTx(address, amount, getPrivateFromWallet(), uTxOutList, getMempool());
  addToMempool(tx, uTxOutList);
  require('./p2p').broadcastMempool();
  return tx;
};

// Get myUtxOuts
const myUTxOuts = () => findUTxOuts(getPublicFromWallet(), getUTxOutList());

const handleIncomingTx = (tx) => {
  addToMempool(tx, getUTxOutList());
};

module.exports = {
  getBlockChain,
  getNewestBlock,
  createNewBlock,
  createNewBlockWithTx,
  isStructureValid,
  addBlockToChain,
  replaceChain,
  getAccountBalance,
  sendTx,
  handleIncomingTx,
  getUTxOutList,
  myUTxOuts,
};
