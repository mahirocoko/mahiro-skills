# Model fit needs an execution contract

**Date**: 2026-07-27  
**Tags**: `gpt-5.6`, `model-routing`, `orchestration`, `completion`, `subagents`, `pilot`

## Lesson

การเลือก model สำหรับ persistent coding agent ต้องแยกอย่างน้อยสี่แกน: raw benchmark quality, list-price economics, runtime behavior และ completion temperament ตัวที่คะแนนสูงสุดอาจไม่ใช่ main executor ที่เหมาะที่สุด และตัวที่ cost/task ต่ำใน benchmark อาจไม่ถูกกว่าใน workload ที่มี system prompt, cache write และ context ยาว

สำหรับ Mahiro Code ทิศทางที่ควรพิสูจน์คือ:

- Luna Max เป็น long-task executor แบบ pilot
- Sol High เป็น bounded judgment/escalation layer
- Terra เป็น fast utility/controller ตาม effort ที่เหมาะกับงาน
- Codex Spark เป็น commit lane

แต่ routing อย่างเดียวไม่พอ ต้องมี execution contract ที่แยก `turn complete` จาก `goal complete` และอนุญาต final report เฉพาะเมื่อ `done`, `blocked` หรือ `needs_human` เท่านั้น ถ้า next action ชัด ปลอดภัย อยู่ใน scope และย้อนกลับได้ agent ควรทำต่อเอง

## Operational rule

ก่อนส่ง subagent ให้ระบุ model, objective, scope, deliverable, acceptance criteria, checks, wall-time budget, partial handoff และ stop conditions ทุกครั้ง ก่อนเปลี่ยน main default ให้ pilot 3–5 งานและวัดคำสั่ง “ทำต่อ”, premature finals, DoD first-pass, rework, elapsed time, cost/context disruption และ verification coverage

## Evidence

- `docs/research/gpt-5-5-vs-5-6-routing-2026-07.md`
- `docs/research/mahiro-code-conversation-model-usage-2026-07.md`
- `docs/research/gpt-5-6-workflow-handoff-conv-236.md`
