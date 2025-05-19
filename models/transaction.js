const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('deposit', 'withdraw', 'transfer'),
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    fromAccountId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    toAccountId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  return Transaction;
};
