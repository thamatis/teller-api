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
    { expiresIn: "1h" }
  );

  auditorToken = jwt.sign(
    { userId: user.id, role: "auditor" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  await Account.create({ id: "FROM123", balance: 1000 });
  await Account.create({ id: "TO123", balance: 200 });
});

afterAll(async () => {
  await sequelize.close();
});

describe("POST /transfer", () => {
  it("should return 401 for missing token", async () => {
    const res = await request(app).post("/api/transaction/transfer").send({
      from_account_id: "FROM123",
      to_account_id: "TO123",
      amount: 100,
    });
    expect(res.statusCode).toBe(401);
  });

  it("should return 401 for invalid token", async () => {
    const res = await request(app)
      .post("/api/transaction/transfer")
      .set("Authorization", "Bearer invalidtoken")
      .send({
        from_account_id: "FROM123",
        to_account_id: "TO123",
        amount: 100,
      });
    expect(res.statusCode).toBe(401);
  });

  it("should return 403 for unauthorized role", async () => {
    const res = await request(app)
      .post("/api/transaction/transfer")
      .set("Authorization", `Bearer ${auditorToken}`)
      .send({
        from_account_id: "FROM123",
        to_account_id: "TO123",
        amount: 100,
      });
    expect(res.statusCode).toBe(403);
  });

  it("should transfer successfully", async () => {
    const res = await request(app)
      .post("/api/transaction/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({
        from_account_id: "FROM123",
        to_account_id: "TO123",
        amount: 300,
      });
    expect(res.statusCode).toBe(200);

    const updatedFrom = await Account.findByPk("FROM123");
    const updatedTo = await Account.findByPk("TO123");

    expect(updatedFrom.balance).toBe(700);
    expect(updatedTo.balance).toBe(500);
  });

  it("should return 403 if insufficient funds", async () => {
    const res = await request(app)
      .post("/api/transaction/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({
        from_account_id: "FROM123",
        to_account_id: "TO123",
        amount: 10000,
      });
    expect(res.statusCode).toBe(403);
  });

  it("should return 400 for missing parameters", async () => {
    const res = await request(app)
      .post("/api/transaction/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 100 });
    expect(res.statusCode).toBe(400);
  });

  it("should return 400 if account ids are invalid", async () => {
    const res = await request(app)
      .post("/api/transaction/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({
        from_account_id: "INVALID",
        to_account_id: "TO123",
        amount: 100,
      });
    expect(res.statusCode).toBe(400);
  });

  it("should return 400 for same account transfer", async () => {
    const res = await request(app)
      .post("/api/transaction/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({
        from_account_id: "FROM123",
        to_account_id: "FROM123",
        amount: 100,
      });
    expect(res.statusCode).toBe(400);
  });

  it("should return 400 if amount is negative", async () => {
    const res = await request(app)
      .post("/api/transaction/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({
        from_account_id: "FROM123",
        to_account_id: "TO123",
        amount: -100,
      });
    expect(res.statusCode).toBe(400);
  });

  it("should return 400 if amount is not a number", async () => {
    const res = await request(app)
      .post("/api/transaction/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({
        from_account_id: "FROM123",
        to_account_id: "TO123",
        amount: "hundred",
      });
    expect(res.statusCode).toBe(400);
  });
});
