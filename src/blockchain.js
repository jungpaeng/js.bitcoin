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

const blockChain = [genesisBlock];

const getLastBlock = () => blockChain[blockChain.length - 1];

const getTimeStamp = () => new Date().getTime();

const createHash = (index, prevHash, timeStamp, data) => CryptoJS.SHA256(index + prevHash + timeStamp + data).toString();

const createNewBlock = (data) => {
  const prevBlock = getLastBlock();
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
  return newBlock;
};
