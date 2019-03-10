const _ = require('lodash');
const Transaction = require('./transaction');

const { validateTx } = Transaction;

let mempool = [];

const getMempool = () => _.cloneDeep(mempool);

const getTxInsInPool = mempool => _(mempool)
  .map(tx => tx.txIns)
  .flatten()
  .value();

const isTxValidForPool = (tx, mempool) => {
  const txInsInPool = getTxInsInPool(mempool);

  const isTxInAlreadyInPool = (txIns, txIn) => _.find(
    txIns,
    txInInPool => (
      txIn.txOutIndex === txInInPool.txOutIndex
      && txIn.txOutId === txInInPool.txOutId
    ),
  );

  return tx.txIns.every(txIn => (
    !isTxInAlreadyInPool(txInsInPool, txIn)
  ));
};

const hasTxIn = (txIn, uTxOutList) => {
  const foundTxIn = uTxOutList.find(uTxO => (
    uTxO.txOutId === txIn.txOutId
    && uTxO.txOutIndex === txIn.txOutIndex
  ));

  return foundTxIn !== undefined;
};

const updateMempool = (uTxOutList) => {
  const invalidTxs = [];

  mempool.forEach((tx) => {
    tx.txIns.some((txIn) => {
      if (!hasTxIn(txIn, uTxOutList)) {
        invalidTxs.push(tx);
        return true;
      }
      return false;
    });
  });

  if (invalidTxs.length > 0) {
    mempool = _.without(mempool, ...invalidTxs);
  }
};

const addToMempool = (tx, uTxOutList) => {
  if (!validateTx(tx, uTxOutList)) {
    throw Error('This tx is invalid. Will not add it to pool.');
  } else if (!isTxValidForPool(tx, mempool)) {
    throw Error('This tx is not valid for the pool. Will not add it.');
  }
  mempool.push(tx);
};

module.exports = {
  addToMempool,
  getMempool,
  updateMempool,
};
