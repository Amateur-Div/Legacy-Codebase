const app = require("express")();
const api = require("express").Router();
const v1 = require("express").Router();

app.use("/api", api);
api.use("/v1", v1);

v1.get("/users", () => {});
