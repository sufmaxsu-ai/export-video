#!/usr/bin/env bash
# =====================================================================
# export-video.sh — convertit une SOURCE en fichier vidéo.
#
#   ./scripts/export-video.sh <source> <destination> [options]
#
# Types de source (détectés automatiquement) :
#   A. HTML/JS  (*.html, *.htm ou URL http(s))
#      Chromium headless (Playwright) ouvre la page, appelle
#      window.__anim.drawFrame(i) (ou seek(t)) pour CHAQUE image, capture
#      le canvas en PNG, puis FFmpeg assemble les images.
#      FFmpeg seul ne sait pas lire du HTML/JS : les deux étapes sont automatisées.
#   B. Séquence d'images : un dossier contenant 00000.png… (ou .jpg) ou
#      un motif printf comme frames/%05d.png
#   C. Vidéo existante (*.mp4, *.mov, *.webm, *.mkv, *.avi, *.gif…) : réencodage
#
# Format de sortie déduit de l'extension (.mp4 .webm .mov .gif) ou --format.
#   mp4  : H.264 (libx264) yuv420p + AAC 48 kHz stéréo, -movflags +faststart
#   webm : VP9 (libvpx-vp9) + Opus
#   mov  : H.264 yuv420p + AAC (ou --prores pour ProRes 422 HQ + PCM)
#   gif  : palette optimisée (aperçu)
#
# Options :
#   --fps N          cadence (défaut : celle de la page, sinon 24)
#   --crf N          qualité (défaut 18 en H.264, 30 en VP9)
#   --format F       mp4 | webm | mov | gif
#   --audio FICHIER  piste son à multiplexer (wav, m4a, mp3…)
#   --no-audio       ne pas ajouter/conserver de son
#   --frames DIR     conserver les images rendues dans DIR (source HTML)
#   --prores         MOV en ProRes 422 HQ
#   --start N --end M  plage d'images (source HTML)
#   -h, --help
#
# Exemples :
#   ./scripts/export-video.sh web/preview.html final/animation.mp4
#   ./scripts/export-video.sh web/preview.html final/animation.webm
#   ./scripts/export-video.sh render/frames final/depuis-images.mp4 --fps 24
#   ./scripts/export-video.sh final/animation.mp4 final/animation.mov
# =====================================================================
set -euo pipefail

usage() { sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'; }
die() { echo "ERREUR : $*" >&2; exit 1; }
run() { printf '\n\033[1;34m$ %s\033[0m\n' "$*"; "$@"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ $# -lt 1 ]] && { usage; exit 1; }
SRC="" DST="" FPS="" CRF="" FORMAT="" AUDIO="" NOAUDIO=0 KEEP="" PRORES=0 START="" END=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --fps) FPS="$2"; shift 2 ;;
    --crf) CRF="$2"; shift 2 ;;
    --format) FORMAT="$2"; shift 2 ;;
    --audio) AUDIO="$2"; shift 2 ;;
    --no-audio) NOAUDIO=1; shift ;;
    --frames) KEEP="$2"; shift 2 ;;
    --prores) PRORES=1; shift ;;
    --start) START="$2"; shift 2 ;;
    --end) END="$2"; shift 2 ;;
    -*) die "option inconnue : $1" ;;
    *) if [[ -z "$SRC" ]]; then SRC="$1"; elif [[ -z "$DST" ]]; then DST="$1"; else die "argument en trop : $1"; fi; shift ;;
  esac
done
[[ -n "$SRC" && -n "$DST" ]] || { usage; die "source et destination requises"; }

# ---------- dépendances ----------
command -v ffmpeg >/dev/null || die "ffmpeg introuvable (Debian/Ubuntu : sudo apt install ffmpeg · macOS : brew install ffmpeg)"
command -v ffprobe >/dev/null || die "ffprobe introuvable (fourni avec ffmpeg)"

ext="${DST##*.}"; ext="$(echo "$ext" | tr 'A-Z' 'a-z')"
FORMAT="${FORMAT:-$ext}"
case "$FORMAT" in mp4|webm|mov|gif) ;; *) die "format de sortie non pris en charge : $FORMAT (mp4, webm, mov, gif)";; esac
mkdir -p "$(dirname "$DST")"

