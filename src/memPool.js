const _ = require('lodash');

const getTxInsInPool = memPool => _(memPool)
  .map(tx => tx.txIns)
  .flatten()
  .value();

const isTxValidForPool = (tx, memPool) => {
  const txInsInPool = getTxInsInPool(memPool);

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
