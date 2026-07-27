# Lesson: benchmark ต้องผูกกับ runtime และบทบาทงาน

**Tags**: `research`, `model-routing`, `benchmark`, `direct-cli`, `runtime-freshness`

## Durable lesson

เวลาเทียบ frontier model อย่าเริ่มจากคำถามว่า “ตัวไหนชนะ” ให้เริ่มจากสาม identity พร้อมกัน:

1. **Public identity** — exact provider/model ID, release date, effort variant และ benchmark field
2. **Runtime identity** — CLI version, catalog entry, foreground launch proof, fallback และ current curated policy
3. **Work identity** — role, risk, tool loop, latency budget, cost และ Definition of Done

Catalog listing ไม่ใช่ launch proof ตัวอย่างใน session นี้คือ Gemini 3.1 Pro ที่ Agy catalog แสดงชื่อ แต่ current direct-cli guidance ระบุว่า launch เคยไม่ผ่าน จึงต้อง mark เป็น candidate-only จนมี foreground smoke ใหม่

## Benchmark rules

- Pin access date และ exact leaderboard/model page
- แยก current `codingIndex` ออกจาก historical `Coding Agent Index` แม้ชื่อจะคล้ายกัน
- ระบุ max/high/medium effort ทุกครั้ง
- แยก independent composite ออกจาก official vendor benchmark
- เขียน fallback หรือ Preview identity ไว้ใน row เดียวกับคะแนน
- ห้ามใช้ benchmark เป็นหลักฐานว่า agent จะทำงานถึง DoD, ใช้ tool ถูก หรือรักษา UX ได้

## Routing rules

- Opus 5 / Sol High: architecture, hard debugging, high-risk review
- Sonnet 5 / Terra Medium: everyday implementation, specialist lane, documentation
- Fable 5: long-running research/agent workที่ต้นทุนสูงแต่คุ้มเมื่อ context และ recovery สำคัญ
- Gemini 3.6 Flash: multimodal/context-heavy scout และ batch analysis
- Luna: read-only scout และ repetitive batch ที่มี deterministic checks
- Grok 4.5: coding alternative และ second opinion เมื่ออยากกระจาย provider

ก่อนเปลี่ยน default ให้ทำ fixed-task pilot ที่ pin model, effort, harness, tools, timeout และ test command พร้อมเก็บ completion, rework, retry, cost และ human correction แยกกัน

## Process correction

งาน research หลาย provider ควรแบ่งเป็น lane ได้ แต่แต่ละ lane ต้องคืน compact evidence table, source URL, unknowns และ practical role fit ก่อนขยาย deep dive การเขียน narrative ก่อน pin metric identity ทำให้ต้องกลับมาแก้ caveat ภายหลัง
