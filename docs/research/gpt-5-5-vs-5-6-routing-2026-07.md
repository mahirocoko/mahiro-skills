# GPT-5.5 vs GPT-5.6: benchmark, runtime และแนวทางเลือก model

> ตรวจข้อมูลเมื่อ 26 กรกฎาคม 2026 เอกสารนี้สรุปตามหลักฐานที่หาได้ ณ ตอนนั้น ไม่ได้หมายความว่าคะแนน benchmark จะทำนายพฤติกรรม coding agent ระยะยาวได้ครบทุกด้าน

## สรุปเร็ว

- **Luna Max** เด่นเรื่องความคุ้มค่า ไม่ใช่ upgrade ด้านคะแนนดิบจาก GPT-5.5 High และต้องรอ token แรกนานมาก
- **Terra High** ตอบสนองไว ต้นทุนต่ำ แต่ Artificial Analysis ไม่มีคะแนน Intelligence หรือ Coding Agent แบบ public สำหรับ effort นี้โดยตรง
- **Sol High** เป็นตัวที่หลักฐาน benchmark ชี้ชัดสุดว่าเหนือกว่า GPT-5.5 High ทั้ง Intelligence, cost ต่อ task, เวลารอ token แรก และจำนวน output token
- GPT-5.6 ยังมีความขรุขระด้าน runtime/integration โดยเฉพาะเมื่อใช้ tools ร่วมกับ reasoning และเรื่อง context-window metadata
- ใน conversation ช่วงใช้ Terra ของ Mahiro Code เจอการ report/checkpoint ก่อน DoD จริงบ้าง แต่มี Goal token-budget gate เก่าที่บังคับหยุดอยู่ด้วย จึงโยนสาเหตุให้ model อย่างเดียวไม่ได้

## ความหมายของตัวเลข

| Metric | หมายถึง |
|---|---|
| `$ / task` | ค่าเฉลี่ยต่อโจทย์ของ AA Intelligence Index รวม input/output/cache |
| `TTFT` | เวลาก่อน token คำตอบแรกออก |
| `tok/s` | ความเร็วการ generate หลังเริ่มตอบแล้ว |
| `Output tokens` | answer + reasoning tokens เฉลี่ยต่อ task |
| `Intelligence` | Artificial Analysis Intelligence Index |
| `—` | Artificial Analysis ไม่เผยผล public สำหรับ tier นั้น ไม่ได้แปลว่าคะแนนเป็น 0 |

## ทุก tier ที่มีตัวเลข

| Model | $/task | TTFT | tok/s | Output tokens | Intelligence |
|---|---:|---:|---:|---:|---:|
| GPT-5.5 low | $0.211 | 1.93s | 66 | 2.1k | — |
| GPT-5.5 medium | $0.406 | 10.71s | 70 | 5.1k | — |
| **GPT-5.5 high** | **$0.668** | **28.54s** | **76** | **10.1k** | **53.1** |
| GPT-5.5 xhigh | $0.992 | 88.77s | 79 | 16.1k | 54.8 |
| Luna low | $0.040 | 1.55s | 160 | 2.3k | — |
| Luna medium | $0.050 | 3.40s | 167 | 3.7k | — |
| Luna high | $0.095 | 11.26s | 172 | 8.1k | — |
| Luna xhigh | $0.139 | 40.36s | 168 | 12.5k | — |
| **Luna max** | **$0.209** | **139.35s** | **188** | **18.9k** | **51.2** |
| Terra low | $0.154 | 1.49s | 113 | 2.3k | — |
| Terra medium | $0.175 | 1.92s | 117 | 3.8k | — |
| **Terra high** | **$0.336** | **3.30s** | **122** | **7.7k** | **—** |
| Terra xhigh | $0.477 | 21.66s | 120 | 11.0k | 51.6 |
| Terra max | $0.825 | 178.38s | 136 | 19.4k | 55.0 |
| Sol low | $0.197 | 2.97s | 58 | 2.5k | — |
| Sol medium | $0.314 | 5.08s | 64 | 4.2k | 53.6 |
| **Sol high** | **$0.453** | **21.85s** | **63** | **6.7k** | **55.9** |
| Sol xhigh | $0.682 | 51.95s | 70 | 9.9k | 57.7 |
| Sol max | $1.037 | 144.56s | 66 | 15.3k | 58.9 |

## Coding Agent Index

Artificial Analysis วัดแบบ composite `pass@1` จาก DeepSWE, Terminal-Bench v2 และ SWE-Atlas-QnA โดยเปิดเลขที่เทียบกันได้ตรง ๆ แค่นี้

