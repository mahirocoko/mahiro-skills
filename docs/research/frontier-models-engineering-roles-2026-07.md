# Frontier models: benchmark และบทบาทงาน engineering

> Research snapshot: 27 กรกฎาคม 2026 (เข้าถึงข้อมูลหลักช่วง 2026-07-27T08:54Z)  
> เอกสารนี้เอา benchmark มาต่อกับงาน engineering ที่เจอจริง ไม่ได้พยายามประกาศว่า model ตัวไหน “เก่งที่สุด” แบบใช้ได้กับทุกงาน

## สรุปสั้น

- **งานยากสุด เช่น architecture, debugging ข้ามระบบ และ agent ที่ต้องตัดสินใจหลายขั้น** — เริ่มที่ `claude-opus-5-thinking-high` หรือ `gpt-5.6-sol` แล้วค่อยลด tier เมื่อเห็นว่างานไม่ต้องใช้ reasoning หนัก
- **งาน implementation ประจำวัน** — ถ้าเลือก Anthropic lane เอง `claude-sonnet-5-thinking-high` เป็น workhorse ที่สมดุลกว่า ส่วน `gpt-5.6-sol` เหมาะเมื่อความถูกต้องของ code และ tool loop สำคัญกว่าต้นทุน
- **งานวิจัยยาวและ autonomous execution** — Claude Fable 5 มี positioning ตรงที่สุด แต่ผล benchmark ของ Fable 5 มี Opus 4.8 fallback รวมอยู่ด้วย จึงห้ามอ่านคะแนนเป็น pure-model result
- **งาน multimodal, context ใหญ่ และ throughput สูง** — `gemini-3.6-flash-high` คุ้มมาก โดยเฉพาะเอกสาร ภาพ chart log และการกวาดข้อมูลจำนวนมาก
- **งานเร็วและประหยัด** — GPT-5.6 Luna, Gemini 3.6 Flash และ Grok 4.5 เหมาะกับ scout, batch และ second opinion มากกว่า final architecture
- **ยังไม่มีหลักฐาน public แบบ apples-to-apples** ที่พอจะบอกว่า GPT-5.6, Claude 5 หรือ Grok 4.5 ตัวไหนชนะ SWE-bench จริง ๆ เพราะหลายตัวมีแค่ composite leaderboard หรือ vendor-run benchmark

## 1. ขอบเขตและ snapshot ของ runtime

### Model ที่เลือกมาเทียบ

คัดจาก model ที่พบใน catalog ของ CLI ที่ใช้งานอยู่ และมี public identity หรือมี benchmark record ให้ตรวจสอบได้

| Provider | Model ที่เทียบ | Surface ที่พบใน local catalog | Release signal ที่ใช้ใน research |
|---|---|---|---|
| Anthropic | Claude Opus 5 | Cursor: `claude-opus-5-thinking-high` | Artificial Analysis ระบุ 2026-07-24 |
| Anthropic | Claude Fable 5 | Cursor: `claude-fable-5-thinking-high` | Anthropic ระบุ general availability 2026-06-09 |
| Anthropic | Claude Sonnet 5 | Cursor: `claude-sonnet-5-thinking-high` | Artificial Analysis ระบุ 2026-06-30 |
| OpenAI | GPT-5.6 Sol | Codex: `gpt-5.6-sol`; Cursor: `gpt-5.6-sol-high` | Artificial Analysis ระบุ 2026-07-09 |
| OpenAI | GPT-5.6 Terra | Codex: `gpt-5.6-terra`; Cursor: `gpt-5.6-terra-medium` | Artificial Analysis ระบุ 2026-07-09 |
| OpenAI | GPT-5.6 Luna | Codex: `gpt-5.6-luna`; Cursor: `gpt-5.6-luna-medium` | Artificial Analysis ระบุ 2026-07-09 |
| Google | Gemini 3.6 Flash | Agy/Cursor: `gemini-3.6-flash-high` | Artificial Analysis ระบุ 2026-07-21 |
| Google | Gemini 3.1 Pro | Agy catalog-listed: `gemini-3.1-pro-high` | Artificial Analysis ยังติดป้าย Preview, release 2026-02-19; launch ยังไม่ proven |
| xAI | Grok 4.5 | Cursor: `cursor-grok-4.5-high` | Artificial Analysis ระบุ 2026-07-08 |

Runtime ที่ใช้เช็ค catalog ในรอบนี้คือ Cursor Agent `2026.07.23-e383d2b`, Antigravity `1.1.7` และ Codex CLI `0.145.0` การมีชื่ออยู่ใน catalog ยืนยันว่าเรียกใช้ได้จาก surface นั้น แต่ยังไม่ยืนยันว่า model จะ launch สำเร็จในทุก account, region, effort หรือ provider route

### สิ่งที่ยังไม่ใส่ในตารางหลัก

