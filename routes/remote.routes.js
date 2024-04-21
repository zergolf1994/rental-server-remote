"use strict";
const express = require("express");
const router = express.Router();

const {
  mediaRemote,
  startRemote,
} = require("../controllers/remote.controllers");

router.get("/start", startRemote);
router.get("/media", mediaRemote);

module.exports = router;
