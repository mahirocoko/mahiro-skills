---
name: review-comment
description: Writes actionable GitHub PR review comments in Mahiro's direct Thai voice, identifying where, what is wrong, how to fix it, and a concrete recommendation. Use when drafting, simulating, or posting line comments or a pending pull-request review, including requests to รีวิว or write คอมเมนต์บน PR. Owns comment craft and posting boundaries, not the correctness verdict.
---

# Review Comment

## Boundary

Settle findings against the target repo's instructions, code, diff, and real call sites first. If available, use `mahiro-style` as a fallback review lens, not as a substitute for repo truth. This skill shapes the comment; it does not decide whether a finding is correct. Never invent a replacement just to fill a comment.

Distinguish **simulation**, **draft**, and **posting**. A request to simulate or show how comments would read authorizes text only: do not call `gh` to create a review. A request to create a pending review authorizes only a pending draft. Submission to other people requires Mahiro's explicit instruction.

## Workflow

1. Read the reviewed revision's diff and nearby code. Cite the path and line from that revision, not memory. Read the actual caller before claiming an API contract.
2. Verify each finding, then write one self-contained comment per edit. Repeat a comment at each relevant line if the same string appears in separate files. A GitHub inline comment has a path and diff line as its anchor; its body must still name the exact attribute, call, or block to change.
3. For simulation, return the proposed line-anchored comments without GitHub writes. For an authorized GitHub draft, create **one PENDING review** with `gh api repos/{owner}/{repo}/pulls/{n}/reviews`, passing `commit_id` and `comments[]` (`path`, `line`, `side`, `body`) and omitting `event`. Check the PR head and diff-line validity before writing.
4. Never submit `COMMENT`, `APPROVE`, or `REQUEST_CHANGES` unless Mahiro explicitly asks. Never post standalone line comments instead of the pending review. Show Mahiro the draft and stop.
5. If a comment is confusing, rewrite the draft into an actionable edit instead of adding generic explanation.

## Shape of one comment

Make the author able to answer four questions from the GitHub line anchor **and** comment together: **ตรงไหน** (the exact element/call), **อะไร** (current behavior or copy), **แก้ยังไง** (the edit or decision needed), and **แนะนำอะไร** (a concrete next action). These are a reader check, not four headings or four mandatory sentences. When old-to-new copy already says the whole edit, stop there; explain the effect only when it changes the decision. One comment, one edit. Quote literal strings and symbols where they distinguish the target.

Bad: ปุ่มนี้มีแต่ไอคอน ชื่อที่โปรแกรมอ่านออกเสียงควรขึ้นต้นด้วยคำกริยา

Good: แก้ `aria-label` ตรงปุ่มนี้จาก `วิธีกรอกจำนวน` เป็น `ดูวิธีกรอกจำนวน` ได้เลยครับ

```tsx
aria-label={t`ดูวิธีกรอกจำนวน`}
```

For copy, quote both the original and replacement verbatim. `อ่านรอบเดียวไม่จบ`, `ยังไม่บอกว่า 1 คืออะไร`, and `ควรขึ้นต้นด้วยคำกริยา` alone are vague explanations of Thai in Thai, not edits. Do not make the reader translate your Thai into another Thai sentence to discover the requested change. Replace abstract verdicts (`อ่านยาก`, `ไม่ชัด`, `สื่อไม่ตรง`) with the exact old words, exact new words, and one concrete consequence only if needed. Use ordinary spoken Thai; do not translate English phrasing word-for-word. Once the replacement says it all, stop—no synonym paragraph or principle lecture.

For a behavior finding:

> ตรง `submit` ถ้า `parseCodes` คืน `LIMIT` ตอนนี้ `if (!result.ok) return` เลยไม่มีข้อความขึ้น แนะนำให้เอา `reason` ไปแสดงที่ช่องนี้ แล้วใช้ข้อความเดียวกันใน validation นะครับ

If the contract is genuinely undecided:

> regex ตรงนี้อ่าน `SKU 100` เป็นรหัสกับจำนวน แต่ `MY CODE` ใช้ไม่ได้ ถ้ารหัสมีช่องว่างได้ ลองยืนยันรูปแบบที่ต้องรับก่อนนะครับ แล้วค่อยแก้ parser กับเพิ่มสองเคสนี้ในเทสต์

Do not fabricate a regex or code block for that case. If no concrete correction **or** actionable decision/check is supported by evidence, omit the comment and report the uncertainty outside the review.

## Code blocks and uncertainty

- Add a code block only when its lines can be pasted at the commented location. Show changed lines only; do not wrap one attribute in a whole component.
- Do not duplicate a code block whose fix lives on another comment. Point at the relevant validation or submit site instead.
- If a fix depends on an unchosen input contract, layout, file, or props, recommend the exact decision and regression check first; do not present an invented implementation as approved.
- Do not add a code block that cannot be pasted, including a partial deletion framed as a whole new component. Never present an unsettled replacement as a ready edit.

## Voice and final check

Use Mahiro's human-confirmed review voice: concise conversational Thai directed at the author, not a test report. `ครับ`/`นะ` are natural when they fit; suggestions can say `ลอง...ดูไหมครับ`, `...ก็ได้ครับ`, or `แนะนำว่า...` when there is a real choice. For an exact required edit, say `แก้...` directly. Keep repo-local English code terms (`variant`, `className`, `memo`) rather than translating them awkwardly. Do not force courtesy on every sentence, mimic typos, add praise/greetings, summarize the whole PR, or lecture about generic principles. One sentence is fine; use more only when the change genuinely needs evidence or a pasteable example.

Do not mistake GitHub account ownership for human writing: agent-posted comments under Mahiro's account can teach **where/how to fix**, but cannot establish his **voice**. Calibrate phrasing only against human-confirmed comments; the examples here are adapted teaching examples, not verbatim quotes from Mahiro. Older terse or image-only comments may reflect real voice but do not satisfy the current requirement to make the edit actionable—preserve their conversational tone, not their missing instructions.

- Can a reviewer identify **where**, **what fails**, **how to fix or decide**, and **what action you recommend** without opening a second thread?
- If the replacement is undecided, is the decision/check explicit rather than a guessed fix?
- Does each copy comment quote the old and new wording rather than explaining Thai in Thai?
- Could the author make the edit on first reading, without asking what a vague Thai diagnosis actually means? If not, rewrite or drop the comment.
- Is each code block pasteable at that line and limited to changed lines?
- Was every API claim checked against the actual caller?
- For a GitHub draft, is the review still PENDING and unsubmitted?