- **GPT-5.5** ใช้เป็น baseline ในเอกสาร [GPT-5.5 vs GPT-5.6](./gpt-5-5-vs-5-6-routing-2026-07.md) อยู่แล้ว จึงไม่ใส่ซ้ำใน comparison รุ่นใหม่รอบนี้
- **GLM-5.2 และ Kimi รุ่นใหม่** มี public material บางส่วน แต่ยังไม่มีชุดคะแนน independent ที่จับคู่กับ model ในตารางนี้ได้ตรงพอ จึงไม่จัดอันดับแบบเดา
- **Agy `gpt-oss-120b` และ Claude 4.6** เป็นตัวเลือกที่ใช้งานได้ แต่ไม่ใช่ release ใหม่สุดของค่ายที่คำขอนี้ต้องการเทียบ

## 2. วิธีอ่าน benchmark

### Artificial Analysis

ตารางหลักใช้ Artificial Analysis Intelligence Index v4.1 เป็นแกนกลาง เพราะมีข้อมูลของหลาย provider ในหน้าเดียวกัน

| Metric | อ่านว่าอะไร |
|---|---|
| Intelligence | composite ของงานความรู้ การเขียน งานวิทยาศาสตร์ และ reasoning หลายชุด ไม่ใช่เปอร์เซ็นต์ตอบถูกของ benchmark เดียว |
| Coding | composite สำหรับงาน coding และ coding-agent เช่น Terminal-Bench, DeepSWE และ SWE-Atlas-QnA |
| Agentic | ความสามารถของ tool/agent loop ในชุดทดสอบของ Artificial Analysis |
| Terminal-Bench 2.1 | ผลใน terminal environment ของชุด AA ไม่ใช่คะแนนของ SWE-bench ทั้งระบบ |
| HLE | Humanity’s Last Exam ใน configuration ที่ AA ใช้ |
| GPQA | GPQA Diamond ใน configuration ที่ AA ใช้ |

ค่าด้านล่างส่วนใหญ่เป็น **max หรือ adaptive-reasoning setting** ของ model page แต่ direct-cli ของเราอาจเรียก Sol High, Terra Medium หรือ Luna Medium ดังนั้นอย่าเอาคะแนน max ไปแปลเป็นผลของ effort ต่ำโดยตรง

Artificial Analysis มีการใช้ชื่อ field และ composite หลายแบบในคนละ snapshot งานวิจัยเก่าของ repo บันทึก `Coding Agent Index` ของ Sol max ไว้ที่ 80 ส่วนตารางนี้ใช้ field ปัจจุบันชื่อ `codingIndex` ซึ่งอยู่ที่ 77.4 ห้ามนำสองตัวเลขนี้มาปนกัน เพราะอาจเป็นคนละ leaderboard revision, serving snapshot หรือ metric definition

### ลำดับความน่าเชื่อถือของหลักฐาน

1. **Independent leaderboard ที่บอก model ID และ setting ชัด** — ใช้เทียบ relative quality ได้ดีที่สุดในชุดข้อมูลนี้
2. **Official model card ที่บอก dataset, tool state และ methodology** — ใช้ดูจุดแข็งเฉพาะทาง แต่ต้องระวัง vendor-selected prompt
3. **Official product description** — ใช้บอก intended use, context, ราคา และ capability ไม่ใช่ benchmark proof
4. **Local catalog และ smoke test** — ยืนยัน availability และ runtime behavior ของเรา ไม่ใช่คะแนนความฉลาด

## 3. ตาราง benchmark แบบเทียบข้าม provider

### Quality indices

คะแนนในตารางนี้เป็นค่า 0–100 จาก Artificial Analysis ณ วันที่ตรวจ ไม่ใช่เปอร์เซ็นต์ที่เอาไปเทียบกับ official model card ได้ตรง ๆ

| Model | Intelligence | Coding | Agentic | Terminal-Bench 2.1 | HLE | GPQA |
|---|---:|---:|---:|---:|---:|---:|
| **Claude Opus 5 (max)** | **60.7** | **78.0** | **55.3** | **89.1** | 52.6 | 93.2 |
| **Claude Fable 5 (max, Opus 4.8 fallback)** | 59.9 | 76.5 | 52.8 | 84.6 | **53.3** | 92.6 |
| **GPT-5.6 Sol (max)** | 58.9 | 77.4 | 54.0 | 88.0 | 47.2 | **94.1** |
| **GPT-5.6 Terra (max)** | 55.0 | 76.7 | 47.4 | 88.0 | 41.8 | 92.5 |
| **Grok 4.5 (high)** | 53.8 | 72.4 | 45.7 | 81.6 | 40.3 | 93.1 |
| **Claude Sonnet 5 (max)** | 53.4 | 71.5 | 46.7 | 80.5 | 39.6 | 91.1 |
| **GPT-5.6 Luna (max)** | 51.2 | 71.4 | 45.6 | 80.9 | 37.2 | 91.1 |
| **Gemini 3.6 Flash (high)** | 50.1 | 69.2 | 38.7 | 77.5 | 38.3 | 92.8 |
| **Gemini 3.1 Pro Preview** | 46.5 | 68.8 | 21.4 | 73.8 | 44.7 | 94.1 |

### ราคาและข้อสังเกตด้าน runtime

ราคาคือ public API input/output ต่อ 1M tokens ไม่ใช่ค่าใช้จ่ายจริงจาก Cursor หรือ Codex ซึ่งอาจมี routing, subscription, caching และ service tier ของตัวเอง

