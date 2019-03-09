const EC = require('elliptic').ec;
const path = require('path');
const fs = require('fs');

const ec = new EC('secp256k1');

const privateKeyLocation = path.join(__dirname, 'privateKey');

const generatePrivateKey = () => {
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
};

const initWallet = () => {
  if (!fs.existsSync(privateKeyLocation)) {
    const newPrivateKey = generatePrivateKey();
    fs.writeFileSync(privateKeyLocation, newPrivateKey);
  }
};

module.exports = {
  initWallet,
};
