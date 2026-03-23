# Hackanomics™ 2026 Submission

![Hackanomics Banner](https://via.placeholder.com/1200x400/0A0C10/00E5FF?text=HACKANOMICS+2026)

> **Creator:** Aphichat Jahyo
> **Submission Type:** Web Application / Real-time Simulation Platform
> **Hackathon:** Hackonomics 2026

[**🇹🇭 อ่านภาษาไทยด้านล่าง / Read Thai Version Below**](#th-thai-version)

---

## 🌎 EN: Executive Summary

Hackanomics is an **"Institutional Grade" real-time financial simulation platform** designed to teach macroeconomics and financial literacy through high-stakes, immersive gameplay. Unlike traditional educational tools that rely on static quizzes, Hackanomics puts players in the seat of a fund manager navigating breaking news, changing interest rates, inflation, and unpredictable "Black Swan" events. It gamifies the complex relationship between macro-economic indicators and asset classes (Tech, Industrial, Bonds, Gold, Crypto).

The project is specifically architected to win both the **Technical Award** and the **Design Award**, featuring a bespoke "Tactical HUD" aesthetic, atomic transaction backend architecture, and a real-time Socket.IO game loop capable of syncing dozens of players seamlessly.

---

## 🏆 Hackonomics 2026 Judging Criteria Alignment

### 1. Relevancy & Education 📚
**"How well does the project address the theme of economics and financial literacy?"**
Hackanomics directly teaches the principles of portfolio management and macroeconomics. Players learn that high-interest rates often crush tech stocks but boost bonds, while inflation spikes drive capital toward gold and crypto. At the end of every 5-round simulation, an integrated **Gemini AI** provides personalized, harsh-but-fair critiques of each player's portfolio performance, ensuring direct educational feedback.

### 2. Technical Execution ⚙️ *(Targeting Technical Award)*
**"Does it demonstrate a high level of technical proficiency, scalability, and efficiency?"**
- **Architecture:** Next.js (App Router), NestJS Backend, Prisma ORM, PostgreSQL.
- **Real-Time Sync:** Custom 6-state game loop (`LOBBY → BRIEFING → TRADING → CLOSED`) powered by WebSockets (Socket.IO).
- **Concurrency & Resilience:** Features a "Token Validation Heartbeat" (3-strike network resilience) and atomic database transactions (`prisma.$transaction`) to guarantee zero race conditions during the final-second order execution rush.
- **The Economic Engine:** Calculates asset prices mathematically via `P_{t+1} = P_t * (1 + αM + βD + ε)` factoring Macro variables ($M$), Demand ($D$), and Noise ($\varepsilon$).

### 3. Presentation & Design 🎨 *(Targeting Design Award)*
**"Is the design intuitive, with a clear and attractive user interface...?"**
- **Tactical HUD Aesthetic:** Rejects generic SaaS templates in favor of a bespoke, immersive "Cyber-Finance" visual language. 
- **Custom Game Feel:** 120px cinematic round briefings with scanline overlays, locking "EXECUTING ORDERS" state screens, and a 60fps easing-based `TickingNumber` utility for all portfolio value changes.
- **Color Theory:** Utilizes modern `oklch()` color spaces natively (Midnight Blue, Electric Cyan, Neon Rose) avoiding muddy gradients for sharp, professional contrast.
- **Responsive:** Fluid typography (`text-clamp`) and mobile-first architectural elements ensure the Facilitator Command Center looks just as good on an iPad as a 4K monitor.

### 4. Impact 🚀
**"Could it have meaningful applications or scale beyond Hackonomics?"**
Hackanomics is designed to be deployed directly into classrooms, corporate training workshops, and university finance clubs. The dedicated **Facilitator Command Center** allows teachers/professors to physically manipulate interest rates and deploy "Black Swan" events live, making it a scalable, enterprise-ready B2B ed-tech product from day one.

### 5. Innovation 💡
**"How unique or creative is the approach to solving the problem?"**
Traditional financial literacy apps focus on saving $10 a week or identifying compounding interest. Hackanomics drops users into the deep end of institutional trading under extreme time pressure, utilizing generative AI (Google Gemini 1.5 Flash) not as a chatbot, but as an automated judge that analyzes batch player performance data to deliver customized financial roasts and advice.

---

## 🛠 Features Breakdown

### The Player Terminal
- **Dynamic Circular CountdownHUD:** Alerts users to time pressure (Cyan > Amber > Red Vignette).
- **Absolute Value Allocation:** Slide-to-confirm allocations across 7 asset classes (TECH, INDUSTRIAL, CONSUMER, BONDS, GOLD, CRYPTO, CASH).
- **TopBar Ticker:** Real-time scrolling price feed showing market volatility.

### The Facilitator Command Center
- **Live Roster & Capital Heatmap:** Observe where all 50+ players are parking their capital in real-time.
- **Event Injector:** Instantly trigger Economic Presets (Hyperinflation, Tech Boom) which broadcast immersive "Breaking News" alerts to all player screens instantly.

---

## 🚀 How to Run Locally

```bash
# 1. Clone & Install
npm install

# 2. Database Setup
npx prisma generate
npx prisma db push

# 3. Environment Variables
# Copy .env.example to .env and configure DATABASE_URL and GEMINI_API_KEY

# 4. Start Development Servers (TurboRepo)
npm run dev
```

---
---

<a name="th-thai-version"></a>

## 🇹🇭 TH: บทสรุปผู้บริหารโครงการ (Executive Summary)

**Hackanomics** คือแพลตฟอร์มจำลองสถานการณ์ทางการเงินแบบ Real-time ระดับ "Institutional Grade" ที่สร้างขึ้นเพื่อยกระดับทักษะความฉลาดทางการเงิน (Financial Literacy) และความเข้าใจด้านเศรษฐศาสตร์มหาภาค โครงการนี้เปลี่ยนการเรียนรู้น่าเบื่อให้กลายเป็นการจำลองการลงทุนที่มีความกดดันสูง โดยผู้เล่นจะต้องรับบทผู้จัดการกองทุนที่ต้องจัดสรรพอร์ตโฟลิโอท่ามกลางการเปลี่ยนแปลงของอัตราดอกเบี้ย, เงินเฟ้อ, ข่าวสารแบบสดๆ และวิกฤตเศรษฐกิจ (Black Swan)

โปรเจกต์นี้ถูกออกแบบสถาปัตยกรรมทั้งหน้าบ้านและหลังบ้านมาอย่างละเอียด โดยมุ่งเป้าพิชิตทั้งรางวัล **Technical Award** และ **Design Award** ของรายการ Hackonomics 2026

---

## 🏆 ความสอดคล้องกับเกณฑ์การตัดสิน Hackonomics 2026

### 1. ความเกี่ยวข้องกับการศึกษา (Relevancy & Education) 📚
แอปพลิเคชันสอนหลักการบริหารพอร์ตโฟลิโอแบบลงมือทำ (Learning by Doing) ผู้เล่นจะเรียนรู้ว่าเมื่อดอกเบี้ยขึ้น หุ้น Tech จะร่วงแต่ Bond จะน่าสนใจ หรือเมื่อเงินเฟ้อพุ่ง ทองคำและ Crypto จะกลายเป็นหลุมหลบภัย นอกจากนี้เมื่อจบเกม **Gemini AI** จะทำหน้าที่วิเคราะห์พอร์ตของผู้เล่นแต่ละคน และให้คำวิจารณ์แบบตรงไปตรงมา (Harsh-but-fair critique) แบบรายบุคคล

### 2. ความเป็นเลิศทางเทคนิค (Technical Execution) ⚙️ *(เป้าหมายระดับ Technical Award)*
- **สถาปัตยกรรม:** Next.js (App Router), NestJS, Prisma ORM และ PostgreSQL
- **Real-Time Sync สภาพแวดล้อม:** ใช้ State Machine 6 ขั้นตอนควบคุมการไหลของเกมผ่าน WebSockets (Socket.IO) ข้อมูลข่าวสารจะเด้งขึ้นหน้าจอผู้เล่นทุกคนพร้อมกันในเสี้ยววินาที
- **ความเสถียรระดับสูง:** ระบบมี "Token Validation Heartbeat" เพื่อจัดการ Session ที่หลุด และใช้ Database Transaction ขั้นสุดยอด (`prisma.$transaction`) เพื่อป้องกันปัญหา Race Condition เวลาผู้เล่น 50 คนกดปุ่ม Confirm ออเดอร์ในวินาทีสุดท้ายพร้อมกัน
- **Economic Pricing Engine:** คำนวณราคาสินทรัพย์ด้วยสมการอัลกอริทึมที่อิงจากตัวแปร Macro (ดอกเบี้ย/เงินเฟ้อ), ปริมาณ Demand ของผู้เล่นในห้อง, และตัวแปรสุ่ม (Noise) เพื่อความสมจริง

### 3. การออกแบบและนำเสนอ (Presentation & Design) 🎨 *(เป้าหมายระดับ Design Award)*
- **Tactical HUD Aesthetic:** ฉีกกฎ UI แบบเดิมๆ ด้วยดีไซน์ "Cyber-Finance" สไตล์ล้ำยุค ให้ความรู้สึกเหมือนกำลังเทรดอยู่ในห้องควบคุมรหัสผ่าน
- **Game Feel ระดับพรีเมียม:** ข่าว Breaking News แบบ Cinematic Full-screen, หน้าจอ "Market Closed" ที่ล็อคเครื่องผู้เล่นทันทีที่หมดเวลา, และการใช้ `requestAnimationFrame` สร้างตัวเลขวิ่ง (Ticking Numbers) แบบ 60fps ลื่นไหล
- **ระบบสี:** เขียน Custom CSS Color ฟังก์ชันด้วย `oklch()` เพื่อให้คอนทราสต์ที่ชัดเจนขั้นสุด และใช้ Fluid Framework สำหรับ Responsive ทุกหน้าจอ

### 4. ผลกระทบ (Impact) 🚀
Hackanomics ไม่ใช่แค่แอปจำลอง แต่เป็นเครื่องมือแบบ B2B Ed-Tech ที่สามารถนำไปใช้ในห้องเรียน มหาวิทยาลัย หรืองานเวิร์กชอปขององค์กรได้จริง โดยมีหน้า **Facilitator Command Center** แยกเฉพาะ ให้วิทยากรสามารถเปลี่ยนค่าเศรษฐกิจและสร้างวิกฤตได้แบบ Live

### 5. นวัตกรรม (Innovation) 💡
การประยุกต์ใช้ AI ในโปรเจกต์นี้ แตกต่างจากการใช้เป็นแชทบอททั่วไป แต่เราใช้ **Google Gemini 1.5 Flash** ในสถาปัตยกรรมแบบ Batch Processing โยนข้อมูลการเล่นทั้งหมดของทุกคนไปประมวลผลพร้อมกันใน 1 Prompt เพื่อให้ AI สวมบทบาทเป็น "ผู้เชี่ยวชาญทางการเงินที่เข้มงวด" วิจารณ์พอร์ตการลงทุน สะท้อนการประยุกต์ใช้ AI เพื่อวิเคราะห์พฤติกรรมมนุษย์เชิงลึก

---

© 2026 Aphichat Jahyo. Created for Hackonomics 2026.