| Model | ราคา input / output | Context ที่ประกาศ | อ่านเชิงปฏิบัติ |
|---|---:|---:|---|
| Claude Fable 5 | $10 / $50 | 1M / 128k output | แพงสุด เหมาะกับงานที่การแก้พลาดมีต้นทุนสูง |
| Claude Opus 5 | $5 / $25 | 1M / 128k output | คุณภาพสูงสุดใน AA แต่ช้ากว่าและแพงกว่า Sonnet |
| Claude Sonnet 5 | $3 / $15; introductory $2 / $10 ถึง 2026-08-31 | 1M / 128k output | จุดคุ้มค่าของงาน interactive |
| GPT-5.6 Sol | $5 / $30 | ประมาณ 1.05M / 128k output ใน API docs | flagship coding/agentic; effort สูงทำให้ต้นทุนและ TTFT เพิ่ม |
| GPT-5.6 Terra | $2.50 / $15 | ประมาณ 1.05M / 128k output | balanced tier; medium เหมาะกับ loop ที่ต้องตอบไว |
| GPT-5.6 Luna | $1 / $6 | ประมาณ 1.05M / 128k output | ถูกมากและ generate เร็วหลังเริ่มตอบ แต่ reasoning max อาจรอ token แรกนาน |
| Gemini 3.6 Flash | $1.50 / $7.50 | 1M / 64k output | throughput สูง เหมาะกับ context กว้างและ multimodal |
| Gemini 3.1 Pro | $2 / $12 | 1M | quality สูงใน official task tests แต่ Preview/latency ต้องระวัง |
| Grok 4.5 | $2 / $6; cached input ต่ำกว่า | 500k | output cost ต่ำและ coding ใช้ได้ แต่ independent task evidence ยังน้อย |

## 4. อ่านผลตาม provider

### Anthropic

#### Claude Opus 5

**ภาพรวม:** คะแนน Intelligence, Coding, Agentic และ Terminal-Bench อยู่บนสุดของตารางนี้ เหมาะกับงานที่ต้องอ่านบริบทเยอะแล้วเลือกทางแก้เองหลายรอบ

**งานที่เหมาะ**

- Staff/Principal Engineer ที่ต้องแตก architecture และ trade-off
- debugging ข้าม package, service, database หรือ native boundary
- security review และ failure analysis ที่ต้องตามเหตุผลหลายชั้น
- codebase migration ที่ต้องแก้หลายไฟล์แล้วตรวจผลกระทบย้อนกลับ
- final reviewer ของ diff ใหญ่หรือ implementation ที่มี risk สูง

**ข้อจำกัด**

- ราคาและ latency สูงกว่า Sonnet อย่างชัดเจน
- 1M context เป็น capacity ไม่ใช่หลักประกันว่า model จะรักษาความแม่นตลอดทั้ง window
- คะแนน max/high ไม่ควรนำไปปนกับ Cursor effort ที่ยังไม่ได้ smoke test จริง

**คำแนะนำใน direct-cli:** ใช้ `claude-opus-5-thinking-high` เป็น escalation สำหรับงานที่ Sol หรือ Sonnet ให้คำตอบไม่พอ ไม่จำเป็นต้องใช้เป็น default ทุก turn

#### Claude Fable 5

**ภาพรวม:** Anthropic วาง Fable 5 สำหรับ long-running agents และ AA ให้ HLE สูงสุดในกลุ่มนี้ แต่ public record ที่ AA ใช้เขียนชัดว่าเป็น **Fable 5 with Opus 4.8 fallback** จึงแยก pure Fable จาก fallback ไม่ได้

**งานที่เหมาะ**

- research engineer ที่ต้องสังเคราะห์เอกสารจำนวนมาก
- autonomous migration หรือ implementation ที่มีหลาย phase และต้องรักษา context
- งานที่ต้องคิดทางเลือกหลายแบบก่อนลงมือ เช่น protocol, architecture หรือ data model
- second opinion สำหรับโจทย์ที่ Sol หรือ Opus ให้ข้อสรุปไม่ตรงกัน

**ข้อจำกัด**

- ค่าใช้จ่ายสูงสุดในกลุ่ม
- fallback ทำให้คะแนนไม่ใช่ attribution ของ Fable เพียว ๆ
- ไม่เหมาะกับงานแก้ typo, rename หรือ test ที่ทำซ้ำจำนวนมาก

#### Claude Sonnet 5

**ภาพรวม:** คะแนนดิบต่ำกว่า Opus/Fable แต่เป็นจุดสมดุลที่ดีระหว่าง coding, agentic behavior, speed และราคา เหมาะกับคนที่ต้องการ model เป็นเพื่อนร่วมทีมตลอดวัน

**งานที่เหมาะ**

- Senior Software Engineer ที่ทำ feature, refactor และ test loop ทุกวัน
- code review รอบแรกและการอธิบาย diff ให้ทีม
- technical writing, README, migration note และ issue breakdown
- frontend implementation ที่ต้อง iterate หลายรอบ
- routine research ที่มีขอบเขตชัด

**ข้อจำกัด**

