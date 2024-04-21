const uuid = require("uuid");
const mongoose = require("mongoose");
const { Mixed } = mongoose.Schema.Types;

exports.SettingModel = mongoose.model(
  "settings",
  new mongoose.Schema(
    {
      _id: { type: String, default: () => uuid?.v4() },
      name: { type: String, required: true, unique: true },
      value: { type: Mixed },
      comment: { type: String },
    },
    {
      timestamps: true,
    }
  )
);
