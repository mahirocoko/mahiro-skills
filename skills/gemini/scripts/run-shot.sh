#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CMD_SCRIPT="$SCRIPT_DIR/test-flow-commands.ts"
HEALTH_GATE_SCRIPT="$SCRIPT_DIR/flow-health-gate.ts"

ENV_FILE=""
ENV_FILE_EXPLICIT="false"

ARGS=("$@")
for ((i = 0; i < ${#ARGS[@]}; i++)); do
  if [[ "${ARGS[$i]}" == "--env-file" ]]; then
    if (( i + 1 >= ${#ARGS[@]} )); then
      printf 'Error: --env-file requires a value.\n' >&2
      exit 1
    fi
    ENV_FILE="${ARGS[$((i + 1))]}"
    ENV_FILE_EXPLICIT="true"
  fi
done

if [[ "$ENV_FILE_EXPLICIT" != "true" ]]; then
  ENV_CANDIDATES=(
    "$PWD/flow-shot.env"
    "$SCRIPT_DIR/flow-shot.env"
    "$SCRIPT_DIR/../flow-shot.env"
  )

  for candidate in "${ENV_CANDIDATES[@]}"; do
    if [[ -f "$candidate" ]]; then
      ENV_FILE="$candidate"
      break
    fi
  done
fi

if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
elif [[ "$ENV_FILE_EXPLICIT" == "true" ]]; then
  printf 'Error: env file not found: %s\n' "$ENV_FILE" >&2
  exit 1
fi

MODE="${MODE:-}"
PROJECT_ID="${FLOW_PROJECT_ID:-}"
PROMPT="${FLOW_PROMPT:-}"
START_ASSET_ID="${START_ASSET_ID:-}"
END_ASSET_ID="${END_ASSET_ID:-}"
REFERENCE_ASSET_ID="${REFERENCE_ASSET_ID:-}"
DRY_RUN="false"

INGREDIENTS=()
if [[ -n "${INGREDIENT_1:-}" ]]; then INGREDIENTS+=("$INGREDIENT_1"); fi
if [[ -n "${INGREDIENT_2:-}" ]]; then INGREDIENTS+=("$INGREDIENT_2"); fi

usage() {
  cat <<'EOF'
Usage:
  bash "$SKILL_DIR/scripts/run-shot.sh" --mode <frames-start|frames-start-end|ingredients|ingredients-latest|character-video|health-gate> --prompt "..." [options]

Modes:
  frames-start      Attach only start frame
  frames-start-end  Attach both start and end frames
  ingredients       Attach one or more ingredients
  ingredients-latest Use latest image ingredient in active Flow project
  character-video   Use one locked character reference asset for generation
  health-gate       Run live smoke gate with DOM preflight + generate detection check

Options:
  --env-file <path>          Optional env file (default: auto-load ./flow-shot.env or nearby skill copies if present)
  --start-asset <id>         Start asset ID (required for frames modes)
  --end-asset <id>           End asset ID (required for frames-start-end)
  --ingredient <id>          Ingredient asset ID (repeatable)
  --reference-asset <id>     Character reference asset ID for character-video mode
  --project <id>             Flow project ID
  --prompt <text>            Prompt text
  --dry-run                  Print commands only
  -h, --help                 Show this help

Env var fallbacks:
  FLOW_PROJECT_ID, FLOW_PROMPT, START_ASSET_ID, END_ASSET_ID, INGREDIENT_1, INGREDIENT_2, REFERENCE_ASSET_ID
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="$2"
      shift 2
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --project)
      PROJECT_ID="$2"
      shift 2
      ;;
    --prompt)
      PROMPT="$2"
      shift 2
      ;;
    --start-asset)
      START_ASSET_ID="$2"
      shift 2
      ;;
    --end-asset)
      END_ASSET_ID="$2"
      shift 2
      ;;
    --ingredient)
      INGREDIENTS+=("$2")
      shift 2
      ;;
    --reference-asset)
      REFERENCE_ASSET_ID="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n\n' "$1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$MODE" || -z "$PROMPT" ]]; then
  printf 'Error: --mode and --prompt are required.\n\n' >&2
  usage
  exit 1
fi

case "$MODE" in
  frames-start)
    if [[ -z "$START_ASSET_ID" ]]; then
      printf 'Error: --start-asset is required for frames-start.\n' >&2
      exit 1
    fi
    ;;
  frames-start-end)
    if [[ -z "$START_ASSET_ID" || -z "$END_ASSET_ID" ]]; then
      printf 'Error: --start-asset and --end-asset are required for frames-start-end.\n' >&2
      exit 1
    fi
    ;;
  ingredients)
    if [[ ${#INGREDIENTS[@]} -eq 0 ]]; then
      printf 'Error: at least one --ingredient is required for ingredients mode.\n' >&2
      exit 1
    fi
    ;;
  ingredients-latest)
    ;;
  character-video)
    if [[ -z "$REFERENCE_ASSET_ID" ]]; then
      printf 'Error: --reference-asset is required for character-video mode.\n' >&2
      exit 1
    fi
    ;;
  health-gate)
    ;;
  *)
    printf 'Error: invalid --mode "%s".\n' "$MODE" >&2
    usage
    exit 1
    ;;
