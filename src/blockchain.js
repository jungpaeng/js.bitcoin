const CryptoJS = require('crypto-js');
const hexToBinary = require('hex-to-binary');
const Wallet = require('./wallet');
const Transaction = require('./transaction');

const { getBalance, getPublicFromWallet } = Wallet;
const { createCoinbaseTx, processTxs } = Transaction;

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
  }
}

const genesisBlock = new Block(
  0,
  '51C46352EC462B51BB5B5BB6DA3B90496E2F88030AB1861B32109E2EDF8DC7D2',
  null,
  1552058917,
  'Genesis Block',
  0,
  0,
);

let blockChain = [genesisBlock];

let uTxOuts = [];

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

const hashMatchedDifficulty = (hash, difficulty) => {
  const hashInBinary = hexToBinary(hash);
  const requiredZeros = '0'.repeat(difficulty);
  console.log('Trying difficulty: ', difficulty, 'with hash', hexToBinary(hash));
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
    console.error('The candidate block doesn\'t have a valid index');
    return false;
  }
  if (latestBlock.hash !== candidateBlock.prevHash) {
    console.error('The previousHash of the candidate block is not the hash of the latest block');
    return false;
  }
  if (getBlockHash(candidateBlock) !== candidateBlock.hash) {
    console.error('The hash of the block is invalid');
    return false;
  }
  if (!isTimeStampValid(candidateBlock, latestBlock)) {
    console.error('The time stamp of this block is doggy');
    return false;
  }
  return true;
};

const isChainValid = (candidateChain) => {
  const isGenesisValid = block => (
    JSON.stringify(block) === JSON.stringify(genesisBlock)
  );
  if (!isGenesisValid(candidateChain[0])) {
    console.error('The candidateChain\'s genesisBlock is not same as our genesisBlock');
    return false;
  }
  for (let i = 1; i < candidateChain.length; i += 1) {
    if (!isBlockValid(candidateChain[i], candidateChain[i - 1])) {
      return false;
    }
  }
  return true;
};

const sumOfiDifficulty = anyBlockChain => (
  anyBlockChain
    .map(block => block.difficulty ** 2)
    .reduce((prev, curr) => prev + curr)
);

const replaceChain = (newChain) => {
  if (
    isChainValid(newChain)
    && sumOfiDifficulty(newChain) > sumOfiDifficulty(getBlockChain())
  ) {
    blockChain = newChain;
    return true;
  }
  return false;
};

const addBlockToChain = (candidateBlock) => {
  if (isBlockValid(candidateBlock, getNewestBlock())) {
    const processedTxs = processTxs(candidateBlock.data, uTxOuts, candidateBlock.index);
    if (processedTxs === null) {
      console.error('Couldn\'t process txs');
      return false;
    }
    getBlockChain().push(candidateBlock);
    uTxOuts = processedTxs;
    return true;
  }
  return false;
};

const calculateNewDifficulty = (newestBlock, blockChain) => {
  const lastCalculatedBlock = blockChain[blockChain.length - DIFFICULTY_ADJUSMENT_INTERVAL];
  const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSMENT_INTERVAL;
  const timeTaken = newestBlock.timeStamp - lastCalculatedBlock.timeStamp;
  if (timeTaken > timeExpected / 2) {
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
  addBlockToChain(newBlock);
  require('./p2p').broadcastNewBlock();
  return newBlock;
};

const createNewBlock = () => {
  const coinbaseTx = createCoinbaseTx(getPublicFromWallet(), getNewestBlock().index + 1);
  const blockData = [coinbaseTx];
  return createNewRawBlock(blockData);
};

const getAccountBalance = () => getBalance(getPublicFromWallet(), uTxOuts);

module.exports = {
  getBlockChain,
  getNewestBlock,
  createNewBlock,
  isStructureValid,
  addBlockToChain,
  replaceChain,
  getAccountBalance,
};