- ถ้าโจทย์มี architecture ambiguity หรือ failure mode ซ้อนกันหลายชั้น ให้ escalate ไป Opus หรือ Sol
- คะแนน HLE และ coding ไม่ได้บอกว่า output จะสั้นหรือประหยัดเสมอไป เพราะ effort setting มีผลมาก

### OpenAI

#### GPT-5.6 Sol

**ภาพรวม:** เป็นตัวที่สมดุลที่สุดระหว่าง coding กับ agentic work ในฝั่ง OpenAI และมี GPQA สูงสุดร่วมกับ Gemini 3.1 Pro ในตาราง AA รุ่น max

**งานที่เหมาะ**

- main implementation ที่ต้องแก้ source, run tests และ follow through จนจบ
- hard debugging, performance investigation และ integration ที่มี tool หลายชนิด
- backend, Rust/native, build system และ CI ที่ต้องระวังผลกระทบ
- architecture review ที่ต้องเชื่อม requirement กับ implementation จริง
- high-stakes final judgment หลังมี diff และ test evidence แล้ว

**ข้อจำกัด**

- Sol max/ultra อาจช้าหรือใช้ token มากเกินความจำเป็นสำหรับงานเล็ก
- local Codex runtime กับ generic API/leaderboard อาจมี context และ effort behavior ไม่เหมือนกัน
- งานที่ต้องคุยโต้ตอบเร็ว ๆ อาจรู้สึกหนักกว่า Terra หรือ Sonnet

**คำแนะนำใน direct-cli:** เริ่มที่ `gpt-5.6-sol --effort high` สำหรับ flagship engineering งานยากจริงค่อยขยับเป็น xhigh/max/ultra ตาม contract ของ lane

#### GPT-5.6 Terra

**ภาพรวม:** Terra เป็น balanced tier ที่เหมาะกับ interactive loop มากกว่า Sol เมื่อความเร็วและต้นทุนสำคัญ คะแนน max บน AA สูง แต่ไม่ควรเอาไปแทนคะแนนของ `medium` ที่เราใช้ใน direct-cli

**งานที่เหมาะ**

- routine implementation และ bug fix ที่ hypothesis ค่อนข้างชัด
- specialist lane เช่น test repair, typecheck cleanup, docs pass หรือ narrow refactor
- controller ที่ต้องคุยกับผู้ใช้บ่อยและไม่ควรรอนาน
- first-pass review ก่อนส่งงานให้ Sol หรือ Opus ตรวจซ้ำ

**ข้อจำกัด**

- ไม่ควรให้เป็นผู้ตัดสิน architecture ที่ข้อมูลยังไม่ครบ
- เมื่อใช้ medium คุณภาพและ agentic score จะต่ำกว่า max มาก จึงต้องกำหนด scope ให้แคบและมี test gate

**คำแนะนำใน direct-cli:** `gpt-5.6-terra --effort medium` เหมาะกับ specialist/review ที่ bounded และ `high` เหมาะกับ interactive fix ที่ต้องการ reasoning เพิ่ม

#### GPT-5.6 Luna

**ภาพรวม:** Luna เด่นที่ต้นทุนต่ำและ output speed หลังเริ่ม generate แล้ว ไม่ใช่ตัวเลือกสำหรับงานที่ต้องการ quality สูงสุด

**งานที่เหมาะ**

- repo scout และ mapping แบบ read-only
- สรุป docs, จัดกลุ่ม issue และแตกงานเบื้องต้น
- batch maintenance ที่มี test คุม เช่น rename, formatting, mechanical migration
- parallel first opinions ที่ต้องการหลายมุมโดยไม่ใช้ค่าใช้จ่ายระดับ Sol
- long task ที่ยอมรับ latency ก่อน token แรกได้

**ข้อจำกัด**

- max reasoning อาจมี TTFT สูงจนดูเหมือน agent เงียบ
- ไม่ควรปล่อยให้เป็นผู้อนุมัติ destructive change, security decision หรือ architecture สุดท้าย
- ถ้างานมี context ambiguity สูง ส่วนต่างค่าใช้จ่ายที่ประหยัดได้อาจหายไปกับ retry และ human correction

**คำแนะนำใน direct-cli:** ใช้ `gpt-5.6-luna --effort high` หรือ `max` เมื่อโจทย์เป็น read-only/batch และใช้ `medium` เมื่อเน้น throughput

### Google

#### Gemini 3.6 Flash

**ภาพรวม:** จุดขายไม่ใช่คะแนน Intelligence สูงสุด แต่เด่นที่ราคาต่ำ รองรับ context 1M และ multimodal input พร้อม throughput สูง Official Google card รายงาน SWE-Bench Pro 58.7%, Terminal-Bench 2.1 78.0% และ DeepSWE v1.1 49%

**งานที่เหมาะ**

- อ่านเอกสาร ภาพ screenshot, chart, PDF หรือ log bundle แล้วสรุป pattern
- repository reconnaissance ที่ต้องกวาดไฟล์และ context กว้าง
- frontend/product engineering ที่ต้องดู visual reference ร่วมกับ code
- batch analysis, classification และ first-pass QA
- cost-sensitive coding ที่มี test harness คุม

