#!/bin/bash
set -euo pipefail

platform="${1:-}"
if [[ -z "$platform" ]]; then
  echo "Usage: $0 ios|tvos" >&2
  exit 1
fi

case "$platform" in
  ios)
    destination="generic/platform=iOS"
    archive_path="build/OrionTV-ios.xcarchive"
    export_path="build/ipa/ios"
    ;;
  tvos)
    destination="generic/platform=tvOS"
    archive_path="build/OrionTV-tvos.xcarchive"
    export_path="build/ipa/tvos"
    ;;
  *)
    echo "Unknown platform: $platform" >&2
    exit 1
    ;;
esac

export_options_plist="${EXPORT_OPTIONS_PLIST:-scripts/ExportOptions.plist}"
if [[ ! -f "$export_options_plist" ]]; then
  echo "Missing export options plist: $export_options_plist" >&2
  echo "Set EXPORT_OPTIONS_PLIST to a valid path." >&2
  exit 1
fi

mkdir -p "$(dirname "$archive_path")" "$export_path"

xcodebuild archive \
  -workspace ios/OrionTV.xcworkspace \
  -scheme OrionTV \
  -configuration Release \
  -destination "$destination" \
  -archivePath "$archive_path"

xcodebuild -exportArchive \
  -archivePath "$archive_path" \
  -exportPath "$export_path" \
  -exportOptionsPlist "$export_options_plist"

diawi_upload="${DIAWI_UPLOAD:-1}"
if [[ "$diawi_upload" != "0" ]]; then
  if ! command -v curl >/dev/null 2>&1; then
    echo "Diawi upload requires curl, but it was not found." >&2
    exit 1
  fi
  if ! command -v python3 >/dev/null 2>&1; then
    echo "Diawi upload requires python3 for JSON parsing, but it was not found." >&2
    exit 1
  fi

  diawi_token="${DIAWI_TOKEN:-urf9t1CjXVPyRt8AmSqcYLFTMqhWBapDOgHXkROnw4}"
  if [[ -z "$diawi_token" ]]; then
    echo "Missing Diawi token. Set DIAWI_TOKEN, or set DIAWI_UPLOAD=0 to skip upload." >&2
    exit 1
  fi

  ipa_path="${DIAWI_IPA_PATH:-}"
  if [[ -z "$ipa_path" ]]; then
    ipa_path="$(find "$export_path" -maxdepth 1 -type f -name '*.ipa' -print -quit)"
  fi
  if [[ -z "$ipa_path" || ! -f "$ipa_path" ]]; then
    echo "Unable to find exported IPA under: $export_path" >&2
    echo "Set DIAWI_IPA_PATH to the IPA file path, or set DIAWI_UPLOAD=0 to skip upload." >&2
    exit 1
  fi

  diawi_comment="${DIAWI_COMMENT:-自动化构建测试}"
  diawi_password="${DIAWI_PASSWORD:-}"

  echo "Uploading IPA to Diawi: $ipa_path"
  upload_json="$(
    curl -sS https://upload.diawi.com/ \
      -F "token=${diawi_token}" \
      -F "file=@${ipa_path}" \
      -F "find_by_udid=0" \
      -F "comment=${diawi_comment}" \
      ${diawi_password:+-F "password=${diawi_password}"}
  )"

  job_id="$(python3 -c 'import json,sys; d=json.loads(sys.stdin.read() or "{}"); j=d.get("job",""); print(str(j) if j is not None else "", end="")' <<<"$upload_json" || true)"
  if [[ -z "$job_id" ]]; then
    echo "Diawi upload did not return a job id." >&2
    echo "$upload_json" >&2
    exit 1
  fi

  poll_max_attempts="${DIAWI_POLL_MAX_ATTEMPTS:-60}"
  poll_interval_seconds="${DIAWI_POLL_INTERVAL_SECONDS:-5}"
  diawi_link=""
  last_status_json=""
  for ((attempt=1; attempt<=poll_max_attempts; attempt++)); do
    last_status_json="$(curl -sS "https://upload.diawi.com/status?token=${diawi_token}&job=${job_id}")"
    diawi_link="$(
      python3 -c 'import json,sys; d=json.loads(sys.stdin.read() or "{}"); link=d.get("link") or ""; h=d.get("hash") or ""; print(link or (f"https://i.diawi.com/{h}" if h else ""), end="")' <<<"$last_status_json" || true
    )"
    if [[ -n "$diawi_link" ]]; then
      echo "Diawi link: $diawi_link"
      break
    fi

    status="$(python3 -c 'import json,sys; d=json.loads(sys.stdin.read() or "{}"); print(d.get("status",""), end="")' <<<"$last_status_json" || true)"
    message="$(python3 -c 'import json,sys; d=json.loads(sys.stdin.read() or "{}"); print(d.get("message",""), end="")' <<<"$last_status_json" || true)"
    echo "Diawi processing (${attempt}/${poll_max_attempts}) status=${status} message=${message}"
    sleep "$poll_interval_seconds"
  done

  if [[ -z "$diawi_link" ]]; then
    echo "Diawi upload not finished or failed. job=${job_id}" >&2
    echo "$last_status_json" >&2
    exit 1
  fi

  wecom_notify="${WECOM_NOTIFY:-1}"
  if [[ "$wecom_notify" != "0" ]]; then
    wecom_webhook_url="${WECOM_WEBHOOK_URL:-https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=b79fca4a-deca-484a-b1f1-0d4641f7dc13}"
    wecom_strict="${WECOM_STRICT:-0}"

    if [[ -z "$wecom_webhook_url" ]]; then
      echo "WECOM_NOTIFY is enabled but WECOM_WEBHOOK_URL is empty; skipping WeCom notify." >&2
    else
      build_time="$(date '+%Y-%m-%d %H:%M:%S')"
      wecom_content="$(
        cat <<EOF
OrionTV 构建完成
平台: ${platform}
IPA: ${ipa_path}
Diawi: ${diawi_link}
时间: ${build_time}
EOF
      )"
      wecom_payload="$(python3 -c 'import json,sys; print(json.dumps({"msgtype":"text","text":{"content":sys.stdin.read()}}, ensure_ascii=False), end="")' <<<"$wecom_content")"

      wecom_resp="$(curl -sS -H 'Content-Type: application/json' -d "$wecom_payload" "$wecom_webhook_url" || true)"
      wecom_errcode="$(python3 -c 'import json,sys; d=json.loads(sys.stdin.read() or "{}"); print(d.get("errcode",""), end="")' <<<"$wecom_resp" || true)"
      if [[ "$wecom_errcode" == "0" ]]; then
        echo "WeCom webhook sent."
      else
        echo "WeCom webhook failed: $wecom_resp" >&2
        if [[ "$wecom_strict" == "1" ]]; then
          exit 1
        fi
      fi
    fi
  fi
fi
