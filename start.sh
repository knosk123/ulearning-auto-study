#!/usr/bin/env bash
# Ulearning Auto Browser v2.1 - One-click launcher

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

echo ""
echo "  =========================================="
echo "    Ulearning Auto Browser v2.1"
echo "    Auto Play / Auto Answer / Auto Next"
echo "  =========================================="
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
    echo "  [ERROR] Node.js not found"
    echo ""
    echo "  Install Node.js:"
    echo "    macOS:   brew install node"
    echo "    Ubuntu:  sudo apt install nodejs npm"
    echo "    Or:      https://nodejs.org/"
    echo ""
    exit 1
fi

echo "  [OK] Node.js $(node -v)"

# Install dependencies
if [ ! -d "node_modules/playwright" ]; then
    echo ""
    echo "  [INFO] First run, installing dependencies ..."
    npm install --production --no-audit --no-fund
    echo "  [OK] Dependencies installed"
fi

# Check Chromium
if [ ! -d "node_modules/.local-browsers" ] || [ -z "$(ls -A node_modules/.local-browsers 2>/dev/null)" ]; then
    echo ""
    echo "  [INFO] Downloading Chromium (~100MB, first time only) ..."
    PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright npx playwright install chromium
    echo "  [OK] Chromium downloaded"
fi

# Launch
echo ""
echo "  [START] Launching browser ..."
echo ""
exec node ulearning-auto.js "$@"
