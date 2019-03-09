const toHexString = byteArr => Array.from(
  byteArr, byte => (`0${(byte & 0xFF).toString(16)}`).slice(-2),
).join('');

module.exports = { toHexString };
