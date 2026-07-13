#!/usr/bin/env bash
# Copy the canonical Tempest Touch PHP client from packages/tempesttouch-php/src/ into
# each plugin's vendored lib/Tempest Touch/ directory.
#
# WordPress and WHMCS install plugin zips directly, so we can't rely on
# `composer install` at deploy time. Source of truth lives in
# packages/tempesttouch-php/; plugins hold vendored copies. Run this script after
# editing the shared client.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="${ROOT_DIR}/packages/tempesttouch-php/src"

TARGETS=(
    "${ROOT_DIR}/plugins/woocommerce/tempesttouch-woocommerce/lib/Tempest Touch"
    "${ROOT_DIR}/plugins/whmcs/modules/gateways/tempesttouch/lib/Tempest Touch"
)

if [ ! -d "${SRC_DIR}" ]; then
    echo "error: shared PHP source not found at ${SRC_DIR}" >&2
    exit 1
fi

for target in "${TARGETS[@]}"; do
    echo "→ syncing to ${target#${ROOT_DIR}/}"
    mkdir -p "${target}"
    # Clean and repopulate so deletions in source propagate.
    rm -f "${target}"/*.php
    cp "${SRC_DIR}"/*.php "${target}/"
done

echo "✓ synced $(ls "${SRC_DIR}"/*.php | wc -l) files to ${#TARGETS[@]} plugin(s)"
