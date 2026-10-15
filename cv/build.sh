#!/usr/bin/env sh
# Rebuild the downloadable CV (Yongama_Goso_CV.pdf) from cv/resume.html.
# Usage: sh cv/build.sh   (set CHROME=/path/to/chrome if Chromium isn't on the default path)
set -e
cd "$(dirname "$0")/.."
CHROME="${CHROME:-$(command -v chromium || command -v google-chrome || echo /opt/pw-browsers/chromium-1194/chrome-linux/chrome)}"
"$CHROME" --headless --no-sandbox --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$PWD/Yongama_Goso_CV.pdf" "file://$PWD/cv/resume.html"
