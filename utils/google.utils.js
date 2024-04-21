const { default: axios } = require("axios");
const { GAuthModel } = require("../models/gauth.models");
const dayjs = require("dayjs");

exports.GAuthRefresh = async ({ client_id, client_secret, refresh_token }) => {
  try {
    const url = "https://www.googleapis.com/oauth2/v4/token";
    const form = {
      client_id,
      client_secret,
      refresh_token,
      grant_type: "refresh_token",
    };
    const { data } = await axios.post(url, form);
    return data;
  } catch (error) {
    return { error: true, msg: error?.message };
  }
};

exports.GAuthRand = async () => {
    try {
        const rows = await GAuthModel.aggregate([
            { $match: { enable: true } },
            { $sample: { size: 1 } },
        ]);

        if (!rows.length) throw new Error("gauth not found")
        let row = rows[0]

        if (dayjs().diff(dayjs(row?.tokeAt), "second") > 3500) {
            const data = await this.GAuthRefresh({
                client_id: row.client_id,
                client_secret: row.client_secret,
                refresh_token: row.refresh_token,
            })

            if (!data?.access_token) {
                await GAuthModel.updateOne({ _id: row?._id }, { enable: false })
                throw new Error(data?.msg)
            }

            const dataUpdate = {
                enable: true,
                token: { access_token: data?.access_token, token_type: data?.token_type },
                tokenAt: new Date()
            }

            const update = await GAuthModel.updateOne({ _id: row?._id }, dataUpdate)

            if (!update?.matchedCount)
                throw new Error("ระบบผิดพลาด กรุณาลองใหม่อีกครั้ง")
            row.token = dataUpdate.token
        }

        return row?.token
    } catch (error) {
        return { error: true, msg: error?.message }
    }
}