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

  await Account.create({ id: "ACC123", balance: 1000 });
});

afterAll(async () => {
  await sequelize.close();
});

describe("POST /withdraw", () => {
  it("should return 401 for missing token", async () => {
    const res = await request(app).post("/api/transaction/withdraw").send({
      account_id: "ACC123",
      amount: 100,
    });
    expect(res.statusCode).toBe(401);
  });

  it("should return 401 for invalid token", async () => {
    const res = await request(app)
      .post("/api/transaction/withdraw")
      .set("Authorization", "Bearer wrongtoken")
      .send({
        account_id: "ACC123",
        amount: 100,
      });
    expect(res.statusCode).toBe(401);
  });

  it("should return 403 for unauthorized role", async () => {
    const res = await request(app)
      .post("/api/transaction/withdraw")
      .set("Authorization", `Bearer ${auditorToken}`)
      .send({
        account_id: "ACC123",
        amount: 100,
      });
    expect(res.statusCode).toBe(403);
  });

  it("should withdraw successfully", async () => {
    const res = await request(app)
      .post("/api/transaction/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({
        account_id: "ACC123",
        amount: 200,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("balance", 800);
  });

  it("should return 403 if insufficient funds", async () => {
    const res = await request(app)
      .post("/api/transaction/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({
        account_id: "ACC123",
        amount: 99999,
      });

    expect(res.statusCode).toBe(403);
  });

  it("should return 400 if account not found", async () => {
    const res = await request(app)
      .post("/api/transaction/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({
        account_id: "NOT_EXIST",
        amount: 100,
      });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 for invalid account_id type", async () => {
    const res = await request(app)
      .post("/api/transaction/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({
        account_id: 123,
        amount: 100,
      });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 for invalid amount type", async () => {
    const res = await request(app)
      .post("/api/transaction/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({
        account_id: "ACC123",
        amount: "hundred",
      });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 for missing account_id", async () => {
    const res = await request(app)
      .post("/api/transaction/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 100,
      });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 for missing amount", async () => {
    const res = await request(app)
      .post("/api/transaction/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({
        account_id: "ACC123",
      });

    expect(res.statusCode).toBe(400);
  });
});
