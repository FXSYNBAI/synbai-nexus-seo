#!/usr/bin/env bash
set -euo pipefail

# Publish only the static website. Release installers stay in downloads/ for
# GitHub distribution and are intentionally excluded from Cloudflare Pages.
rm -rf _site
mkdir -p _site
cp index.html styles.css remaster.css robots.txt sitemap.xml _headers _site/
cp -R assets _site/assets