esac

run_cmd() {
  if [[ "$DRY_RUN" == "true" ]]; then
    printf '[dry-run]'
    for arg in "$@"; do
      printf ' %q' "$arg"
    done
    printf '\n'
  else
    "$@"
  fi
}

base_cmd=(bun "$CMD_SCRIPT")

run_flow_command() {
  local action="$1"
  shift
  if [[ -n "$PROJECT_ID" ]]; then
    run_cmd "${base_cmd[@]}" --command "$action" --projectId "$PROJECT_ID" "$@"
  else
    run_cmd "${base_cmd[@]}" --command "$action" "$@"
  fi
}

if [[ "$MODE" == "health-gate" ]]; then
  health_cmd=(bun "$HEALTH_GATE_SCRIPT")
  if [[ -n "$PROJECT_ID" ]]; then
    health_cmd+=(--project "$PROJECT_ID")
  fi
  health_cmd+=(--prompt "$PROMPT")
  if [[ "$DRY_RUN" == "true" ]]; then
    health_cmd+=(--dry-run)
  fi
  run_cmd "${health_cmd[@]}"
  printf 'Done: mode=%s project=%s\n' "$MODE" "$PROJECT_ID"
  exit 0
fi

run_flow_command flow_select_video_tab

if [[ "$MODE" == "frames-start" || "$MODE" == "frames-start-end" ]]; then
  run_flow_command flow_select_frames_mode
  run_flow_command flow_select_asset --assetExactId "$START_ASSET_ID" --slot start
fi

if [[ "$MODE" == "frames-start-end" ]]; then
  run_flow_command flow_select_asset --assetExactId "$END_ASSET_ID" --slot end
fi

if [[ "$MODE" == "ingredients" ]]; then
  run_flow_command flow_select_ingredients_mode
  for ingredient in "${INGREDIENTS[@]}"; do
    run_flow_command flow_select_asset --assetExactId "$ingredient"
  done
fi

if [[ "$MODE" == "ingredients-latest" ]]; then
  run_flow_command flow_select_ingredients_mode
  run_flow_command flow_select_latest_image_ingredient
fi

if [[ "$MODE" == "character-video" ]]; then
  run_flow_command flow_create_video_with_asset_canonical --assetExactId "$REFERENCE_ASSET_ID" --text "$PROMPT"
  printf 'Done: mode=%s project=%s\n' "$MODE" "$PROJECT_ID"
  exit 0
fi

run_flow_command flow_type_prompt --text "$PROMPT" --clearBeforeType true
run_flow_command flow_generate_video

printf 'Done: mode=%s project=%s\n' "$MODE" "$PROJECT_ID"
