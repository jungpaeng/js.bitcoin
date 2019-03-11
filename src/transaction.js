const CryptoJS = require('crypto-js');
const _ = require('lodash');
const EC = require('elliptic').ec;
const utils = require('./utils');

const ec = new EC('secp256k1');

const COINBASE_AMOUNT = 10;

class TxIn {
  // txOutId
  // txOutIndex
  // Signature
}

class TxOut {
  constructor(address, amount) {
    this.address = address;
    this.amount = amount;
  }
}

class Transaction {
  // Id
  // txIns[]
  // txOuts[]
}

class UTxOut {
  constructor(txOutId, txOutIndex, address, amount) {
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
    this.address = address;
    this.amount = amount;
  }
}

const getTxId = (tx) => {
  const txInContent = tx.txIns
    .map(txIn => txIn.txOutId + txIn.txOutIndex)
    .reduce((prev, curr) => prev + curr, '');
  const txOutContent = tx.txOuts
    .map(txOut => txOut.address + txOut.amount)
    .reduce((prev, curr) => prev + curr, '');
  return CryptoJS.SHA256(txInContent + txOutContent + tx.timestamp).toString();
};

const findUTxOut = (txOutId, txOutIndex, uTxOutList) => (
  uTxOutList.find(uTxOut => (
    uTxOut.txOutId === txOutId && uTxOut.txOutIndex === txOutIndex
  ))
);

const getPublicKey = privateKey => ec
  .keyFromPrivate(privateKey, 'hex')
  .getPublic()
  .encode('hex');

const signTxIn = (tx, txInIndex, privateKey, uTxOutList) => {
  const txIn = tx.txIns[txInIndex];
  const referencedUTxOut = findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList);
  if (referencedUTxOut === null || referencedUTxOut === undefined) {
    throw Error("Couldn't find the referenced uTxOut, not signing");
  }
  const referencedAddress = referencedUTxOut.address;
  if (getPublicKey(privateKey) !== referencedAddress) {
    return false;
  }
  const dataToSign = tx.id;
  const key = ec.keyFromPrivate(privateKey, 'hex');
  const signature = utils.toHexString(key.sign(dataToSign).toDER());
  return signature;
};

const updateUTxOuts = (newTxs, uTxOutList) => {
  const newUTxOuts = newTxs
    .map(tx => (
      tx.txOuts.map((txOut, index) => (
        new UTxOut(tx.id, index, txOut.address, txOut.amount)
      ))
    ))
    .reduce((prev, curr) => prev.concat(curr), []);
  const spentTxOuts = newTxs
    .map(tx => tx.txIns)
    .reduce((prev, curr) => prev.concat(curr), [])
    .map(txIn => new UTxOut(txIn.txOutId, txIn.txOutIndex, '', 0));
  const resultingUTxOuts = uTxOutList
    .filter(uTxO => !findUTxOut(uTxO.txOutId, uTxO.txOutIndex, spentTxOuts))
    .concat(newUTxOuts);
  return resultingUTxOuts;
};

const isTxInStructureValid = (txIn) => {
  if (txIn === null) {
    console.error('The txIn appears to be null');
    return false;
  }
  if (typeof txIn.signature !== 'string') {
    console.error("The txIn doesn't have a valid signature");
    return false;
  }
  if (typeof txIn.txOutId !== 'string') {
    console.error("The txIn doesn't have a valid txOutId");
    return false;
  }
  if (typeof txIn.txOutIndex !== 'number') {
    console.error("The txIn doesn't have a valid txOutIndex");
    return false;
  }
  return true;
};

const isAddressValid = (address) => {
  if (address.length !== 130) {
    console.error('The address length is not the expected one');
    return false;
  }
  if (address.match('^[a-fA-F0-9]+$') === null) {
    console.error("The address doesn't match the hex pattern");
    return false;
  }
  if (!address.startsWith('04')) {
    console.error("The address doesn't start with 04");
    return false;
  }
  return true;
};

const isTxOutStructureValid = (txOut) => {
  if (txOut === null) {
    return false;
  }
  if (typeof txOut.address !== 'string') {
    console.error("The txOut doesn't have a valid string as address");
    return false;
  }
  if (!isAddressValid(txOut.address)) {
    console.error("The txOut doesn't have a valid address");
    return false;
  }
  if (typeof txOut.amount !== 'number') {
    console.error("The txOut doesn't have a valid amount");
    return false;
  }
  return true;
};

const isTxStructureValid = (tx) => {
  if (typeof tx.id !== 'string') {
    console.error('Tx ID is not valid');
    return false;
  }
  if (!(tx.txIns instanceof Array)) {
    console.error('The txIns are not an array');
    return false;
  }
  if (
    !tx.txIns
      .map(isTxInStructureValid)
      .reduce((prev, curr) => prev && curr, true)
  ) {
    console.error('The structure of one of the txIn is not valid');
    return false;
  }
  if (!(tx.txOuts instanceof Array)) {
    console.error('The txOuts are not an array');
    return false;
  }
  if (
    !tx.txOuts
      .map(isTxOutStructureValid)
      .reduce((prev, curr) => prev && curr, true)
  ) {
    console.error('The structure of one of the txOut is not valid');
    return false;
  }
  return true;
};

