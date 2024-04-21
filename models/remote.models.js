const uuid = require("uuid");
const mongoose = require("mongoose");

exports.RemoteModel = mongoose.model(
  "remotes",
  new mongoose.Schema(
    {
      _id: { type: String, default: () => uuid?.v4() },
      title: { type: String },
      type: { type: String, require: true },
      source: { type: String, require: true },
      userId: { type: String, require: true },
      folderId: { type: String },
      categoryId: { type: String },
    },
    {
      timestamps: true,
    }
  )
);