**ข้อจำกัด**

- Official card เตือนเรื่อง slowness, timeout และ hallucination บางกรณี
- 1M context ไม่ได้แปลว่า retrieval ช่วงท้าย window จะเท่ากับช่วงต้น
- ไม่ควรใช้เป็น final authority กับ migration ที่ destructive หรือ security-sensitive

**คำแนะนำใน direct-cli:** `gemini-3.6-flash-high` เหมาะกับ scout/multimodal lane และ second opinion ที่ต้องการข้อมูลกว้าง

#### Gemini 3.1 Pro

**ภาพรวม:** Official Google results ดูดีมากใน reasoning และ coding — SWE-Bench Verified 80.6%, GPQA Diamond 94.3%, HLE 44.4% แบบ no tools และ 51.4% เมื่อเปิด search+code, ARC-AGI-2 77.1% — แต่ Artificial Analysis ยัง map เป็น **Preview** และให้ Agentic Index เพียง 21.4

**งานที่เหมาะ**

- research/data/ML ที่มี chart, image, document หรือ multimodal evidence
- difficult reasoning ที่ต้องอธิบายหลักฐานและเปรียบเทียบทางเลือก
- code generation ที่ input มี visual context หรือข้อมูลหลายรูปแบบ
- long-context analysis ที่ไม่ต้องวน tool loop เร็วมาก

**ข้อจำกัด**

- official score กับ AA score ต่างกันมากเพราะ task, tool state และ harness ต่างกัน
- official 1M retrieval test ของ Pro ต่ำกว่า Flash ในบาง setting
- Preview identity และ latency ทำให้ยังไม่ควรตั้งเป็น universal default

**สถานะการใช้งาน:** Agy ยังแสดงชื่อรุ่นนี้ใน catalog แต่ current direct-cli guidance ระบุว่าเคยไม่ผ่าน launch และตัดออกจาก curated picker จึงให้ถือเป็น research candidate เท่านั้นจนกว่าจะมี foreground smoke ที่ผ่านจริง

### xAI

#### Grok 4.5

**ภาพรวม:** เป็น balanced coding/agentic option คะแนน AA สูงกว่า Sonnet 5 เล็กน้อยใน Coding และราคา output ต่ำ แต่ xAI official page ที่ตรวจไม่พบ task-level benchmark ที่ reproducible แบบเดียวกับ Google card

**งานที่เหมาะ**

- coding pass ที่ต้องการ alternative จาก OpenAI/Anthropic
- terminal implementation ระดับกลางถึงยากที่มี test คุม
- ideation, critique และ second opinion ที่ต้องการมุมมองต่าง provider
- cost-sensitive agent ที่ output เยอะ

**ข้อจำกัด**

- หลักฐาน independent task-level ยังบางกว่า Opus, Sol และ Gemini Pro
- อย่าใช้ตัวเลข comparative จาก vendor อื่นเป็น official xAI score
- งานที่ต้องรักษา context ยาวมากควรเทียบกับ Opus/Fable/Gemini ใน harness เดียวก่อน

## 5. เปรียบเป็นตำแหน่งงาน engineering จริง

ตารางนี้แปลงความสามารถของ model เป็นลักษณะงาน ไม่ใช่การบอกว่า model แทนคนในตำแหน่งนั้นได้ทั้งหมด งานจริงยังต้องมี owner, review และ test evidence

