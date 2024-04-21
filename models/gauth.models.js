const uuid = require("uuid");
const mongoose = require("mongoose");
const { Mixed } = mongoose.Schema.Types;

exports.GAuthModel = mongoose.model(
  "gauths",
  new mongoose.Schema(
    {
      _id: { type: String, default: () => uuid?.v4() },
      enable: { type: Boolean, default: false },
      email: { type: String, require: true },
      client_id: { type: String, require: true },
      client_secret: { type: String, require: true },
      refresh_token: { type: String },
      token: { type: Mixed },
      tokenAt: { type: Date },
    },
    {
      timestamps: true,
    }
  )
);
