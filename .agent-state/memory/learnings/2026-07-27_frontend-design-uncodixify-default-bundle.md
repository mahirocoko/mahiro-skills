# Default bundle removals must preserve explicit capability

**Date**: 2026-07-27  
**Tags**: `mahiro-skills`, `default-bundle`, `opt-in`, `receipts`, `frontend-design`, `uncodixify`

## Lesson

การเอา skill ออกจาก default bundle ควรเป็น packaging-policy change ไม่ใช่การลบ capability ออกจาก repository. ใน `mahiro-skills` ให้แก้ `.claude-plugin/marketplace.json` ซึ่งเป็น source of truth ของ `bundles[0]`, คง `skills/<name>/`, `commands/<name>.md` และ `commands-gemini/mh-<name>.toml` ไว้ แล้วทดสอบสองทางแยกกัน:

- default plan/install ต้องไม่ resolve skill ที่ถูกทำให้ opt-in
- explicit install ต้องยัง resolve skill และ paired commands ได้

ต้องตรวจ existing receipts ด้วย เพราะ `guided --mode update --yes` ยึดรายการที่เคยติดตั้งไว้และ overwrite เพื่ออัปเดต source; มันไม่ใช่ reconciliation กับ default manifest และจะไม่ลบ skill ที่ถูกถอดออกจาก default bundle. ถ้าต้องการ cleanup installation เดิม ต้องสั่ง uninstall อย่าง explicit และรายงานว่าเป็นคนละ operation กับการแก้ bundle.

## Operational rule

ทุกครั้งที่เปลี่ยน default bundle ให้ตรวจ: manifest membership, default plan counts, explicit opt-in plan, `gaps --json`, relevant tests และ installed receipts. ถ้า omission เป็น policy ที่ตั้งใจแต่ inventory checker รายงานเป็น warning ให้บันทึกเป็น known noise; อย่าเพิ่ม exception model ใหม่ใน patch เล็กโดยไม่มี requirement แยก.

## Evidence

- `.claude-plugin/marketplace.json`
- `src/plan.ts`
- `src/guided.ts`
- `test/cli.test.ts`
- `test/plan.test.ts`
- `test/install.test.ts`
