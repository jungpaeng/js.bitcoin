const CryptoJS = require('crypto-js');
const EC = require('elliptic').ec;
const utils = require('./utils');

const ec = new EC('secp256k1');

const COINBASE_AMOUNT = 10;

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

const getPublicKey = privateKey => ec
  .keyFromPrivate(privateKey, 'hex')
  .getPublic()
  .encode('hex');

const signTxIn = (tx, txInIndex, privateKey, uTxOutList) => {
  const txIn = tx.txIns[txInIndex];
  const referencedUTxOut = findUTxOut(txIn.txOutId, tx.txOutIndex, uTxOutList);
  if (referencedUTxOut === null) {
    return null;
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
    console.error('The txIn doesn\'t have a valid signature');
    return false;
  }
  if (typeof txIn.txOutId !== 'string') {
    console.error('The txIn doesn\'t have a valid txOutId');
    return false;
  }
  if (typeof txIn.txOutIndex !== 'number') {
    console.error('The txIn doesn\'t have a valid txOutIndex');
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
    console.error('The address doesn\'t match the hex pattern');
    return false;
  }
  if (!address.startsWith('04')) {
    console.error('the address doesn\'t start with 04');
    return false;
  }
  return true;
};

const isTxOutStructureValid = (txOut) => {
  if (txOut === null) {
    return false;
  }
  if (typeof txOut.address !== 'string') {
    console.error('The txOut doesn\'t have a valid string as address');
    return false;
  }
  if (!isAddressValid(txOut.address)) {
    console.error('The txOut doesn\'t have a valid address');
    return false;
  }
  if (typeof txOut.amount !== 'number') {
    console.error('The txOut doesn\'t have a valid amount');
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
  const wantedTxOut = uTxOutList.find(
    uTxOut => uTxOut.txOutId === txIn.txOutId && uTxOut.txOutIndex === txIn.txOutIndex,
  );

  if (wantedTxOut === null) {
    console.error(`Didn't find the wanted uTxOut, the tx : ${tx} is invalid`);
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

  const hasValidTxIns = tx.txIns.map(txIn => validateTxIn(txIn, tx, uTxOutList));

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
    console.error(`the tx: ${tx} doesn't have the same amount in the txOut as in the txIns`);
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