| Model | Coding Agent Index |
|---|---:|
| Sol max | **80** |
| Terra max | 77 |
| GPT-5.5 xhigh | 76 |
| Luna max | 75 |

ยังไม่มีคะแนน public ของ GPT-5.5 High หรือ Terra High ใน index นี้ จึงไม่ควรเดาตัวเลขจาก tier ข้างเคียง

## คู่เทียบที่สำคัญ

### Luna Max vs GPT-5.5 High

| Metric | Luna Max | GPT-5.5 High | ผลต่าง |
|---|---:|---:|---|
| Cost/task | $0.209 | $0.668 | Luna ถูกกว่า 69% |
| Intelligence | 51.2 | 53.1 | Luna ต่ำกว่า 1.9 คะแนน |
| TTFT | 139.35s | 28.54s | Luna ใช้เวลารอเริ่มตอบ 4.9× |
| Output speed | 188 tok/s | 76 tok/s | Luna เร็วกว่า 2.5× หลังเริ่ม generate |
| Output tokens | 18.9k | 10.1k | Luna ใช้มากกว่า 88% |

Luna Max ไม่ใช่ GPT-5.5 High ที่ฉลาดขึ้นตรง ๆ มันยอมใช้เวลาคิดนานเพื่อแลกกับต้นทุนที่ลดลงมาก ระหว่างรออาจดูเหมือน agent เงียบไปเกินสองนาที แต่เมื่อเริ่ม generate แล้วจะ stream เร็วมาก

### Terra High vs GPT-5.5 High

| Metric | Terra High | GPT-5.5 High | ผลต่าง |
|---|---:|---:|---|
| Cost/task | $0.336 | $0.668 | Terra ถูกกว่า 50% |
| TTFT | 3.30s | 28.54s | Terra เริ่มตอบเร็วกว่าเกือบ 9× |
| Output speed | 122 tok/s | 76 tok/s | Terra เร็วกว่า 1.6× |
| Output tokens | 7.7k | 10.1k | Terra ใช้น้อยกว่า 23% |
| Intelligence | — | 53.1 | ไม่มีผลเทียบตรงแบบ public |

Terra High เป็น tier ที่เหมาะกับ interactive loop เพราะเริ่มลงมือเร็วและประหยัด แต่ benchmark ยังไม่ได้พิสูจน์ว่าคุณภาพสูงกว่า GPT-5.5 High

### Sol High vs GPT-5.5 High

| Metric | Sol High | GPT-5.5 High | ผลต่าง |
|---|---:|---:|---|
| Cost/task | $0.453 | $0.668 | Sol ถูกกว่า 32% |
| Intelligence | 55.9 | 53.1 | Sol สูงกว่า 2.7 คะแนน |
| TTFT | 21.85s | 28.54s | Sol เริ่มตอบเร็วกว่าเล็กน้อย |
| Output speed | 63 tok/s | 76 tok/s | Sol stream ช้ากว่า |
| Output tokens | 6.7k | 10.1k | Sol ใช้น้อยกว่า 34% |

ถ้าต้องการตัวแทน GPT-5.5 High ที่คุณภาพดีขึ้นตาม benchmark, Sol High คือ candidate ที่หลักฐานชัดสุด

## Benchmark วัดอะไร และไม่ได้วัดอะไร

Artificial Analysis Intelligence Index v4.1 รวม 9 evaluation:

1. GDPval-AA v2
2. τ³-Benchmark
3. Terminal-Bench v2.1
4. SciCode
5. Humanity's Last Exam
6. GPQA Diamond
7. CritPt
8. AA-Omniscience
9. AA-LCR

แต่ benchmark ไม่ได้ตอบโดยตรงว่า coding agent จะทำงานต่อจนถึง DoD เองไหม, report ระหว่างทางเกินพอดีหรือเปล่า, ทำงานกับ hooks/Goal/subagents ได้ดีแค่ไหน หรือผ่าน test แล้วคุณภาพผลิตภัณฑ์จริงดีหรือไม่

## สัญญาณด้าน runtime และ integration

### Tools + reasoning

