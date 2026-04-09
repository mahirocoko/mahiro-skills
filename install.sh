#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${MAHIRO_SKILLS_REPO_URL:-https://github.com/mahirocoko/mahiro-skills.git}"
REPO_REF="${MAHIRO_SKILLS_VERSION:-main}"

usage() {
  cat <<'EOF'
Usage: install.sh [--version <ref>] [--repo <git-url>] [--help] [--] [install args...]

Examples:
  bash install.sh --version v0.1.12 -- project --agent opencode --scope global
  MAHIRO_SKILLS_REPO_ROOT=/path/to/mahiro-skills bash install.sh -- project --agent opencode --scope local
EOF
}

die() {
  printf 'mahiro-skills install error: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

validate_repo_root() {
  local repo_root="$1"

  [ -f "$repo_root/package.json" ] || die "Invalid repo root '$repo_root': missing package.json"
  [ -f "$repo_root/src/cli.ts" ] || die "Invalid repo root '$repo_root': missing src/cli.ts"
  [ -d "$repo_root/skills" ] || die "Invalid repo root '$repo_root': missing skills/"
  [ -d "$repo_root/commands" ] || die "Invalid repo root '$repo_root': missing commands/"
  [ -d "$repo_root/commands-gemini" ] || die "Invalid repo root '$repo_root': missing commands-gemini/"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --version)
      [ $# -ge 2 ] || die "--version requires a value"
      REPO_REF="$2"
      shift 2
      ;;
    --repo)
      [ $# -ge 2 ] || die "--repo requires a value"
      REPO_URL="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    *)
      break
      ;;
  esac
done

require_command bun

repo_root="${MAHIRO_SKILLS_REPO_ROOT:-}"
cleanup_dir=""

if [ -z "$repo_root" ]; then
  require_command git
  cleanup_dir="$(mktemp -d)"
  trap 'rm -rf "$cleanup_dir"' EXIT INT TERM
  repo_root="$cleanup_dir/mahiro-skills"
  git clone --depth 1 --branch "$REPO_REF" "$REPO_URL" "$repo_root" >/dev/null 2>&1 || die "Unable to clone '$REPO_URL' at '$REPO_REF'"
fi

validate_repo_root "$repo_root"

(
  cd "$repo_root"
  MAHIRO_SKILLS_REPO_ROOT="$repo_root" bun ./src/cli.ts install "$@"
)
