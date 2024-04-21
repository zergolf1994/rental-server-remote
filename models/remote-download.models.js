const uuid = require("uuid");
const mongoose = require("mongoose");

exports.RemoteDownloadModel = mongoose.model(
  "remote_downloads",
  new mongoose.Schema(
    {
      _id: { type: String, default: () => uuid?.v4() },
      task: { type: String, default: "prepare" },
      percent: { type: Number, default: 0 },
      remoteId: { type: String, required: true },
      serverId: { type: String, required: true },
    },
    {
      timestamps: true,
    }
  )
);
