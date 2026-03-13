#!/bin/bash

# /server の内容を /api にコピーするスクリプト
set -e

echo "Copying server files to api folder..."

# 既存のapiフォルダを削除してからコピー
rm -rf ../api/*
cp -r ../server/* ../api/

# package.json を修正
echo "Updating package.json for API..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('../package.json', 'utf8'));
pkg.name = 'uv-vitamin-d-api';
pkg.scripts = {
  'dev': 'node api/index.js',
  'start': 'node api/index.js',
  'vercel-build': 'echo \"Vercel build completed\"',
  'vercel-build:api': 'echo \"API build completed\"'
};
pkg.dependencies = {
  'express': '^5.0.1',
  'node-fetch': '^3.3.2'
};
fs.writeFileSync('../package.json', JSON.stringify(pkg, null, 2));
"

echo "Server files copied to api folder successfully!"