# ---------- type de source ----------
lower="$(echo "$SRC" | tr 'A-Z' 'a-z')"
if [[ "$lower" =~ ^https?:// || "$lower" == *.html || "$lower" == *.htm ]]; then KIND=html
elif [[ -d "$SRC" || "$SRC" == *%* ]]; then KIND=images
elif [[ -f "$SRC" ]]; then KIND=video
else die "source introuvable ou type inconnu : $SRC"; fi
echo "Source : $SRC  →  type $KIND · sortie $DST ($FORMAT)"

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
INPUT_ARGS=() ; HAS_AUDIO_IN=0

if [[ $KIND == html ]]; then
  command -v node >/dev/null || die "Node.js 18+ requis pour rendre une source HTML (https://nodejs.org)"
  RENDER=""
  for c in "$SCRIPT_DIR/render/render-frames.mjs" "$SCRIPT_DIR/../render/render-frames.mjs" "$SCRIPT_DIR/tools/render/render-frames.mjs"; do [[ -f "$c" ]] && { RENDER="$c"; break; }; done
  [[ -n "$RENDER" ]] || die "render-frames.mjs introuvable à côté du script"
  RDIR="$(dirname "$RENDER")"
  if [[ ! -d "$RDIR/node_modules/playwright" ]]; then
    echo "Installation de Playwright (une seule fois) dans $RDIR…"
    (cd "$RDIR" && run npm install --no-audit --no-fund)
  fi
  (cd "$RDIR" && node -e "require('playwright').chromium.executablePath()" >/dev/null 2>&1 && test -e "$(cd "$RDIR" && node -e "console.log(require('playwright').chromium.executablePath())")") \
    || (cd "$RDIR" && run npx playwright install chromium)
  FR="${KEEP:-$TMP/frames}"; rm -rf "$FR"; mkdir -p "$FR"; FR="$(cd "$FR" && pwd)"
  EXTRA=(); [[ -n "$START" ]] && EXTRA+=(--start "$START"); [[ -n "$END" ]] && EXTRA+=(--end "$END")
  run node "$RENDER" "$SRC" "$FR" "${EXTRA[@]}"
  PFPS="$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).fps)" "$FR/render-meta.json")"
  FPS="${FPS:-$PFPS}"
  FIRST="$(ls "$FR" | grep -E '^[0-9]+\.png$' | head -1)"; FIRST="${FIRST%.png}"
  INPUT_ARGS=(-framerate "$FPS" -start_number "$((10#$FIRST))" -i "$FR/%05d.png")
  # piste son livrée à côté de la page, si présente
  if [[ $NOAUDIO -eq 0 && -z "$AUDIO" && ! "$lower" =~ ^https?:// ]]; then
    for a in soundtrack.wav soundtrack.m4a; do [[ -f "$(dirname "$SRC")/$a" ]] && { AUDIO="$(dirname "$SRC")/$a"; break; }; done
  fi
elif [[ $KIND == images ]]; then
  FPS="${FPS:-24}"
  if [[ -d "$SRC" ]]; then
    f="$(ls "$SRC" | grep -E '^[0-9]+\.(png|jpg|jpeg)$' | sort | head -1)" || true
    [[ -n "$f" ]] || die "aucune image numérotée (00000.png…) dans $SRC"
    num="${f%.*}"; e="${f##*.}"; width=${#num}
    INPUT_ARGS=(-framerate "$FPS" -start_number "$((10#$num))" -i "$SRC/%0${width}d.$e")
  else
    INPUT_ARGS=(-framerate "$FPS" -i "$SRC")
  fi
else
  INPUT_ARGS=(-i "$SRC")
  [[ -n "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$SRC")" ]] && HAS_AUDIO_IN=1
fi

# ---------- audio ----------
AUD_IN=(); MAP=(-map 0:v:0)
if [[ $NOAUDIO -eq 0 ]]; then
  if [[ -n "$AUDIO" ]]; then [[ -f "$AUDIO" ]] || die "piste son introuvable : $AUDIO"; AUD_IN=(-i "$AUDIO"); MAP+=(-map 1:a:0); echo "Piste son : $AUDIO"
  elif [[ $HAS_AUDIO_IN -eq 1 ]]; then MAP+=(-map 0:a:0); fi
fi
HAS_A=0; [[ ${#MAP[@]} -gt 2 ]] && HAS_A=1
VF="format=yuv420p"; [[ -n "$FPS" && $KIND == video ]] && VF="fps=$FPS,format=yuv420p"
SHORT=(); [[ $HAS_A -eq 1 && $KIND != video ]] && SHORT=(-shortest)

case "$FORMAT" in
  mp4)  V=(-c:v libx264 -preset slow -crf "${CRF:-18}" -pix_fmt yuv420p -vf "$VF"); A=(-c:a aac -b:a 192k -ar 48000 -ac 2); X=(-movflags +faststart) ;;
  webm) ENC="$(ffmpeg -hide_banner -encoders 2>/dev/null || true)"; [[ "$ENC" == *libvpx-vp9* ]] || die "libvpx-vp9 absent de ce ffmpeg"
        V=(-c:v libvpx-vp9 -b:v 0 -crf "${CRF:-30}" -row-mt 1 -pix_fmt yuv420p -vf "$VF"); A=(-c:a libopus -b:a 128k -ar 48000 -ac 2); X=() ;;
  mov)  if [[ $PRORES -eq 1 ]]; then V=(-c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le); A=(-c:a pcm_s16le -ar 48000 -ac 2)
        else V=(-c:v libx264 -crf "${CRF:-18}" -pix_fmt yuv420p -vf "$VF"); A=(-c:a aac -b:a 192k -ar 48000 -ac 2); fi; X=(-movflags +faststart) ;;
  gif)  run ffmpeg -y -hide_banner -loglevel error "${INPUT_ARGS[@]}" -vf "fps=${FPS:-12},scale=360:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" -loop 0 "$DST"
        echo "Terminé : $DST"; exit 0 ;;
esac
[[ $HAS_A -eq 0 ]] && A=(-an)
RATE=(); [[ -n "$FPS" ]] && RATE=(-r "$FPS")
run ffmpeg -y -hide_banner -loglevel error -stats "${INPUT_ARGS[@]}" "${AUD_IN[@]}" "${MAP[@]}" "${V[@]}" "${A[@]}" "${SHORT[@]}" "${RATE[@]}" "${X[@]}" "$DST"

echo; echo "Vérification (ffprobe) :"
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,sample_rate,channels:format=duration -of compact=p=0 "$DST"
echo "Terminé : $DST"