| ตำแหน่ง / role | ลักษณะงานจริง | ตัวหลัก | ตัวสำรอง | ทำไมถึงเลือกแบบนี้ |
|---|---|---|---|---|
| **Staff / Principal Engineer** | วาง architecture, trade-off, boundary, migration strategy และตัดสินใจที่มีผลหลายทีม | Opus 5, Sol High | Fable 5 | ต้องรักษาเหตุผลหลายชั้นและเห็นผลกระทบข้ามระบบ คะแนน Intelligence/Agentic สูงช่วยได้ แต่ decision สุดท้ายยังเป็นของคน |
| **Senior Software Engineer** | รับ feature ตั้งแต่ requirement ถึง implementation, tests และ rollout | Sonnet 5, Sol High | Opus 5 | Sonnet คุ้มสำหรับ loop ทั้งวัน ส่วน Sol ใช้เมื่อ feature มี integration หรือ risk สูง |
| **Backend / Platform Engineer** | API, schema, queue, cache, concurrency, service contract และ performance | Sol High, Opus 5 | Terra High | งานมี hidden coupling สูง จึงต้องการ reasoning และการตรวจผลกระทบมากกว่าการ generate code เร็ว |
| **Frontend / Product Engineer** | แปลง requirement และ visual reference เป็น UI ที่ใช้งานจริง พร้อม responsive/accessibility | Sonnet 5, Opus 5 | Gemini 3.6 Flash / Pro | Sonnet/Opus เก่ง implementation loop ส่วน Gemini ได้เปรียบเมื่อมี screenshot, image และ multimodal reference; benchmark ไม่วัด taste หรือ product judgment |
| **Rust / Native / Build Engineer** | FFI, OS API, packaging, compiler error, CI และ platform-specific behavior | Sol High, Opus 5 | Terra High | ต้องตาม error chain และ verify ใน environment จริง ไม่ควรใช้ Flash/Luna เป็นผู้ตัดสินสุดท้าย |
| **SRE / Incident Engineer** | อ่าน log, สร้าง hypothesis, ลด blast radius, ทำ remediation และเขียน postmortem | Opus 5, Sol High | Gemini 3.6 Flash สำหรับ log/context ingest | Opus/Sol เหมาะกับ failure mode ซ้อนกัน ส่วน Flash เหมาะกับการกวาดข้อมูลจำนวนมากก่อนส่งให้ตัว reasoning หลัก |
| **Security Engineer / Reviewer** | threat model, auth boundary, secret handling, dependency risk และ abuse case | Opus 5, Fable 5 | Sol High | ต้องมอง negative case และ chain of failure ให้ครบ ห้ามให้ model ตัวเดียว sign off ช่องโหว่หรือ production release |
| **QA / Test Engineer** | สร้าง test matrix, หา regression, reproduce bug และตรวจ edge case | Sonnet 5, Terra Medium | Sol หรือ Opus สำหรับ adversarial pass | งาน routine ใช้รุ่นคุ้มได้ แต่ test ที่ต้องเดา failure mode หรือดู diff ใหญ่ควร escalate |
| **Developer Experience / Tooling Engineer** | CLI, hooks, generators, fixtures, installer, docs และ workflow ergonomics | Sol High, Sonnet 5 | Terra Medium / Luna | ต้องเข้าใจทั้ง code และ user workflow; Sol เหมาะกับ contract, Sonnet เหมาะกับ iteration และ docs |
| **Research Engineer / Applied Scientist** | อ่าน paper/model card, สังเคราะห์ evidence, ออกแบบ evaluation และตีความ uncertainty | Fable 5, Opus 5 | Gemini 3.1 Pro | Fable/Opus เหมาะกับ synthesis ยาว ส่วน Gemini Pro เด่น multimodal/reasoning แต่ต้องแยก vendor claim จาก independent result |
| **Data / ML Engineer** | notebook, evaluation, data pipeline, chart, experiment และ model comparison | Gemini 3.1 Pro, Sol High | Gemini 3.6 Flash | Pro/Flash เหมาะกับข้อมูลภาพและ chart; Sol เหมาะกับ engineering ของ pipeline และ reproducibility |
| **Technical Writer / Documentation Engineer** | RFC, migration guide, README, API docs และ decision record | Sonnet 5 | Gemini 3.6 Flash, Fable 5 | Sonnet ให้คุณภาพ/ความเร็วสมดุล Flash เหมาะกับเอกสารจำนวนมาก Fable เหมาะกับ synthesis ใหญ่ แต่ต้อง review voice และ factual accuracy |
| **Repo Scout / Analyst** | map codebase, หา owner/symbol, สรุป risk และเสนอจุดเริ่มต้นแบบ read-only | Luna High/Max, Gemini 3.6 Flash | Terra Medium | งานนี้ไม่ควรเผา Sol ทุกครั้ง แยก scout กับ implementation แล้วให้ model หลักรับช่วงด้วย evidence |
| **Automation / Batch Maintainer** | codemod, rename, formatting, metadata update และ repetitive migration | Luna Medium/High, Gemini 3.6 Flash | Terra Medium | ต้นทุนและ throughput สำคัญ แต่ต้องมี deterministic check, dry-run และ test หลังงานเสมอ |
| **Long-running Autonomous Engineer** | ทำงานหลาย phase, รัน command, แก้ failure, verify และเดินต่อจน DoD | Fable 5, Opus 5, Sol High | Sonnet 5 | ความสามารถสำคัญคือ completion judgment และ recovery ไม่ใช่แค่คะแนน coding; ต้องมี bounded scope และ checkpoint |
| **Final Reviewer / Release Engineer** | ตรวจ diff, release notes, test evidence, version/tag และ go/no-go | Opus 5, Sol High | Sonnet 5 | ต้องอ่านหลักฐานและจับ claim ที่เกินจริง แต่ release approval ยังต้องมี human ownership |

### ถ้าแบ่งตามระดับความเสี่ยง

| ระดับความเสี่ยง | Model ที่เหมาะ | Guardrail ที่ควรมี |
|---|---|---|
| ต่ำ: docs, rename, formatting, read-only mapping | Luna, Gemini 3.6 Flash, Terra | dry-run, exact file scope, diff check |
| กลาง: feature, test repair, refactor | Sonnet, Terra, Grok | tests, typecheck, review diff, ห้ามขยาย scope เอง |
| สูง: architecture, native, security, migration | Opus, Sol, Fable | explicit plan, one writer, independent verifier, human approval |
| สูงมาก: production, destructive action, credential boundary | Sol หรือ Opus ช่วยวิเคราะห์เท่านั้น | human owner, rollback plan, staged rollout, runtime proof |

## 6. Recipe สำหรับทีมจริง

### งาน feature ปกติ

