const { RemoteDownloadModel } = require("../models/remote-download.models");

exports.taskUpdateDb = async (taskId, data = {}) => {
  try {
    await RemoteDownloadModel.updateOne({ _id: taskId }, { ...data });
    return true;
  } catch (error) {
    return null;
  }
};
