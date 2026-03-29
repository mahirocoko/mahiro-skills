---
installer: local-skill-bundle v1.6.0
name: watch
description: v1.6.0 G-SKLL | Learn from YouTube videos via Gemini transcription. Use when user says "watch", "transcribe youtube", "learn from video", or shares a YouTube URL to study.
alias: /gemini transcribe
---

# /watch - YouTube → Gemini → Local Knowledge

**Alias for `/gemini transcribe`** with local note capture.

Learn from YouTube videos by sending them to Gemini for transcription, then saving the output locally.

`$SKILL_DIR` = the installed `watch` skill directory for the current agent.

## Usage

```bash
/watch https://youtube.com/watch?v=xxx              # Auto-resolve title via yt-dlp
/watch "Custom Title" https://youtu.be/xxx          # Override title
/watch --slug custom-slug https://youtube.com/...   # Custom slug
```

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/get-metadata.ts <url>` | Get title, duration, channel (JSON) |
| `scripts/get-cc.ts <url> [lang]` | Get captions in SRT format |
| `scripts/save-learning.ts <title> <url> <id> <transcript> [cc]` | Save to `.agent-state/memory/learnings/` |

## Workflow

### Step 1: Run Transcription Script

```bash
# Simple (default chat mode)
bun "$SKILL_DIR/scripts/transcribe.ts" <youtube-url>

# With Deep Research mode
bun "$SKILL_DIR/scripts/transcribe.ts" --mode=research <youtube-url>

# With specific model
bun "$SKILL_DIR/scripts/transcribe.ts" --model=thinking <youtube-url>

# Canvas mode for document output
bun "$SKILL_DIR/scripts/transcribe.ts" --mode=canvas <youtube-url>
```

**Modes:**
| Mode | Use Case |
|------|----------|
| `chat` | Quick transcription (default) |
| `research` | Deep analysis with fact-checking |
| `canvas` | Structured document output |

**Models:**
| Model | Speed | Quality |
|-------|-------|---------|
| `fast` | Fastest | Good |
| `thinking` | Slow | Best (reasoning) |
| `pro` | Medium | High |

The script handles:
1. Fetching video metadata (title, channel, duration)
2. Creating new Gemini tab with correct mode URL
3. Selecting model if specified
4. Sending prompt with metadata
5. Outputting tab ID for follow-up

### Step 2: Wait for Gemini Response

Check the Gemini tab for the transcription. For long videos, this may take 30-60 seconds.

### Step 3: Save to Knowledge

Once you have the Gemini transcription, save it:

```bash
bun "$SKILL_DIR/scripts/save-learning.ts" "$TITLE" "$URL" "$VIDEO_ID" "$TRANSCRIPT" "$CC_TEXT"
```

Or manually create a learning file at `.agent-state/memory/learnings/YYYY-MM-DD_video-slug.md`.

### Step 4: Add local retrieval hints

Add clear tags, source links, and a concise summary to the learning file so later local searches can find it quickly.

## Output Summary

```markdown
## 🎬 Video Learned: [TITLE]

**Source**: [YOUTUBE_URL]
**Gemini**: [GEMINI_CONVERSATION_URL]

### Key Takeaways
[From Gemini response]

### Saved To
- Learning: .agent-state/memory/learnings/[DATE]_[SLUG].md
- Retrieval hints: Added locally ✓

### Quick Access
`/trace [SLUG]`
```

## IMPORTANT: Save Gemini Conversation Link

**Always save the Gemini conversation URL** in the learning file frontmatter:

```yaml
---
title: [Video Title]
source: YouTube - [Creator] (youtube_url)
gemini_conversation: https://gemini.google.com/app/[conversation_id]
---
```

**Why**:
- Conversations persist and are revisitable
- Can continue asking follow-up questions later
- Provides audit trail of transcription source
- URL visible in browser after sending request

## Notes

- Gemini has YouTube understanding built-in (can process video directly)
- Long videos may take 30-60 seconds to process
- If Gemini can't access video, it will say so — fallback to manual notes
- Works with: youtube.com, youtu.be, youtube.com/shorts/

## Error Handling

| Error | Action |
|-------|--------|
| Gemini blocked | User must be logged into Google |
| Video unavailable | Save URL + notes manually |
| Rate limited | Wait and retry |
| Browser tab closed | Recreate tab, retry |
