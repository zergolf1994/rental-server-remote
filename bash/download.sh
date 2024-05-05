localhost="127.0.0.1"
data=$(curl -sLf "http://${localhost}/task/data" | jq -r ".")
error=$(echo $data | jq -r ".error")

if [[ $error == true ]]; then
    msg=$(echo $data | jq -r ".msg")
    echo "${msg}"
    exit 1
fi


task=$(echo $data | jq -r ".task")

if [[ $task != "prepare" ]]; then
    echo "Task: ${task}"
    exit 1
fi

type=$(echo $data | jq -r ".type")

if [[ $type != "gdrive" ]]; then
    echo "type: ${type}"
    exit 1
fi
downloadId=$(echo $data | jq -r ".downloadId")
remoteId=$(echo $data | jq -r ".remoteId")
save_dir=$(echo $data | jq -r ".save_dir")

# Check if the folder exists
if [ -d "$save_dir" ]; then
    echo "has dir"
else
    echo "create dir"
    mkdir -p "$save_dir"
fi

outPut=${save_dir}/donwload
downloadtmpSave="${save_dir}/donwload.txt"

if [[ -f "$outPut" ]]; then
    rm -rf ${outPut}
fi

if [[ -f "$downloadtmpSave" ]]; then
    rm -rf ${downloadtmpSave}
fi

curl -s "http://${localhost}/task/update/${downloadId}?task=download&percent=0" > /dev/null

if [[ $type == "gdrive" ]]; then
    accessToken=$(echo $data | jq -r ".accessToken")
    source=$(echo $data | jq -r ".source")
    if [[ $accessToken != "null" ]]; then
        echo "download with accessToken"
        curl -H "Authorization: Bearer ${accessToken}" -C - https://www.googleapis.com/drive/v3/files/${source}?alt=media -o ${outPut}  --progress-bar > ${downloadtmpSave} 2>&1
    else
        echo "download without accessToken"

        # ดาวน์โหลดหน้าแรกและบันทึกไว้ใน cookie.txt
        curl -c ./cookie.txt -s -L "https://drive.google.com/uc?export=download&id=${source}" > /dev/null

        # ดาวน์โหลดไฟล์จริงๆ โดยระบุความคืบหน้าและบันทึกลงใน ${filename}
        curl -Lb ./cookie.txt "https://drive.google.com/uc?export=download&confirm=$(awk '/download/ {print $NF}' ./cookie.txt)&id=${source}" -o ${outPut} --progress-bar > ${downloadtmpSave} 2>&1

        # ลบไฟล์ cookie.txt เนื่องจากไม่ได้ใช้แล้ว
        rm ./cookie.txt
    fi
fi

if [[ $type == "mp4" ]]; then
    source=$(echo $data | jq -r ".source")
    curl "${source}" -o ${outPut} --progress-bar > ${downloadtmpSave} 2>&1
fi

echo "Downloaded"

data_mime_type=$(echo $data | jq -r ".mime_type")

if [[ $data_mime_type != "null" ]]; then
    mime_type=$(file --mime-type -b ${outPut})
    data_update="{\"mime_type\":\"${mime_type}\"}"
    # ทำการร้องขอ POST
    response_update=$(curl -X POST -H "Content-Type: application/json" -d "$data_update" -sLf "http://${localhost}/update/mimeType/${remoteId}"  | jq -r ".")

    error_update=$(echo $response_update | jq -r ".error")
    if [[ $error == true ]]; then
        msgr_update=$(echo $response_update | jq -r ".msg")
        echo "${msg}"
        exit 1
    fi
    echo "Update MimeType"

fi
#leep 1

#ส่งต่อไปยังประมวลผล
curl -s "http://${localhost}/remote/start" > /dev/null
exit 1