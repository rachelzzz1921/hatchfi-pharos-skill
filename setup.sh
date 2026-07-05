#!/usr/bin/env bash
set -euo pipefail

echo "== HatchFi setup =="

if ! command -v npm >/dev/null 2>&1; then
  echo "FAIL: npm not found"
  exit 1
fi

if ! command -v forge >/dev/null 2>&1; then
  echo "FAIL: forge not found"
  exit 1
fi

echo "-- Installing npm dependencies"
npm install

echo "-- Foundry build"
forge build

echo "-- Foundry tests"
forge test

echo "-- Gate tests"
npm run gate:test

echo "-- Web build"
npm run web:build

echo "Setup complete."
echo "Next:"
echo "  npm run gate:demo"
echo "  npm run judge:readiness"
echo "  npm run web:dev"
