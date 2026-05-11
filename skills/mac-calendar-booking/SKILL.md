---
name: mac-calendar-booking
description: Book macOS Calendar events safely after explicit user confirmation. Use when the user wants an agenda or event added to Mac Calendar.
---

# /mac-calendar-booking - Safe Mac Calendar Booking

Use this skill when the user asks to create, add, book, or schedule an event in macOS Calendar.

This is a workflow skill, not durable memory. Do not store one-off event details in memory unless the user explicitly asks. Durable memory is only appropriate for reusable preferences such as default calendar, default duration, or agenda style.

## Defaults

- Calendar: use the user-named calendar when provided. Otherwise resolve the intended writable calendar name and include that exact calendar name in the confirmation before booking.
- Duration: 1 hour, unless the user gives an end time or duration.
- Timezone: local machine timezone, unless the user gives another timezone.
- Notes: include user-provided agenda or description. Keep simple agenda notes simple.

## Confirmation Gate

Creating a Calendar event is an external side effect. Before creating it, confirm the concrete event details in one short message and wait for explicit approval.

The confirmation must include:

- title
- date
- start time
- duration or end time
- exact calendar name before booking
- notes or agenda summary, if any

Proceed only when the user clearly confirms, including confirmations in Thai such as `ยืนยัน`, `ได้`, `เอาตามนี้`, or `จัดเลย`.

If the user already gave a clear confirmation in the immediately preceding turn, proceed without asking again.

## Booking Workflow

1. Parse the requested event details from the conversation.
2. Apply defaults only for missing low-risk details.
3. Ask one concise question only if a missing detail materially changes the event, such as an unknown date or ambiguous time.
4. Confirm before booking, including the exact calendar name, unless the previous turn already confirmed those exact details.
5. Create the event with `osascript` against macOS Calendar.
6. Report the created title, date, time, duration, and whether notes were added.

## AppleScript Pattern

Use `osascript` with Calendar. Prefer a clear script over brittle shell date parsing when relative dates like tomorrow are involved.

Pass user-controlled values as `osascript` arguments instead of interpolating them into AppleScript source. This avoids broken scripts or script injection when titles, notes, locations, or calendar names contain quotes, backslashes, or newlines.

```bash
/usr/bin/osascript - "Fanarium Meeting" "Agenda:" "Work" <<'APPLESCRIPT'
on run argv
set eventTitle to item 1 of argv
set eventNotes to item 2 of argv
set calendarName to item 3 of argv

tell application "Calendar"
set targetCalendar to calendar calendarName
set startDate to current date
set day of startDate to (day of startDate) + 1
set hours of startDate to 13
set minutes of startDate to 0
set seconds of startDate to 0
set endDate to startDate + (60 * minutes)
make new event at end of events of targetCalendar with properties {summary:eventTitle, start date:startDate, end date:endDate, description:eventNotes}
end tell
end run
APPLESCRIPT
```

When adding notes, build the multiline text before calling `osascript`, then pass it as an argument:

```bash
event_notes=$'Agenda:\n1. Update\n2. Key issues\n3. Next steps'
/usr/bin/osascript - "$event_title" "$event_notes" "$calendar_name" <<'APPLESCRIPT'
```

## Safety Rules

- Do not create, edit, or delete Calendar events without explicit confirmation.
- Do not invite attendees, send emails, or modify shared calendars unless the user explicitly asks and confirms.
- Do not use a shared calendar by default. If the resolved calendar might be shared, name it in the confirmation and proceed only after explicit approval.
- Do not guess private details such as attendees, location, or meeting links.
- Do not save one-off event details to memory by default.
- Do not commit repository changes unless the user explicitly asks.

## Memory Guidance

Do not remember individual meetings like `Fanarium Meeting tomorrow 13:00` because they expire quickly.

Reasonable memory candidates, after user approval or clear repeated usage:

- default meeting duration
- preferred Calendar name
- preferred agenda style
- reminder preferences
- whether the user wants confirmation phrasing in Thai or English
