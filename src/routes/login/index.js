const express = require("express");
const { login, logout } = require("../../controllers/login");

const router = express.Router();

// POST /api/login
router.post("/", login);

// POST /api/login/logout
router.post("/logout", logout);

module.exports = router;
