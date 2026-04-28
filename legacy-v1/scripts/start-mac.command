#!/bin/zsh
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")/.."
if [ ! -d node_modules ]; then
  npm install
fi
node --no-warnings server/index.js
