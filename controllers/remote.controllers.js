const shell = require("shelljs");
const mimeTypes = require("mime-types");

const { getLocalServer, getStorageServer } = require("../utils/server.utils");
const { MediaModel } = require("../models/media.models");
const { SCPRemoteHLS } = require("../utils/scp.utils");
const { get_video_details } = require("../utils/ffmpeg");
const { slugFile, slugMedia } = require("../utils/random");
const { RemoteDownloadModel } = require("../models/remote-download.models");
const { FileModel } = require("../models/file.models");
const { RemoteModel } = require("../models/remote.models");

exports.startRemote = async (req, res) => {
  try {
    // คำสั่ง เพื่อดำเนินการ ส่งต่อไปยัง bash
    shell.exec(
      `sudo bash ${global.dir}/bash/remote.sh`,
      { async: false, silent: false },
      function (data) {}
    );
    return res.json({ msg: "start remote video" });
  } catch (err) {
    return res.json({ error: true, msg: err?.message });
  }
};

exports.mediaRemote = async (req, res) => {
  try {
    const server = await getLocalServer();

    if (!server?._id) throw new Error("Server not found");

    const downloads = await RemoteDownloadModel.aggregate([
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
                userId: 1,
                mime_type: 1,
                folderId: 1,
                categoryId: 1,
                title: 1,
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
          userId: "$remote.userId",
          folderId: "$remote.folderId",
          categoryId: "$remote.categoryId",
          title: "$remote.title",
        },
      },
      {
        $project: {
          _id: 0,
          downloadId: "$$ROOT._id",
          remoteId: 1,
          file_txt: 1,
          file_media: 1,
          userId: 1,
          mime_type: 1,
          folderId: 1,
          categoryId: 1,
          title: 1,
        },
      },
    ]);

    if (!downloads?.length) throw new Error("Download not found");
    const download = downloads[0];

    const video = await get_video_details(download.file_media);

    if (video.error) {
      throw new Error(video.msg);
    }

    const slug = await slugFile(12);
    //สร้างไฟล์
    let dataSave = {
      userId: download.userId,
      slug,
      title: download.title,
      mimeType: download.mime_type,
      size: video?.size,
      duration: video?.duration,
      highest: video?.highest,
      folderId: download?.folderId || undefined,
      categoryId: download?.categoryId,
    };

    const fileSave = await FileModel.create(dataSave);
    if (!fileSave?._id) {
      return res
        .status(400)
        .json({ error: true, msg: "Something went wrong." });
    }
    const save_name = `${slug}.${mimeTypes.extension(download.mime_type)}`;
    //สร้าง media
    let dataMedia = {
      fileId: fileSave?._id,
      file_name: save_name,
      quality: "original",
      size: video?.size,
      dimention: video?.dimention,
      mimeType: download.mime_type,
      serverId: server._id,
      slug: await slugMedia(12),
    };

    const storage = await getStorageServer();

    if (storage?.auth) {
      const scp_data = await SCPRemoteHLS({
        ssh: storage.auth,
        file: {
          file_name: dataMedia.file_name,
          save_dir: `/home/files/${fileSave?._id}`,
          file_local: download.file_media,
        },
      });

      if (!scp_data?.error) {
        dataMedia.serverId = storage.serverId;
      } else {
        throw new Error(scp_data?.msg);
      }
    }

    const mediaSave = await MediaModel.create(dataMedia);
    if (!mediaSave?._id) {
      throw new Error("save media error");
    }

    await RemoteModel.deleteOne({ _id: download?.remoteId });
    await RemoteDownloadModel.deleteOne({ _id: download?.downloadId });
    // ลบไฟล์ที่โหลดมา
    shell.exec(
      `sudo rm -rf ${global.dirPublic}/${download?.remoteId}`,
      { async: false, silent: false },
      function (data) {}
    );

    return res.json({ msg: "remoted", slug });
  } catch (err) {
    return res.json({ error: true, msg: err?.message });
  }
};