```text
Luna หรือ Gemini 3.6 Flash: scout + map owner + หา test ที่เกี่ยวข้อง
        ↓
Sonnet หรือ Terra: implement แบบ bounded
        ↓
Sol หรือ Opus: review diff, failure mode และ acceptance criteria
        ↓
มนุษย์: ตรวจ behavior ที่ benchmark ตรวจไม่ได้และอนุมัติ merge
```

ใช้ recipe นี้เมื่อไม่ต้องการเอา model แพงสุดไปทำทุกอย่าง และต้องการให้แต่ละ lane มี deliverable ที่ตรวจได้

### งาน hard debugging

```text
Flash หรือ Opus: สรุป log และเรียบเรียง timeline โดยยังไม่แก้ code
        ↓
Sol หรือ Opus: ตั้ง hypothesis เดียว + ทำ smallest fix
        ↓
Sonnet/Terra: รัน regression และเติม test ที่ขาด
        ↓
Sol หรือ Opus: ตรวจว่าการแก้ไม่กลบ root cause หรือสร้าง behavior ใหม่
```

### งาน research และ benchmark

```text
Gemini 3.6 Flash: กวาด model card, table, chart และ raw page
        ↓
Fable/Opus: สังเคราะห์ข้อสรุปและแยก fact / claim / unknown
        ↓
Sol: ตรวจ methodology, code harness และ reproducibility
        ↓
มนุษย์: เลือก decision ที่มีผลต่อ product หรือ routing
```

### งาน UI / visual engineering

อย่าใช้ benchmark coding เป็นตัวตัดสินว่า model ไหนออกแบบ UI ดีกว่า ควรแยกงานเป็นสามส่วน

1. Gemini 3.6 Flash/3.1 Pro ช่วยอ่าน screenshot, reference และ visual evidence
2. Sonnet/Opus ทำ implementation และ interaction semantics
3. มนุษย์หรือ reviewer ที่เห็น rendered result ตรวจ hierarchy, spacing, contrast, responsive behavior และ product taste

## 7. สิ่งที่ benchmark ยังตอบไม่ได้

- model จะเดินต่อจน Definition of Done หรือจะ report กลางทาง
- จะรักษา focus และ scope เมื่อมีไฟล์ dirty หรือมีงาน concurrent หรือไม่
- จะใช้ tool ถูก schema, รอ process ถูกตัว และ recover จาก timeout ได้หรือไม่
- diff ที่ผ่าน test จะรักษา UX, accessibility, security และ product intent หรือไม่
- prompt เดียวกันจะให้ผลเท่ากันเมื่อผ่าน Cursor, Agy, Codex, OAuth, fallback หรือ service tier คนละแบบหรือไม่
- model จะสื่อสารกับคนในทีมได้เหมาะกับ role และความเสี่ยงหรือไม่

ตรงนี้เป็นเหตุผลที่ benchmark ต้องเป็น input ของ routing ไม่ใช่ผู้ตัดสิน routing เพียงคนเดียว

## 8. วิธีทำ internal engineering benchmark ที่เชื่อถือได้

ถ้าจะพิสูจน์ว่า model เหมาะกับงานของ Mahiro จริง ควรใช้ task เดียวกันและ harness เดียวกัน โดย pin รายละเอียดเหล่านี้

- exact provider/model ID และ reasoning effort
- CLI version, agent harness, system prompt และ tool permissions
- repo commit, dirty-state policy และ working directory
- timeout, retry, max output, parallelism และ budget
- test command, acceptance criteria และ human review rubric

### ชุดงานขั้นต่ำที่ควรรัน

1. **Feature task:** เพิ่ม behavior ใน codebase จริง พร้อม test ใหม่
2. **Cross-module bug:** bug ที่ต้องตาม call chain อย่างน้อย 3 จุด
3. **Test repair:** failing test ที่มีหลาย plausible fixes
4. **Native/integration task:** command, process หรือ API ที่ต้อง verify runtime
5. **Research task:** อ่าน docs หลายแหล่งแล้วเขียน decision record พร้อม uncertainty
6. **UI task:** เปลี่ยน surface แล้วตรวจ rendered evidence ที่ desktop/mobile

### Metric ที่ควรเก็บ

| Metric | เหตุผล |
|---|---|
| Time to first useful action | แยก model ที่คิดนานแต่คุ้มออกจาก model ที่เงียบหรือ stuck |
| DoD completion rate | วัดว่าทำงานจบจริง ไม่ใช่แค่ตอบดี |
| Test/typecheck pass rate | วัด correctness ขั้นพื้นฐาน |
| Human correction count | วัดงานที่ต้องตามแก้หลัง model รายงานจบ |
| Scope violations | จับการแก้ไฟล์เกินขอบเขตหรือเปลี่ยน contract โดยไม่ตั้งใจ |
| Retry/tool error count | วัด runtime/tool integration ไม่ใช่ intelligence อย่างเดียว |
| Tokens, cost และ wall time | ตัดสินความคุ้มค่าของงานจริง |
| Review quality | ให้ human/reviewer ให้คะแนน diff, explanation และ risk coverage |

## 9. Decision matrix สำหรับ direct-cli ตอนนี้

