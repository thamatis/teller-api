const transactionService = require('../services/transactionService');

exports.deposit = async (req, res, next) => {
  const { account_id, amount, to_account_distributions } = req.body;

  try {
    let result;
    if (account_id) {
      result = await transactionService.deposit({ account_id, amount });
    } else if (to_account_distributions) {
      result = await transactionService.depositToMultipleAccounts({ amount, to_account_distributions });
    } else {
      return res.status(400).json({ message: 'Invalid deposit parameters' });
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.withdraw = async (req, res, next) => {
  try {
    const result = await transactionService.withdraw(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.transfer = async (req, res, next) => {
  try {
    const result = await transactionService.transfer(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};