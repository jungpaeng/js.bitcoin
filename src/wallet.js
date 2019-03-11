const EC = require('elliptic').ec;
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const Transactions = require('./transaction');

const {
  Transaction, TxIn, TxOut, getPublicKey, getTxId, signTxIn,
} = Transactions;

const ec = new EC('secp256k1');

const privateKeyLocation = path.join(__dirname, 'privateKey');

const generatePrivateKey = () => {
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
};

const getPrivateFromWallet = () => {
  const buffer = fs.readFileSync(privateKeyLocation, 'utf8');
  return buffer.toString();
};

const getPublicFromWallet = () => {
  const privateKey = getPrivateFromWallet();
  const key = ec.keyFromPrivate(privateKey, 'hex');
  return key.getPublic().encode('hex');
};

const findUTxOuts = (address, uTxOuts) => _.filter(
  uTxOuts,
  uTxOut => uTxOut.address === address,
);

const getBalance = (address, uTxOuts) => (
  _(findUTxOuts(address, uTxOuts))
    .filter(uTxO => uTxO.address === address)
    .map(uTxO => uTxO.amount)
    .sum()
);
const initWallet = () => {
  if (!fs.existsSync(privateKeyLocation)) {
    const newPrivateKey = generatePrivateKey();
    fs.writeFileSync(privateKeyLocation, newPrivateKey);
  }
};

const findAmountInUTxOuts = (amountNeeded, myUTxOuts) => {
  let currentAmount = 0;
  const includedUTxOuts = [];

  for (let index = 0; index < myUTxOuts.length; index += 1) {
    const myUTxOut = myUTxOuts[index];
    includedUTxOuts.push(myUTxOut);
    currentAmount += myUTxOut.amount;

    if (currentAmount >= amountNeeded) {
      const leftOverAmount = currentAmount - amountNeeded;
      return { includedUTxOuts, leftOverAmount };
    }
  }
  throw Error('Not enough founds');
};

const createTxOut = (receiverAddress, myAddress, amount, leftOverAmount) => {
  const receiverTxOut = new TxOut(receiverAddress, amount);
  if (leftOverAmount === 0) {
    return [receiverTxOut];
  }
  const leftOverTxOut = new TxOut(myAddress, leftOverAmount);
  return [receiverTxOut, leftOverTxOut];
};

const filterUTxOutsFromMempool = (uTxOutList, mempool) => {
  const removables = [];
  const txIns = _(mempool)
    .map(tx => tx.txIns)
    .flatten()
    .value();

  uTxOutList.forEach((uTxOut) => {
    const txIn = _.find(
      txIns,
      txIn => (
        txIn.txOutIndex === uTxOut.txOutIndex
        && txIn.txOutId === uTxOut.txOutId
      ),
    );

    if (txIn !== undefined) {
      removables.push(uTxOut);
    }
  });

  return _.without(uTxOutList, ...removables);
};

const createTx = (receiverAddress, amount, privateKey, uTxOutList, mempool) => {
  const myAddress = getPublicKey(privateKey);
  const myUTxOuts = uTxOutList.filter(uTxO => uTxO.address === myAddress);
  const filteredUTxOuts = filterUTxOutsFromMempool(myUTxOuts, mempool);
  const { includedUTxOuts, leftOverAmount } = findAmountInUTxOuts(amount, filteredUTxOuts);

  const toUTxIn = (uTxOut) => {
    const txIn = new TxIn();
    txIn.txOutId = uTxOut.txOutId;
    txIn.txOutIndex = uTxOut.txOutIndex;
    return txIn;
  };

  const uTxIns = includedUTxOuts.map(toUTxIn);
  const tx = new Transaction();

  tx.txIns = uTxIns;
  tx.txOuts = createTxOut(receiverAddress, myAddress, amount, leftOverAmount);
  tx.id = getTxId(tx);
  tx.txIns = tx.txIns.map((txIn, index) => {
    txIn.signature = signTxIn(tx, index, privateKey, uTxOutList);
    return txIn;
  });
  tx.amount = amount;
  tx.from = myAddress;
  tx.to = receiverAddress;

  return tx;
};

module.exports = {
  initWallet,
  getBalance,
  getPublicFromWallet,
  getPrivateFromWallet,
  createTx,
  findUTxOuts,
};
