const _ = require('lodash');
const Transaction = require('./transaction');

const { validateTx } = Transaction;

const mempool = [];

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
};
