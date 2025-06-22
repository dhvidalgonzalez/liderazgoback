const express = require("express");
const { list, get, create, update, remove } = require("../../controllers/user");

const router = express.Router();

router.get("/", list); // GET /users
router.get("/:id", get); // GET /users/:id
router.post("/", create); // POST /users
router.put("/:id", update); // PUT /users/:id
router.delete("/:id", remove); // DELETE /users/:id

module.exports = router;
