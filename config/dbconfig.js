require("dotenv").config();

module.exports = {
  test: {
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
  },
  sit: {
    url: process.env.DATABASE_URL,
    dialect: "postgres",
    logging: false,
  },
  prod: {
    url: process.env.DATABASE_URL,
    dialect: "postgres",
    logging: false,
  },
};
