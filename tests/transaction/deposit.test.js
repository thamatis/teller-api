const request = require("supertest");
const app = require("../../app");
const { sequelize, Account, User } = require("../../models");
const jwt = require("jsonwebtoken");

let token;
let auditorToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const user = await User.create({
    username: "testuser",
    password: "hashedpassword",
    role: "teller",
  });

  token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  auditorToken = jwt.sign(
    { userId: user.id, role: "auditor" },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  await Account.create({ id: "ACC123", balance: 1000 });
  await Account.create({ id: "A001", balance: 100 });
  await Account.create({ id: "A002", balance: 200 });
});

afterAll(async () => {
  await sequelize.close();
});

describe("POST /deposit", () => {
  it("should return 401 for missing token", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .send({ account_id: "ACC123", amount: 100 });

    expect(response.statusCode).toBe(401);
  });

  it("should return 401 for invalid token", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer invalidtoken`)
      .send({ account_id: "ACC123", amount: 100 });

    expect(response.statusCode).toBe(401);
  });

  it("should return 403 for unauthorized role", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${auditorToken}`)
      .send({ account_id: "ACC123", amount: 100 });

    expect(response.statusCode).toBe(403);
  });

  it("should return 400 for missing field 'accountId' and 'to_account_distributions'", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 100 });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for amount as a string", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({ account_id: "ACC123", amount: "100" });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for negative amount", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({ account_id: "ACC123", amount: -50 });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for zero amount", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({ account_id: "ACC123", amount: 0 });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for invalid type in distribution amount", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 300,
        to_account_distributions: [
          { account_id: "A001", amount: "150" },
          { account_id: "A002", amount: 150 },
        ],
      });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for missing account_id field in distribution", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 200,
        to_account_distributions: [
          { account_id: "A001", amount: 100 },
          { amount: 200 },
        ],
      });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for missing amount field in distribution", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 200,
        to_account_distributions: [
          { account_id: "A001", amount: 100 },
          { account_id: "A002"},
        ],
      });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for null values of account_id", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        account_id: null,
        amount: 200,
      });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for null values of amount", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        account_id: "ACC123",
        amount: null,
      });

    expect(response.statusCode).toBe(400);
  });

  it("should deposit successfully", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({ account_id: "ACC123", amount: 500 });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("balance", 1500);
  });

  it("should return 400 for invalid account", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({ account_id: "INVALID", amount: 100 });

    expect(response.statusCode).toBe(400);
  });

  it("should deposit to multiple accounts successfully", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 300,
        to_account_distributions: [
          { account_id: "A001", amount: 100 },
          { account_id: "A002", amount: 200 },
        ],
      });

    expect(response.statusCode).toBe(200);

    const updatedA = await Account.findByPk("A001");
    const updatedB = await Account.findByPk("A002");

    expect(updatedA.balance).toBe(200);
    expect(updatedB.balance).toBe(400);
  });

  it("should return 400 if distribution total does not match amount", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 300,
        to_account_distributions: [
          { account_id: "A001", amount: 100 },
          { account_id: "A002", amount: 100 },
        ],
      });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 if distribution list is missing or empty", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 100,
        to_account_distributions: [],
      });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 if neither account_id nor distribution provided", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 100,
      });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 if one of the distribution accounts not found", async () => {
    const response = await request(app)
      .post("/api/transaction/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 200,
        to_account_distributions: [{ account_id: "NON_EXISTING", amount: 200 }],
      });

    expect(response.statusCode).toBe(400);
  });
});
