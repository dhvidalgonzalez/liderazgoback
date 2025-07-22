const express = require("express");
const { login, logout, changePassword } = require("../../controllers/login");

const router = express.Router();

// POST /api/login
router.post("/", login);

// POST /api/login/logout
router.post("/logout", logout);

// POST /api/login/change-password
router.post("/change-password", changePassword);

module.exports = router;
