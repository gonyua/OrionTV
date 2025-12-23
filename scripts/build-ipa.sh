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
