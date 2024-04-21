"use strict";
const express = require("express");
const router = express.Router();
const { mimeTypeUpdate } = require("../controllers/update.controllers");

router.post("/mimeType/:remoteId", mimeTypeUpdate);
module.exports = router;
