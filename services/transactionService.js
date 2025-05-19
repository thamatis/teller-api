const { Account, sequelize } = require("../models");
const {
  validateDeposit,
  validateWithdraw,
  validateTransfer,
} = require("../utils/validate");

exports.deposit = async ({ account_id, amount }) => {
  validateDeposit(account_id, amount);

  const account = await Account.findByPk(account_id);
  if (!account) throw { status: 400, message: 'Invalid account ID' };

  account.balance += amount;
  await account.save();
  return { message: 'Deposit successful', balance: account.balance };
};

exports.depositToMultipleAccounts = async ({ amount, to_account_distributions }) => {
  if (!Array.isArray(to_account_distributions) || to_account_distributions.length === 0) {
    throw { status: 400, message: 'Invalid distribution list' };
  }

  const total = to_account_distributions.reduce((sum, acc) => sum + acc.amount, 0);
  if (total !== amount) {
    throw { status: 400, message: 'Sum of distributions does not match total amount' };
  }

  const t = await sequelize.transaction();
  try {
    for (const dist of to_account_distributions) {
      const account = await Account.findByPk(dist.account_id, { transaction: t });
      if (!account) throw { status: 400, message: `Account ${dist.account_id} not found` };

      account.balance += dist.amount;
      await account.save({ transaction: t });
    }

    await t.commit();
    return { message: 'Deposit distributed successfully' };
  } catch (err) {
    if (t && !t.finished) await t.rollback();
    throw err;
  }
};

exports.withdraw = async ({ account_id, amount }) => {
  validateWithdraw(account_id, amount);

  const account = await Account.findByPk(account_id);
  if (!account) throw { status: 400, message: "Invalid account ID" };
  if (account.balance < amount)
    throw { status: 403, message: "Insufficient funds" };

  account.balance -= amount;
  await account.save();
  return { message: "Withdraw successful", balance: account.balance };
};

exports.transfer = async ({ from_account_id, to_account_id, amount }) => {
  validateTransfer(from_account_id, to_account_id, amount);

  return await sequelize.transaction(async (t) => {
    const from = await Account.findByPk(from_account_id, { transaction: t });
    const to = await Account.findByPk(to_account_id, { transaction: t });

    if (!from || !to) throw { status: 400, message: "Invalid account ID(s)" };
    if (from.balance < amount)
      throw { status: 403, message: "Insufficient funds" };

    from.balance -= amount;
    to.balance += amount;

    await from.save({ transaction: t });
    await to.save({ transaction: t });

    return { message: "Transfer successful" };
  });
};