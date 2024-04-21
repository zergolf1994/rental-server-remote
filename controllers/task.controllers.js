const shell = require("shelljs");
const fs = require("fs-extra");
const mimeTypes = require("mime-types");

const { getLocalServer } = require("../utils/server.utils");
const { ErrorModel } = require("../models/error.models");
const { RemoteDownloadModel } = require("../models/remote-download.models");
const { RemoteModel } = require("../models/remote.models");
const { GAuthRand } = require("../utils/google.utils");
const { get_video_info } = require("../utils/ffmpeg");

exports.createTask = async (req, res) => {
  try {
    const { remoteId } = req.query;
    if (!remoteId) throw new Error("fileId not found");

    const server = await getLocalServer([
      {
        enable: true,
      },
      {
        _id: {
          $nin: await RemoteDownloadModel.distinct("serverId"),
        },
      },
    ]);
    if (!server?._id) throw new Error("Server is busy");

    const file = await RemoteModel.findOne({
      $and: [
        //ต้องไม่มีไฟล์ error
        {
          _id: {
            $nin: await ErrorModel.distinct("fileId"),
          },
        },
        //ต้องไม่มีไฟล์ กำลังดาวน์โหลด
        {
          _id: {
            $nin: await RemoteDownloadModel.distinct("fileId"),
          },
        },
        {
          _id: remoteId,
        },
      ],
    });

    if (!file) throw new Error("File not found");

    let data_download = {
      remoteId,
    };

    const downloading = await RemoteDownloadModel.countDocuments(data_download);
    if (downloading) throw new Error("Downloading");

    data_download.task = "prepare";
    data_download.serverId = server?._id;

    const saveDb = await RemoteDownloadModel.create(data_download);
    if (!saveDb?._id) throw new Error("Error");
    
    // คำสั่ง เพื่อดำเนินการ ส่งต่อไปยัง bash
    shell.exec(
      `sudo bash ${global.dir}/bash/download.sh`,
      { async: false, silent: false },
      function (data) {}
    );

    return res.json({ msg: "task create", saveDb });
  } catch (err) {
    console.log(err);
    return res.json({ error: true, msg: err?.message });
  }
};
exports.startTask = async (req, res) => {
  try {
    // คำสั่ง เพื่อดำเนินการ ส่งต่อไปยัง bash
    shell.exec(
      `sudo bash ${global.dir}/bash/download.sh`,
      { async: false, silent: false },
      function (data) {}
    );

    return res.json({ msg: "task start" });
  } catch (err) {
    console.log(err);
    return res.json({ error: true, msg: err?.message });
  }
};
exports.dataTask = async (req, res) => {
  try {
    const server = await getLocalServer();
    const download = await RemoteDownloadModel.aggregate([
      { $match: { serverId: server?._id } },
      { $limit: 1 },
      //remotes
      {
        $lookup: {
          from: "remotes",
          localField: "remoteId",
          foreignField: "_id",
          as: "remotes",
          pipeline: [
            {
              $project: {
                _id: 0,
                type: 1,
                source: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          remote: { $arrayElemAt: ["$remotes", 0] },
        },
      },
      {
        $set: {
          type: "$remote.type",
          source: "$remote.source",
          save_dir: {
            $concat: [global.dirPublic, "/", "$$ROOT.remoteId"],
          },
        },
      },
      {
        $project: {
          _id: 0,
          downloadId: "$$ROOT._id",
          remoteId: 1,
          type: 1,
          source: 1,
          task: 1,
          percent: 1,
          save_dir: 1,
        },
      },
    ]);

    if (!download?.length) throw new Error("Download not found");
    const file = download[0];

    let data = {
      ...file,
    };
    if (file?.type == "gdrive") {
      const token = await GAuthRand();
      data.accessToken = token?.access_token || undefined;
    }
    return res.json(data);
  } catch (err) {
    return res.json({ error: true, msg: err?.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { downloadId } = req.params;
    const { task, percent } = req.query;
    if (!downloadId) throw new Error("downloadId not found");

    const row = await RemoteDownloadModel.findOne({ _id: downloadId });

    if (!row) throw new Error("Encode not found");
    if (task != undefined) row.task = task;
    if (percent != undefined) row.percent = percent;
    if (task != undefined || percent != undefined) {
      row.save();
    }
    return res.json(row);
  } catch (err) {
    return res.json({ error: true, msg: err?.message });
  }
};

exports.cancleTask = async (req, res) => {
  try {
    const server = await getLocalServer();

    if (!server?._id) throw new Error("Server not found");

    const deleteDb = await RemoteDownloadModel.deleteMany({
      serverId: server?._id,
    });
    if (!deleteDb.deletedCount) throw new Error("Encode not found");

    // คำสั่ง เพื่อดำเนินการ ส่งต่อไปยัง bash
    shell.exec(
      `sudo bash ${global.dir}/bash/cancle-encode.sh`,
      { async: false, silent: false },
      function (data) {}
    );

    return res.json({ msg: "cancelled" });
  } catch (err) {
    return res.json({ error: true, msg: err?.message });
  }
};

exports.dataDownload = async (req, res) => {
  try {
    const server = await getLocalServer();
    const download = await RemoteDownloadModel.aggregate([
      { $match: { serverId: server?._id } },
      { $limit: 1 },
      //remotes
      {
        $lookup: {
          from: "remotes",
          localField: "remoteId",
          foreignField: "_id",
          as: "remotes",
          pipeline: [
            {
              $project: {
                _id: 0,
                type: 1,
                source: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          remote: { $arrayElemAt: ["$remotes", 0] },
        },
      },
      {
        $set: {
          file_txt: {
            $concat: [
              global.dirPublic,
              "/",
              "$$ROOT.remoteId",
              "/",
              "donwload.txt",
            ],
          },
          file_media: {
            $concat: [
              global.dirPublic,
              "/",
              "$$ROOT.remoteId",
              "/",
              "donwload",
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          downloadId: "$$ROOT._id",
          remoteId: 1,
          file_txt: 1,
          file_media: 1,
        },
      },
    ]);

    if (!download?.length) throw new Error("Download not found");
    const file = download[0];

    const logData = await fs.readFileSync(file.file_txt, "utf-8");
    let code = logData
      .toString()
      .replace(/ /g, "")
      .replace(/#/g, "")
      .split(/\r?\n/);

    const dataRaw = code.filter((e) => {
      return e != "";
    });

    const Array = dataRaw
      .at(0)
      .split(/\r/)
      .filter((e) => {
        return Number(e.replace(/%/g, ""));
      })
      .map((e) => {
        return Number(e.replace(/%/g, ""));
      });

    let data = {
      percent: Math.max(...Array) || 0,
    };
    return res.json(data);
  } catch (err) {
    return res.json({ error: true, msg: err?.message });
  }
};

exports.dataMedia = async (req, res) => {
  try {
    const server = await getLocalServer();
    const download = await RemoteDownloadModel.aggregate([
      { $match: { serverId: server?._id } },
      { $limit: 1 },
      //remotes
      {
        $lookup: {
          from: "remotes",
          localField: "remoteId",
          foreignField: "_id",
          as: "remotes",
          pipeline: [
            {
              $project: {
                _id: 0,
                type: 1,
                source: 1,
                mime_type: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          remote: { $arrayElemAt: ["$remotes", 0] },
        },
      },
      {
        $set: {
          file_txt: {
            $concat: [
              global.dirPublic,
              "/",
              "$$ROOT.remoteId",
              "/",
              "donwload.txt",
            ],
          },
          file_media: {
            $concat: [
              global.dirPublic,
              "/",
              "$$ROOT.remoteId",
              "/",
              "donwload",
            ],
          },
          mime_type: "$remote.mime_type",
        },
      },
      {
        $project: {
          _id: 0,
          downloadId: "$$ROOT._id",
          remoteId: 1,
          file_txt: 1,
          file_media: 1,
          mime_type: 1,
        },
      },
    ]);

    if (!download?.length) throw new Error("Download not found");
    const file = download[0];

    const extension = mimeTypes.extension(file.mime_type);
    //const video = await get_video_info(file.file_media);

    let data = {
      extension,
      file
    };
    return res.json(data);
  } catch (err) {
    return res.json({ error: true, msg: err?.message });
  }
};
