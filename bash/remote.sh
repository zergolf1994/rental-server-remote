localhost="127.0.0.1"
data=$(curl -sLf "http://${localhost}/task/data" | jq -r ".")
error=$(echo $data | jq -r ".error")

if [[ $error == true ]]; then
    msg=$(echo $data | jq -r ".msg")
    echo "${msg}"
    exit 1
fi


task=$(echo $data | jq -r ".task")

if [[ $task != "download" ]]; then
    echo "Task: ${task}"
    exit 1
fi

downloadId=$(echo $data | jq -r ".downloadId")
curl -s "http://${localhost}/task/update/${downloadId}?task=remote&percent=0" > /dev/null

data_remote=$(curl -sLf "http://${localhost}/remote/media" | jq -r ".")
error_remote=$(echo $data_remote | jq -r ".error")

if [[ $error_remote == true ]]; then
    msg_remote=$(echo $data_remote | jq -r ".msg")
    echo "${msg_remote}"
    exit 1
fi
echo "Remoted"