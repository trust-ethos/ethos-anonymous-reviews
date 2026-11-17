#!/usr/bin/env bash
# Copies the Ethos design system's CSS into static/ds/ so the app serves it itself.
#
#   ETHOS_DESIGN_SYSTEM=/path/to/ethos-design-system scripts/sync-design-system.sh
#   scripts/sync-design-system.sh /path/to/ethos-design-system
#
# static/ds/ is a copy: never edit it by hand, change trust-ethos/ethos-design-system and run this again.
# static/ds/VERSION says which commit the copy was made from.
set -euo pipefail

SRC="${1:-${ETHOS_DESIGN_SYSTEM:-}}"
if [ -z "$SRC" ] || [ ! -f "$SRC/tokens/ethos.css" ]; then
  echo "Set ETHOS_DESIGN_SYSTEM (or pass the path) to a checkout of trust-ethos/ethos-design-system." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/static/ds"

rm -rf "$DEST"
mkdir -p "$DEST/tokens" "$DEST/fonts"

# Tokens: the --ethos-* variables (light and dark), the "ei ei-*" icon classes, and the same values as
# plain constants for the few places CSS variables cannot reach (routes/_app.tsx's theme-color).
cp "$SRC/tokens/ethos.css" "$SRC/tokens/ethos.icons.css" "$SRC/tokens/ethos.tokens.ts" "$DEST/tokens/"

# Fonts: Queens, the display face. Inter and IBM Plex Mono come from the @import in components.css.
cp "$SRC/assets/fonts/QueensVar.woff2" "$DEST/fonts/"

# The e-* component layer. The design system's own bundle inlines Queens as base64 at this placeholder;
# here it points at the font file copied above instead.
sed 's|url("data:font/woff2;base64,__QUEENS_B64__")|url("./fonts/QueensVar.woff2")|' \
  "$SRC/previews-src/_preview.css" > "$DEST/components.css"
if grep -q "__QUEENS_B64__" "$DEST/components.css" || ! grep -q 'fonts/QueensVar.woff2' "$DEST/components.css"; then
  echo "The Queens @font-face in previews-src/_preview.css changed shape; update this script." >&2
  exit 1
fi

{
  echo "source: trust-ethos/ethos-design-system"
  echo "commit: $(git -C "$SRC" rev-parse HEAD)"
  echo "committed: $(git -C "$SRC" log -1 --format=%cI)"
  if [ -n "$(git -C "$SRC" status --porcelain)" ]; then
    echo "note: copied from a checkout with uncommitted changes"
  fi
  echo "synced by: scripts/sync-design-system.sh"
} > "$DEST/VERSION"

echo "Copied the design system into static/ds:"
cat "$DEST/VERSION"
