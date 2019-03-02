class Block {
  constructor(index, hash, prevHash, timeStamp, data) {
    this.index = index;
    this.hash = hash;
    this.prevHash = prevHash;
    this.timeStamp = timeStamp;
    this.data = data;
  }
}
