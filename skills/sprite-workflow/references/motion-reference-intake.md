# Motion reference intake

Use local video only as bounded reference material. This lane does not generate art and is provider-neutral.

1. Check capability with `extract-motion-reference.py --capability-status`. Machine-readable blockers name missing `ffprobe` or `ffmpeg` binaries.
2. A human must select `--start` plus either `--end` or `--duration`. Whole-clip extraction is never the default.
3. Keep configured input bytes, duration, source dimensions, frame count, and total decoded pixels bounded.
4. The script executes `ffprobe` and `ffmpeg` with argument vectors, stdin disabled, first-video-stream mapping, and timeouts. It stages into a temporary directory, preserves a byte-identical source copy, verifies the exact frame count, records source/frame SHA-256 plus deterministic source-cycle timestamps, then publishes atomically.
5. Treat the output as reference-only. It does not authorize copying identity, provenance, or production rights from the video.

Example:

```bash
python3 skills/sprite-workflow/scripts/extract-motion-reference.py \
  --input /absolute/local/reference.mp4 \
  --output-dir .agent-state/sprite-workflow/references/walk-side \
  --start 1.25 --duration 1.5 --fps 8 --json
```

`new-job.py --motion-reference ... --motion-start ... --motion-duration ...` records an intended selection only. It never runs extraction automatically.
