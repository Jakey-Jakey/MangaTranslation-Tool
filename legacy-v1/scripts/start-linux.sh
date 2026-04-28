#!/usr/bin/env sh
set -e
export PATH="/usr/local/bin:$PATH"
cd "$(dirname "$0")/.."
if [ ! -d node_modules ]; then
  npm install
fi
node --no-warnings server/index.js
