const { Sequelize } = require('sequelize');
const env = process.env.NODE_ENV;
const config = require('../config/dbconfig')[env];

let sequelize;

if (config.url) {
  sequelize = new Sequelize(config.url, config);
} else {
  sequelize = new Sequelize(config);
}

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.Account = require('./account')(sequelize);
db.Transaction = require('./transaction')(sequelize);
db.User = require('./user')(sequelize);

module.exports = db;