[CrewAI PR #6660](https://github.com/crewAIInc/crewAI/pull/6660) รายงานจาก raw HTTP test ว่า GPT-5.6 Sol, Terra และ Luna ได้ server-side default `reasoning_effort` เมื่อมี tools อยู่ใน request

- ฝั่ง Chat Completions ตอบ 400
- path ที่ใช้ agent + tools + reasoning บางแบบ hang จนต้อง kill ที่ 420 วินาที
- workaround คือ retry หนึ่งครั้งด้วย `reasoning_effort: "none"` แบบ explicit

นี่ไม่ใช่หลักฐานว่า model ฉลาดน้อยกว่า แต่เป็นหลักฐานว่า runtime/provider behavior ทำให้ GPT-5.6 ดูเหมือนหยุดหรือไม่ลงมือได้

### Context window ไม่ตรงกัน

[Codex v0.144.6](https://github.com/openai/codex/releases/tag/rust-v0.144.6) แก้ context window ของ GPT-5.6 Sol, Terra และ Luna เป็น **272,000 tokens** สำหรับ Codex path ขณะที่หน้า generic API ของ Artificial Analysis แสดง GPT-5.6 ที่ 1M และ GPT-5.5 ที่ 922k

สำหรับ ChatGPT/Codex OAuth ควรยึดค่าจาก first-party Codex runtime ไว้ก่อน ตอนทำ research นี้ Mahiro Code ยังตั้ง `context_window_limit: 372000` อยู่ ความต่างนี้อาจมีผลกับการวางแผน compaction และไม่ควรเอาไปตีความว่าเป็นคุณภาพของ model

## หลักฐานจากคนใช้ทั่วไป

GPT-5.6 ยังใหม่มาก ตอนตรวจข้อมูลพบ community postmortem ที่มีคุณภาพไม่เยอะ

- ค้น Hacker News แล้วไม่พบ discussion ที่ตรงกับ GPT-5.6
- Reddit ไม่เปิด structured search ให้ retrieval path นี้
- ผลค้นเว็บส่วนใหญ่เป็น SEO review ที่เล่า benchmark ซ้ำ
- GitHub มีรายงาน integration จริง แต่ไม่ใช่รีวิวคุณภาพจากผู้ใช้วงกว้าง

เพราะแบบนี้ ยังไม่ควรถือว่า benchmark ได้รับการยืนยันจาก user experience จำนวนมากแล้ว

## สิ่งที่เห็นใน Mahiro Code

ช่วงใช้ Terra มีบาง conversation ที่ agent report/checkpoint ก่อนงานจบจริง จนต้องสั่งในทำนอง “ทำต่อให้จบ” และ “ห้ามรายงานถ้ายังไม่เสร็จ” นี่สะท้อนปัญหาเรื่อง completion judgment ใน operating loop

แต่มีอย่างน้อยหนึ่งกรณีที่หยุดเพราะ policy แบบ deterministic: Goal token-budget gate เก่าเปลี่ยน Goal เป็น `budget_limited` แล้ว inject คำสั่งให้รอ Mahiro ตรง ๆ gate นี้ถูกเอาออกภายหลังแล้ว จึงสรุปว่า “Terra protection” อธิบายทุกการหยุดไม่ได้ ปัจจัยจริงปนกันทั้ง model, workflow policy, Goal state และ runtime configuration

## แนวทางเลือก model

| ลักษณะงาน | Tier ที่แนะนำ | เหตุผล |
|---|---|---|
| Status, reconnaissance, research ที่ขอบเขตชัด | Luna High หรือ Luna Max | คุ้มมาก เลือก High ถ้า TTFT สำคัญ |
| งาน batch ที่ยอมรอ reasoning นานได้ | Luna Max | effort สูงที่ถูกสุด แต่ TTFT ราว 139s |
| Interactive implementation loop | Terra High | TTFT ต่ำและ stream เร็ว |
| Main implementation ที่ quality ตาม benchmark สำคัญ | Sol High | Intelligence สูงกว่า GPT-5.5 High ที่ต้นทุนต่ำกว่า |
| Architecture, frontier debugging, final judgment | Sol High หรือ Sol Max | ความสามารถด้าน Intelligence/Coding Agent สูงสุดในผลที่เผยแพร่ |

## แหล่งข้อมูล

- [Artificial Analysis — GPT-5.6 benchmarks across Intelligence, Speed and Cost](https://artificialanalysis.ai/articles/gpt-5-6-has-landed)
- [Artificial Analysis — GPT-5.6 Sol model page และ comparison data](https://artificialanalysis.ai/models/gpt-5-6-sol)
- [OpenAI Codex v0.144.6 release notes](https://github.com/openai/codex/releases/tag/rust-v0.144.6)
- [CrewAI GPT-5.6 tools + reasoning-effort compatibility report](https://github.com/crewAIInc/crewAI/pull/6660)
