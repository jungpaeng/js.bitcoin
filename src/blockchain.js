const CryptoJS = require('crypto-js');

class Block {
  constructor(index, hash, prevHash, timeStamp, data) {
    this.index = index;
    this.hash = hash;
    this.prevHash = prevHash;
    this.timeStamp = timeStamp;
    this.data = data;
  }
}

const genesisBlock = new Block(
  0,
  '51C46352EC462B51BB5B5BB6DA3B90496E2F88030AB1861B32109E2EDF8DC7D2',
  null,
  1551548467767,
  'Genesis Block',
);

let blockChain = [genesisBlock];

const getBlockChain = () => blockChain;

const getNewestBlock = () => blockChain[blockChain.length - 1];

const getTimeStamp = () => new Date().getTime();

const createHash = (index, prevHash, timeStamp, data) => CryptoJS.SHA256(
  index
  + prevHash
  + timeStamp
  + (typeof data === 'string' ? data : JSON.stringify(data)),
).toString();

const getBlockHash = block => createHash(
  block.index,
  block.prevHash,
  block.timeStamp,
  block.data,
);

const isStructureValid = block => (
  typeof block.index === 'number'
  && typeof block.hash === 'string'
  && typeof block.prevHash === 'string'
  && typeof block.timeStamp === 'number'
  && typeof block.data === 'string'
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

const replaceChain = (newChain) => {
  if (isChainValid(newChain) && newChain.length > getBlockChain().length) {
    blockChain = newChain;
    return true;
  }
  return false;
};

const addBlockToChain = (candidateBlock) => {
  if (isBlockValid(candidateBlock, getNewestBlock())) {
    getBlockChain().push(candidateBlock);
    return true;
  }
  return false;
};

const createNewBlock = (data) => {
  const prevBlock = getNewestBlock();
  const newBlockIndex = prevBlock.index + 1;
  const newTimeStamp = getTimeStamp();
  const newHash = createHash(newBlockIndex, prevBlock.hash, newTimeStamp, data);
  const newBlock = new Block(
    newBlockIndex,
    newHash,
    prevBlock.hash,
    newTimeStamp,
    data,
  );
  addBlockToChain(newBlock);
  return newBlock;
};

module.exports = {
  getBlockChain,
  getNewestBlock,
  createNewBlock,
  isStructureValid,
};
