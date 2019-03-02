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

console.log(blockChain);