นี่เป็น routing recommendation จากหลักฐานปัจจุบัน ไม่ใช่การเปลี่ยน default ของ skill โดยอัตโนมัติ

| งาน | แนะนำ | เหตุผล |
|---|---|---|
| Cursor งานยากที่ต้องลองของใหม่ | `claude-opus-5-thinking-high` | AA สูงสุดและเหมาะกับ deep agentic work แต่ต้อง foreground-smoke ก่อนพึ่งเป็น default |
| Cursor coding alternative | `cursor-grok-4.5-high` | coding/agentic ดีและ output cost ต่ำกว่า แต่ public task evidence ยังน้อย |
| Codex flagship implementation | `gpt-5.6-sol --effort high` | coding/agentic สูง เหมาะกับ main implementation และ hard debugging |
| Codex everyday specialist | `gpt-5.6-terra --effort medium` | interactive และคุ้มกว่า Sol เมื่อ scope bounded |
| Codex scout/batch | `gpt-5.6-luna --effort medium` | ต้นทุนต่ำ เหมาะกับ read-only และ repetitive work |
| Agy multimodal scout | `gemini-3.6-flash-high` | context ใหญ่, multimodal และ throughput สูง |
| Agy difficult multimodal reasoning | Gemini 3.1 Pro เป็น candidate เท่านั้น | official reasoning/coding results ดี แต่ current direct-cli guidance ระบุว่า Pro เคยไม่ผ่าน launch; รอ foreground smoke ก่อนใช้ routing จริง |
| Cursor explicit mid-tier workhorse | `claude-sonnet-5-thinking-high` | ใช้เป็น workhorse ก่อน escalate ไป frontier tier; default ของ direct-cli เองยังต้องยึดตาม repo policy และไม่ได้ถูกเปลี่ยนโดย research นี้ |

## 10. Caveat สำคัญก่อนนำไปตั้ง policy

1. **Fable 5 มี fallback:** คะแนน AA ไม่ใช่ pure Fable 5
2. **Gemini 3.1 Pro เป็น Preview ใน AA:** official card กับ independent leaderboard กำลังวัดคนละ configuration
3. **Sol/Terra/Luna effort มีผลมาก:** max score ไม่ใช่ medium score และ direct-cli route ไม่เท่ากับ API benchmark route
4. **SWE-bench วัดทั้ง agent harness:** tool policy, patch loop, test strategy และ retry มีผล ไม่ใช่ model อย่างเดียว
5. **Official benchmark เป็น vendor evidence:** ใช้ดูจุดแข็งเฉพาะทาง แต่ไม่ควรใช้ตัดสิน provider อื่นโดยตรง
6. **1M context ไม่เท่ากับ memory คุณภาพ 1M:** ต้องใช้ retrieval, compaction และ summary ที่มี owner
7. **ราคาในตารางเป็น public API price:** Cursor subscription, Codex OAuth และ service tier อาจทำให้ economics จริงต่างออกไป
8. **Benchmark freshness สำคัญ:** model alias, serving revision และ leaderboard backfill เปลี่ยนได้ จึงควรบันทึกวันที่และ exact ID ทุกครั้ง

## แหล่งข้อมูล

### Provider และ model cards

- [Artificial Analysis model leaderboard](https://artificialanalysis.ai/leaderboards/models)
- [Artificial Analysis methodology](https://artificialanalysis.ai/methodology/intelligence-benchmarking)
- [Claude model overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [OpenAI API models](https://developers.openai.com/api/docs/models)
- [Gemini 3.6 Flash model card](https://deepmind.google/models/model-cards/gemini-3-6-flash/)
- [Gemini 3.1 Pro model card](https://deepmind.google/models/model-cards/gemini-3-1-pro/)
- [Grok 4.5 model docs](https://docs.x.ai/developers/models/grok-4.5)

### Benchmark methodology

- [SWE-bench Verified](https://www.swebench.com/verified.html)
- [LiveBench](https://livebench.ai/)
- [Aider Polyglot leaderboard](https://aider.chat/docs/leaderboards/)
- [Arena leaderboard](https://arena.ai/leaderboard)
- [GPQA repository](https://github.com/idavidrein/gpqa)
- [Humanity’s Last Exam](https://github.com/centerforaisafety/hle)
- [MMLU-Pro](https://github.com/TIGER-AI-Lab/MMLU-Pro)

### Repo-local context

- [GPT-5.5 vs GPT-5.6 routing research](./gpt-5-5-vs-5-6-routing-2026-07.md)
- [GPT-5.6 workflow handoff](./gpt-5-6-workflow-handoff-conv-236.md)
- [Conversation and model usage report](./mahiro-code-conversation-model-usage-2026-07.md)
- [direct-cli skill](../../skills/direct-cli/SKILL.md)

## สถานะของเอกสาร

เอกสารนี้เป็น decision-support research snapshot ไม่ใช่ permanent model policy เมื่อ model catalog, provider routing, benchmark version หรือ local runtime เปลี่ยน ควร refresh ตัวเลขและทดสอบ task ชุดเดิมซ้ำก่อนแก้ default หรือประกาศว่า model ตัวหนึ่งเหนือกว่าอีกตัวในงาน production
