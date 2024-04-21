const { RemoteModel } = require("../models/remote.models");

exports.mimeTypeUpdate = async (req, res) => {
  try {
    const { remoteId } = req.params;
    const { mime_type } = req.body;

    if (!mime_type) throw new Error("mime_type undefined");

    const updateDb = await RemoteModel.updateOne(
      { _id: remoteId },
      { mime_type }
    );

    if (!updateDb?.modifiedCount) throw new Error("somting went wrong");
    return res.json({ msg: "updated" });
  } catch (err) {
    return res.json({ error: true, msg: err?.message });
  }
};
