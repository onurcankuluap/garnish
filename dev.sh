#!/bin/bash
# Uses the Node version pinned in .nvmrc (22.x, matching "engines").
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use >/dev/null || { echo "Run: nvm install" >&2; exit 1; }
fi
npm run dev
