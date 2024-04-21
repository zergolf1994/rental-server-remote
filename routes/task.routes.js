"use strict";
const express = require("express");
const router = express.Router();
const { createTask, dataTask, updateTask, cancleTask, startTask, dataDownload, dataMedia } = require("../controllers/task.controllers");

router.get("/", createTask);
router.get("/start", startTask);
router.get("/data", dataTask);
router.get("/data-download", dataDownload);
router.get("/data-media", dataMedia);
router.all("/update/:downloadId", updateTask);
router.get("/cancle", cancleTask);

module.exports = router;
