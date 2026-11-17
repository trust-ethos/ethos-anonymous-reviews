#!/usr/bin/env bash
# Copies the Ethos design system's CSS into static/ds/ so the app serves it itself.
#
#   ETHOS_DESIGN_SYSTEM=/path/to/ethos-design-system scripts/sync-design-system.sh
#   scripts/sync-design-system.sh /path/to/ethos-design-system
#
#   scripts/sync-design-system.sh --check    only checks static/ds as it is: exits 1 if it asks Google for fonts
#
# static/ds/ is a copy: never edit it by hand, change trust-ethos/ethos-design-system and run this again.
# static/ds/VERSION says which commit the copy was made from.
#
# The page must make no third-party request: the app promises to keep no record of who visits, and a
# font fetched from Google hands it every visitor's IP address and user agent. So Inter and IBM Plex
# Mono are served from static/ds/fonts like Queens, and this script fails if Google Fonts creeps back.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/static/ds"

no_google_fonts() {
  if grep -rnE 'fonts\.(googleapis|gstatic)\.com' "$DEST"; then
    echo "static/ds still loads fonts from Google (above). The page must make no third-party request:" >&2
    echo "serve the font from static/ds/fonts instead, and teach this script to do it." >&2
    exit 1
  fi
}

if [ "${1:-}" = "--check" ]; then
  no_google_fonts
  echo "static/ds makes no request to Google Fonts."
  exit 0
fi

SRC="${1:-${ETHOS_DESIGN_SYSTEM:-}}"
if [ -z "$SRC" ] || [ ! -f "$SRC/tokens/ethos.css" ]; then
  echo "Set ETHOS_DESIGN_SYSTEM (or pass the path) to a checkout of trust-ethos/ethos-design-system." >&2
  exit 1
fi

# Inter and IBM Plex Mono: the design system does not ship them, it @imports them from Google Fonts with
# exactly this line. If the line changes (another weight, another family), stop: the list below must follow.
GOOGLE_IMPORT='@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap");'
if ! grep -qxF "$GOOGLE_IMPORT" "$SRC/previews-src/_preview.css"; then
  echo "The Google Fonts @import in previews-src/_preview.css changed; update the fonts this script self-hosts." >&2
  exit 1
fi

# The same families and weights, latin subset, from the Fontsource npm packages (SIL Open Font License 1.1).
# name | package | version | the tarball's sha512 as npm publishes it (dist.integrity) | weights
FONTS='Inter|inter|5.3.0|RofMylZmjlJEfELXeNHFWBRcSs75rGU/6bV2S2jfnvv/3rPXPGe0LgUJTklcHZ9lM4OZmAVFhcJPnACfb91A3g==|400 500 600 700 800
IBM Plex Mono|ibm-plex-mono|5.3.0|eTgnZjZEGk1QtD3ZstF+Vclo2HLAni8YMy34/DxllwZvyz1lR/1RF/xTiAquOBO7MvqBx8D2Ig2WCPMVfdZu7Q==|400 600'

# Fetched into a scratch folder first, so a failed download leaves static/ds as it was.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir "$TMP/fonts"
while IFS='|' read -r family pkg version sha512 weights; do
  curl -fsSL --max-time 60 -o "$TMP/$pkg.tgz" "https://registry.npmjs.org/@fontsource/$pkg/-/$pkg-$version.tgz"
  if [ "$(openssl dgst -sha512 -binary "$TMP/$pkg.tgz" | openssl base64 -A)" != "$sha512" ]; then
    echo "@fontsource/$pkg@$version is not the file this script expects (sha512 differs)." >&2
    exit 1
  fi
  mkdir "$TMP/$pkg"
  tar -xzf "$TMP/$pkg.tgz" -C "$TMP/$pkg"
  cp "$TMP/$pkg/package/LICENSE" "$TMP/fonts/OFL-$pkg.txt"
  for weight in $weights; do
    cp "$TMP/$pkg/package/files/$pkg-latin-$weight-normal.woff2" "$TMP/fonts/"
    cat >> "$TMP/font-faces.css" <<CSS
@font-face {
  font-family: "$family";
  font-style: normal;
  font-weight: $weight;
  font-display: swap;
  src: url("./fonts/$pkg-latin-$weight-normal.woff2") format("woff2");
}
CSS
  done
done <<< "$FONTS"

rm -rf "$DEST"
mkdir -p "$DEST/tokens" "$DEST/fonts"

# Tokens: the --ethos-* variables (light and dark), the "ei ei-*" icon classes, and the same values as
# plain constants for the few places CSS variables cannot reach (routes/_app.tsx's theme-color).
cp "$SRC/tokens/ethos.css" "$SRC/tokens/ethos.icons.css" "$SRC/tokens/ethos.tokens.ts" "$DEST/tokens/"

# Fonts: Queens, the display face, from the design system; Inter and IBM Plex Mono with their licences
# from the scratch folder above.
cp "$SRC/assets/fonts/QueensVar.woff2" "$DEST/fonts/"
cp "$TMP/fonts/"* "$DEST/fonts/"

# The e-* component layer. The design system's own bundle inlines Queens as base64 at this placeholder;
# here it points at the font file copied above instead. The Google Fonts @import gives way to the
# @font-face rules written above, under the same family names, so every --ethos-font-family-* token
# still resolves.
sed -e 's|url("data:font/woff2;base64,__QUEENS_B64__")|url("./fonts/QueensVar.woff2")|' \
  -e "/fonts\.googleapis\.com/r $TMP/font-faces.css" \
  -e '/fonts\.googleapis\.com/d' \
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

# Last: nothing in the copy may still reach for Google Fonts, whatever the design system adds later.
no_google_fonts

echo "Copied the design system into static/ds:"
cat "$DEST/VERSION"
