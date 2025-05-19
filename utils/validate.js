const validateId = (id) => {
  if (typeof id !== 'string' || id.trim() === '') throw { status: 400, message: 'Invalid account_id' };
}
const validateAmount = (amount) => {
  if (typeof amount !== 'number' || amount <= 0) throw { status: 400, message: 'Invalid amount' };
}

exports.validateDeposit = (id, amount) => {
  validateId(id);
  validateAmount(amount);
};

exports.validateWithdraw = exports.validateDeposit;

exports.validateTransfer = (from, to, amount) => {
  validateId(from);
  validateId(to);
  if (from === to) throw { status: 400, message: 'Cannot transfer to the same account' };
  validateAmount(amount);
};