const validateTxIn = (txIn, tx, uTxOutList) => {
  const wantedTxOut = uTxOutList.find(uTxOut => (
    uTxOut.txOutId === txIn.txOutId && uTxOut.txOutIndex === txIn.txOutIndex
  ));

  if (wantedTxOut === null || wantedTxOut === undefined) {
    console.error(`Didn't find the wanted uTxOut, the tx: ${tx} is invalid`);
    return false;
  }

  const { address } = wantedTxOut;
  const key = ec.keyFromPublic(address, 'hex');

  return key.verify(tx.id, txIn.signature);
};

const getAmountInTxIn = (txIn, uTxOutList) => (
  findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList).amount
);

const validateTx = (tx, uTxOutList) => {
  if (!isTxStructureValid(tx)) {
    console.error('Tx structure is invalid');
    return false;
  }
  if (getTxId(tx) !== tx.id) {
    console.error('Tx ID is not valid');
    return false;
  }

  const hasValidTxIns = tx.txIns
    .map(txIn => validateTxIn(txIn, tx, uTxOutList))
    .reduce((prev, curr) => prev && curr, true);

  if (!hasValidTxIns) {
    console.error(`The tx: ${tx} doesn't have valid txIns`);
    return false;
  }

  const amountInTxIns = tx.txIns
    .map(txIn => getAmountInTxIn(txIn, uTxOutList))
    .reduce((prev, curr) => prev + curr, 0);

  const amountInTxOuts = tx.txOuts
    .map(txOut => txOut.amount)
    .reduce((prev, curr) => prev + curr, 0);

  if (amountInTxIns !== amountInTxOuts) {
    console.error(`The tx: ${tx} doesn't have the same amount in the txOut as in the txIns`);
    return false;
  }
  return true;
};

const validateCoinbaseTx = (tx, blockIndex) => {
  if (getTxId(tx) !== tx.id) {
    console.error('Invalid Coinbase tx ID');
    return false;
  }
  if (tx.txIns.length !== 1) {
    console.error('Coinbase TX should only have one input');
    return false;
  }
  if (tx.txIns[0].txOutIndex !== blockIndex) {
    console.error('The txOutIndex of the Coinbase TX should be the same as the Block Index');
    return false;
  }
  if (tx.txOuts.length !== 1) {
    console.error('Coinbase TX should only have one output');
    return false;
  }
  if (tx.txOuts[0].amount !== COINBASE_AMOUNT) {
    console.error(`Coinbase TX should have an amount of only ${COINBASE_AMOUNT} and it has ${tx.txOuts[0].amount}`);
    return false;
  }
  return true;
};

const createCoinbaseTx = (address, blockIndex) => {
  const tx = new Transaction();
  const txIn = new TxIn();
  txIn.signature = '';
  txIn.txOutId = '';
  txIn.txOutIndex = blockIndex;
  tx.txIns = [txIn];
  tx.txOuts = [new TxOut(address, COINBASE_AMOUNT)];
  tx.id = getTxId(tx);
  return tx;
};

const hasDuplicates = (txIns) => {
  const groups = _.countBy(txIns, txIn => txIn.txOutId + txIn.txOutIndex);

  return _(groups)
    .map((value) => {
      if (value > 1) {
        console.error('Found a duplicated txIn');
        return true;
      }
      return false;
    })
    .includes(true);
};

const validateBlockTxs = (txs, uTxOutList, blockIndex) => {
  const coinbaseTx = txs[0];
  if (!validateCoinbaseTx(coinbaseTx, blockIndex)) {
    console.error('Coinbase Tx is invalid');
    return false;
  }

  const txIns = _(txs)
    .map(tx => tx.txIns)
    .flatten()
    .value();

  if (hasDuplicates(txIns)) {
    console.error('Found duplicated txIns');
    return false;
  }

  const nonCoinbaseTxs = txs.slice(1);
  return nonCoinbaseTxs
    .map(tx => validateTx(tx, uTxOutList))
    .reduce((prev, curr) => prev && curr, true);
};

const processTxs = (txs, uTxOutList, blockIndex) => {
  if (!validateBlockTxs(txs, uTxOutList, blockIndex)) {
    return null;
  }
  return updateUTxOuts(txs, uTxOutList);
};

module.exports = {
  Transaction,
  TxIn,
  TxOut,
  getPublicKey,
  getTxId,
  signTxIn,
  createCoinbaseTx,
  processTxs,
  validateTx,
};
