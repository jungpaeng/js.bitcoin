const CryptoJS = require('crypto-js');
const EC = require('elliptic').ec;
const utils = require('./utils');

const ec = new EC('specp256k1');

class TxIn {
  // TODO: uTxOutId, uTxOutIndex, Signature
}

class TxOut {
  constructor(address, amount) {
    this.address = address;
    this.amount = amount;
  }
}

class Transaction {
  // TODO: Id, txIns[], txOuts[]
}

class UTxOut {
  constructor(txOutId, txOutIndex, address, amount) {
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
    this.address = address;
    this.amount = amount;
  }
}

const uTxOuts = [];

const getTxId = (tx) => {
  const txInContent = tx.txIns
    .map(txIn => txIn.uTxOutId + txIn.uTxOutIndex)
    .reduce((prev, curr) => prev + curr, '');
  const txOutContent = tx.txOuts
    .map(txOut => txOut.address + txOut.amount)
    .reduce((prev, curr) => prev + curr, '');
  return CryptoJS.SHA256(txInContent + txOutContent);
};

const findUTxOut = (txOutId, txOutIndex, uTxOutList) => (
  uTxOutList.find(uTxOut => (
    uTxOut.txOutId === txOutId && uTxOut.txOutIndex === txOutIndex
  ))
);

const signTxIn = (tx, txInIndex, privateKey) => {
  const txIn = tx.txIns[txInIndex];
  const referenctdUTxOut = findUTxOut(txIn.txOutId, tx.txOutIndex, uTxOuts);
  if (referenctdUTxOut === null) { return null; }
  const dataToSign = tx.id;
  const key = ec.keyFromPrivate(privateKey, 'hex');
  const signature = utils.toHexString(key.sign(dataToSign).toDER());
  return signature;
};
