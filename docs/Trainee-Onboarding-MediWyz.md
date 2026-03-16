# MediWyz — Trainee Onboarding & Project Vision Book

> **Prepared by:** Guillaume — Technical Lead, MediWyz
> **Date:** March 2026
> **For:** Riana — AI Engineer & Full-Stack Developer

---

## Table of Contents

1. [About Me — Trainee Introduction](#1-about-me--trainee-introduction)
2. [MediWyz — Project Vision & Overview](#2-mediwyz--project-vision--overview)
3. [Current Platform Capabilities](#3-current-platform-capabilities)
4. [My Role & Responsibilities](#4-my-role--responsibilities)
5. [Roadmap of Improvements I Will Deliver](#5-roadmap-of-improvements-i-will-deliver)
6. [Advanced AI Development Plan](#6-advanced-ai-development-plan)
7. [Payment Integration — MCB Juice](#7-payment-integration--mcb-juice)
8. [Data Engineering with Python](#8-data-engineering-with-python)
9. [Advanced Backend Functionalities](#9-advanced-backend-functionalities)
10. [How I Will Execute](#10-how-i-will-execute)
11. [Why I Need This Opportunity — Indemnity Request](#11-why-i-need-this-opportunity--indemnity-request)
12. [Conclusion](#12-conclusion)

---

## 1. About Me — Trainee Introduction

### Personal Background

My name is **Riana**. I am originally from **Madagascar** and currently living in Mauritius. I am finishing my **Master's degree (MSc) in Artificial Intelligence** in Mauritius. I completed my final exams last week and I am now fully available to commit myself to this project.

### Academic Background

- **Bachelor's degree in Artificial Intelligence** — Madagascar
- **MSc in Artificial Intelligence** — Mauritius (completing)
- Strong foundation in machine learning, deep learning, natural language processing, computer vision, and data science
- **Deep expertise in RAG (Retrieval-Augmented Generation) architecture** — designing and building knowledge-grounded AI systems
- **Chatbot development** — end-to-end conversational AI systems with multi-turn context management
- **Agentic AI** — building autonomous AI agents that can reason, plan, and execute multi-step tasks
- **AI model integration** — hands-on experience integrating Claude (Anthropic), OpenAI, Groq, and open-source models (Llama, Mistral, Phi, DeepSeek, etc.)
- **Full-stack development** — TypeScript, Next.js, React, Node.js, Python, FastAPI, PostgreSQL
- Hands-on experience with Python, TensorFlow, PyTorch, scikit-learn, LangChain, LlamaIndex, and modern LLM/agent frameworks

### Current Situation

I am currently working as a **patissier (pastry chef / cake baker)** in Mauritius to make ends meet while completing my studies. While I appreciate this work and the discipline it has taught me, it is not aligned with my professional calling. My passion and expertise are in **AI Engineering and Full-Stack Development**, and I am eager to transition fully into the tech field.

I want to leave my current job to dedicate 100% of my time and energy to MediWyz — a project that aligns perfectly with my AI specialization and my desire to build technology that has a real positive impact on people's lives, particularly in healthcare.

### Why MediWyz?

- Healthcare is one of the most impactful fields where AI can save lives and improve quality of care
- MediWyz is a real product being deployed in Mauritius — not an academic exercise, but a platform that real patients and doctors will use
- The technical challenges (AI vision, LLM integration, payment systems, real-time video, data engineering) are exactly what excites me
- I want to contribute to building something meaningful for Mauritius and beyond

---

## 2. MediWyz — Project Vision & Overview

### What is MediWyz?

MediWyz is a **full-stack healthcare platform built for Mauritius** that connects patients with healthcare professionals through video consultations, appointment booking, prescription management, and AI-powered health insights.

### The Vision

To become **Mauritius' leading digital healthcare platform** — a one-stop solution where any Mauritian can:

- Find and consult a doctor, nurse, or specialist via video call from their home
- Book lab tests, order medicines, and manage prescriptions online
- Track their health with AI-powered food scanning, exercise logging, and personalized insights
- Access emergency services with one tap
- Pay seamlessly using MCB Juice, the most popular mobile payment in Mauritius

### Who Uses MediWyz?

MediWyz supports **11 user types**, each with their own dedicated dashboard:

| User Type | What They Do on MediWyz |
|-----------|------------------------|
| **Patient** | Book consultations, manage prescriptions, track health, order medicines, view lab results |
| **Doctor** | Manage appointments, write prescriptions, video consult, post health articles |
| **Nurse** | Home care bookings, patient management, health records |
| **Nanny/Childcare** | Childcare bookings, family management, activity tracking |
| **Pharmacist** | Manage inventory, process prescription orders, medicine database |
| **Lab Technician** | Process lab tests, manage results, test catalogs |
| **Emergency Worker** | Emergency dispatch, coverage zones, rapid response |
| **Insurance Rep** | Plans portfolio, claims processing, client management |
| **Corporate Admin** | Employee health benefits, company health programs |
| **Referral Partner** | Track referrals, commission earnings |
| **Regional Admin** | Manage users and providers in a geographic region |

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Node.js, Socket.IO |
| Database | PostgreSQL with Prisma ORM (80+ models) |
| AI/ML | Groq API (Llama 3.1 8B, Llama 4 Scout 17B Vision) |
| Real-time | WebRTC for video calls, Socket.IO for signaling |
| Mobile | Capacitor WebView (Android), Flutter planned |
| Hosting | Hostinger VPS (Ubuntu, Docker) |
| Payment | MCB Juice via Peach Payments API (to be integrated) |

### Scale of the Platform

- **80+ database models** covering all healthcare workflows
- **125+ API routes** for all user types and features
- **766 unit tests** across 57 test files
- **11 role-based dashboards** with unique features per user type
- **13 seed files** for demo data generation

---

## 3. Current Platform Capabilities

### What Already Works

**Healthcare Core:**
- Multi-role registration with document verification (AI-powered OCR)
- Appointment booking for doctors, nurses, nannies, lab technicians, emergency workers
- Video consultations via WebRTC (any user type pairing)
- Prescription management with refill tracking
- Medical records and health history
- Lab test booking and results management
- Emergency services dispatch
- Pharmacy integration and medicine ordering
- Insurance plan and claims management

**AI Features (Already Implemented):**
- AI health advisor chatbot (Groq Llama 3.1 8B)
- Food image recognition and nutrition estimation (Groq Llama 4 Scout 17B Vision)
- Exercise, sleep, and water intake tracking
- AI-generated personalized meal plans
- Automated health insights and pattern detection
- AI-driven document verification for registration

**Community & Social:**
- Doctor posts/articles feed with comments and likes
- User connections and professional network
- Real-time messaging between users

**Financial:**
- Wallet system with multi-level commissions (platform 5%, regional admin 10%, provider 85%)
- Transaction history and analytics
- Multiple payment method support (MCB Juice + cards)

---

## 4. My Role & Responsibilities

As the new trainee joining the MediWyz team, my responsibilities will cover four key areas:

### 4.1 — Advanced AI Development & Integration

- Enhance existing AI features with more specialized medical models
- Build predictive health analytics and risk scoring
- Implement drug interaction checking
- Develop AI-powered diagnostic support tools
- Optimize AI performance and cost efficiency

### 4.2 — Additional Backend Functionalities

- Build the MCB Juice payment integration (Peach Payments API)
- Implement advanced booking workflows (recurring appointments, waitlists)
- Build notification systems (email, SMS, push)
- Create reporting and analytics APIs
- Implement data export and compliance features

### 4.3 — Data Engineering with Python

- Build data pipelines for health metrics aggregation
- Create analytics dashboards and BI reports
- Implement ETL processes for platform insights
- Build ML model training pipelines for medical AI
- Design data warehouse for long-term health data analysis

### 4.4 — MCB Juice Payment Integration

- Integrate Peach Payments API for online MCB Juice payments
- Build payment webhook handlers and transaction tracking
- Implement refund flows and error handling
- Test in sandbox and manage go-live process

---

## 5. Roadmap of Improvements I Will Deliver

### Phase 1: Immediate Priority

| Task | Description | Impact |
|------|-------------|--------|
| MCB Juice Integration | Integrate Peach Payments API for online payments | Enables real revenue collection |
| AI Chat Enhancement | Add medical context awareness, symptom analysis | Better patient experience |
| Email/SMS Notifications | Implement transactional emails (booking confirmation, reminders) | Professional user experience |
| API Documentation | Create OpenAPI/Swagger docs for all endpoints | Easier for future developers |
| Performance Optimization | Add caching, optimize database queries, reduce API latency | Faster app for users |

### Phase 2: Advanced AI

| Task | Description | Impact |
|------|-------------|--------|
| Predictive Health Analytics | ML models to predict health risks from patient data | Early disease detection |
| Drug Interaction Checker | AI that flags dangerous medication combinations | Patient safety |
| Symptom Checker | Guided symptom assessment before consultation | Triage patients better |
| Medical Image Analysis | Analyze skin conditions, X-rays, reports from photos | Remote diagnostics |
| AI Appointment Optimizer | Predict no-shows, optimize scheduling | Better resource utilization |
| Multilingual AI Support | French and Creole support in AI chat | Accessible to all Mauritians |

### Phase 3: Data Engineering

| Task | Description | Impact |
|------|-------------|--------|
| Python Analytics Service | Build a separate Python service for data processing | Advanced analytics capability |
| Health Metrics Dashboard | Aggregated views of population health trends | Insights for regional admins |
| BI Reports | Automated weekly/monthly reports for stakeholders | Business intelligence |
| Data Export & Compliance | GDPR-compliant data export, anonymization pipelines | Legal compliance |
| ML Training Pipeline | Infrastructure to train and deploy custom medical models | Custom AI models |

### Phase 4: Advanced Backend

| Task | Description | Impact |
|------|-------------|--------|
| Recurring Appointments | Patients can book weekly/monthly follow-ups | Chronic disease management |
| Prescription Auto-Refill | Automated refill requests with pharmacy notification | Convenience for patients |
| Insurance Claims Automation | AI-assisted claims processing and validation | Faster reimbursements |
| Telemedicine Queue System | Virtual waiting room with estimated wait times | Better consultation flow |
| Advanced Search | Elasticsearch integration for provider/medicine search | Faster, smarter search |
| Multi-Currency Support | USD, EUR support for international patients | Expand market reach |

---

## 6. Advanced AI Development Plan

### 6.1 — Current AI Stack

| Feature | Model | Provider |
|---------|-------|----------|
| Health Chat | Llama 3.1 8B | Groq API |
| Food Image Recognition | Llama 4 Scout 17B (Vision) | Groq API |
| Document Verification | Llama 4 Scout 17B (Vision) | Groq API |
| OCR | Tesseract.js | Local |

### 6.2 — Planned AI Enhancements

**RAG-Powered Medical Knowledge Base**
- Build a Retrieval-Augmented Generation (RAG) system using medical literature, drug databases, and Mauritian health guidelines
- Use vector embeddings (Pinecone/Chroma/pgvector) to store and retrieve relevant medical context
- AI responses grounded in verified medical knowledge, not just LLM general knowledge
- Continuously update the knowledge base with new medical research and local health data

**Agentic AI for Patient Triage**
- Build an autonomous AI agent that can reason, plan, and execute multi-step patient assessments
- Agent asks structured follow-up questions based on symptoms
- Agent autonomously searches the medical knowledge base, cross-references with patient history
- Agent generates a preliminary assessment with confidence level and recommends the right specialist
- Sends a structured summary to the doctor before the consultation

**Multi-Model AI Integration**
- Integrate **Claude (Anthropic)** for complex medical reasoning and nuanced patient interactions
- Use **open-source models** (Llama, Mistral, DeepSeek, Phi) for cost-effective tasks (food scanning, basic chat)
- Implement **model routing** — automatically select the best model based on task complexity and cost
- Support for self-hosted models for data-sensitive medical operations

**Predictive Health Risk Scoring**
- Analyze patient's health tracker data (food, exercise, sleep, vitals)
- Combine with medical history (prescriptions, lab results, conditions)
- Generate a personalized health risk score (cardiovascular, diabetes, etc.)
- Provide actionable recommendations
- Alert doctors when risk scores change significantly

**Drug Interaction Checker**
- When a doctor writes a prescription, AI checks against existing medications
- Flags dangerous interactions with severity levels
- Suggests alternatives when interactions are found
- Cross-references with international drug databases via RAG

**Advanced Chatbot with Memory**
- Multi-session conversation memory — AI remembers past interactions with each patient
- Context-aware responses based on full patient profile (allergies, conditions, medications)
- Support for French and Creole alongside English
- Seamless handoff from AI chatbot to human doctor when needed

**Medical Document Intelligence**
- Extract structured data from lab results PDFs
- Auto-populate patient records from uploaded documents
- Detect anomalies in lab results compared to normal ranges
- Generate trend reports from multiple lab results over time

**Smart Scheduling with ML**
- Predict appointment no-show probability based on historical data
- Suggest optimal appointment times for each patient
- Auto-reschedule when cancellations occur
- Balance doctor workload across time slots

### 6.3 — Technical Approach

```
Patient Data → Python ETL Pipeline → Feature Engineering
       │
       ▼
Groq LLM (real-time chat, symptoms)
       +
Custom ML Models (risk scoring, predictions)
       +
Llama Vision (medical images, food scans)
       │
       ▼
Results → MediWyz API → Patient Dashboard
       +
Alerts → Doctor Dashboard + Notifications
```

---

## 7. Payment Integration — MCB Juice

*(Detailed in the separate MCB Juice Payment Integration Guide)*

### Summary of What I Will Build

| Component | Description |
|-----------|-------------|
| `app/api/payments/mcb-juice/route.ts` | API route to initiate MCB Juice payment via Peach Payments |
| `app/api/payments/webhook/route.ts` | Webhook handler to receive payment confirmations |
| `app/payments/callback/page.tsx` | Success/failure page shown to patient after payment |
| `components/shared/PaymentMethodForm.tsx` | Update checkout UI with MCB Juice phone number input |
| Database updates | Payment status tracking in `BillingInfo` and `WalletTransaction` tables |
| Refund API | Process refunds through Peach Payments API |
| Admin dashboard | Transaction monitoring for regional and super admins |

### Customer Payment Flow

1. Patient books consultation → arrives at checkout
2. Selects "Pay with MCB Juice"
3. Enters their 8-digit Juice phone number
4. Receives push notification on MCB Juice app
5. Authenticates with biometrics/PIN
6. Payment confirmed instantly
7. Consultation booking confirmed

---

## 8. Data Engineering with Python

### 8.1 — Why Python?

The current MediWyz codebase is 100% TypeScript. Adding a **Python data engineering layer** will enable:

- Advanced ML model training (scikit-learn, PyTorch, TensorFlow)
- Data pipeline orchestration (Apache Airflow, Prefect)
- Statistical analysis (pandas, NumPy, SciPy)
- Natural language processing for Creole/French (spaCy, Hugging Face)
- Data visualization and BI reporting (Matplotlib, Plotly)

### 8.2 — Planned Python Services

**Analytics Microservice**
- Separate Python FastAPI service running alongside MediWyz
- Connects to the same PostgreSQL database
- Processes aggregated health data for trends and insights
- Generates scheduled reports (daily, weekly, monthly)

**ML Model Training Pipeline**
- Feature engineering from patient health data
- Train custom models for Mauritius-specific health patterns
- Model versioning and deployment
- A/B testing framework for AI features

**Data Quality & Monitoring**
- Data validation checks on incoming health data
- Anomaly detection in platform metrics
- Automated alerts for data quality issues

### 8.3 — Architecture

```
┌─────────────────────────────────────────────┐
│                  MediWyz                     │
│           (Next.js / TypeScript)             │
│                                              │
│  Frontend ←→ API Routes ←→ Prisma ←→ PostgreSQL
└───────────────────────┬─────────────────────┘
                        │ Shared Database
                        │
┌───────────────────────┴─────────────────────┐
│            Python Analytics Service          │
│              (FastAPI / Python)               │
│                                              │
│  ETL Pipelines → ML Models → BI Reports     │
│  Health Scoring → Predictions → Alerts       │
└─────────────────────────────────────────────┘
```

---

## 9. Advanced Backend Functionalities

### 9.1 — What I Will Build

**Notification System**
- Email notifications (SendGrid/Resend): booking confirmations, reminders, prescription ready
- SMS notifications (Twilio): appointment reminders, emergency alerts
- Push notifications: real-time updates via Firebase Cloud Messaging
- In-app notification preferences (users control what they receive)

**Advanced Booking System**
- Recurring appointments (weekly diabetes check-ups, monthly therapy sessions)
- Waitlist management (auto-notify when slots open)
- Multi-provider bookings (lab + doctor in same session)
- Cancellation and rescheduling policies with penalty handling

**Reporting & Analytics**
- Doctor performance dashboards (consultation count, ratings, revenue)
- Platform-wide health metrics for regional admins
- Financial reports (revenue, commissions, payouts)
- Export to PDF/Excel for stakeholders

**Security & Compliance**
- Two-factor authentication (2FA) for sensitive accounts
- Audit logging for all medical record access
- Data encryption at rest for sensitive health data
- GDPR-compliant data deletion workflows

---

## 10. How I Will Execute

### My Working Methodology

| Aspect | Approach |
|--------|----------|
| **Daily** | Stand-up communication with Guillaume (Technical Lead) on progress and blockers |
| **Weekly** | Deliverable-based milestones — each week has a clear output |
| **Code Quality** | Follow existing CLAUDE.md conventions, write tests for all new features, type-check before every commit |
| **Documentation** | Document every new API, every AI prompt, every data pipeline |
| **Collaboration** | Use GitHub PRs for code review, discuss architecture decisions before implementing |

### Tools I Will Use

| Tool | Purpose |
|------|---------|
| VS Code + Claude Code | Development and AI-assisted coding |
| GitHub | Version control and code review |
| Docker | Local development matching production |
| Postman | API testing and documentation |
| Python (FastAPI) | Data engineering services |
| Jupyter Notebooks | ML model experimentation |
| Prisma Studio | Database inspection |
| Peach Payments Dashboard | Payment monitoring |

### My Commitment

- **Full-time dedication** — I will leave my current job to focus 100% on MediWyz
- **Self-driven learning** — I will proactively research and learn any new technology required
- **Ownership** — I will take full ownership of the AI, data, payment, and backend improvement tracks
- **Quality over speed** — I will deliver production-ready, tested, documented code

---

## 11. Why I Need This Opportunity — Indemnity Request

### My Current Situation

I am currently working as a **patissier (pastry chef)** in Mauritius, baking cakes and pastries to support myself financially while completing my Master's degree in AI. While I value the work ethic this job has given me, it does not align with my career path or the skills I have spent years developing.

Last week, I completed my final exams for my **MSc in Artificial Intelligence**. I am now at a turning point — ready to fully transition into the technology field where I can apply my skills in AI, machine learning, and software development to create real impact.

### Why MediWyz is the Right Opportunity

- It allows me to apply my AI expertise to a **real, deployed product** used by real people
- Healthcare AI is one of the most meaningful applications of the technology I've studied
- The project has the scale and complexity (80+ models, 11 user types, multiple AI features) to accelerate my professional growth
- I can contribute immediately and deliver measurable results from month one

### Indemnity Request: MUR 20,000/month

I am requesting an **indemnity of encouragement of approximately MUR 20,000 per month** to cover my basic living expenses while I dedicate myself full-time to MediWyz. This would allow me to:

| Expense | Estimated Monthly Cost |
|---------|----------------------|
| Rent / housing | MUR 8,000 - 10,000 |
| Food and essentials | MUR 5,000 - 6,000 |
| Transport | MUR 2,000 - 3,000 |
| Internet and phone | MUR 1,500 - 2,000 |
| **Total basic needs** | **~MUR 18,000 - 20,000** |

### What You Get in Return

For this indemnity, I will deliver:

| Deliverable | Value to MediWyz |
|-------------|-----------------|
| MCB Juice payment integration | **Enables real revenue** — patients can pay for consultations |
| Advanced AI health features | **Differentiator** — no other Mauritian platform has this |
| Python data engineering | **Business intelligence** — data-driven decisions |
| Backend enhancements | **Product maturity** — professional-grade platform |
| Full-time commitment | **Speed** — faster delivery than part-time contributors |

### I Am Flexible

While MUR 20,000 would comfortably cover my needs, **I am open to negotiation**. Even a lower amount would allow me to reduce my hours at my current job and dedicate significantly more time to MediWyz. The most important thing for me is the opportunity to work on meaningful technology and grow as an AI engineer.

### Long-Term Vision

This is not just a short-term arrangement for me. I see MediWyz as a platform with immense potential, and I want to be part of its growth story. Beyond MediWyz, I am also motivated to contribute to **other projects and applications** under the same team — whether in healthcare, fintech, or other domains where AI can create value.

---

## 12. Conclusion

### Summary

I, Riana, am a soon-to-be MSc graduate in Artificial Intelligence with a Bachelor's degree in AI from Madagascar and strong full-stack development skills. I am ready to leave my current job to dedicate 100% of my time to MediWyz. I understand the platform's vision, its architecture, and its potential. I have a clear roadmap of improvements across four key areas — AI, payments, data engineering, and backend development — and I am committed to delivering production-ready results as fast as possible.

### What I Bring to the Team

- **AI Expertise** — MSc-level knowledge in machine learning, NLP, computer vision, RAG architecture, agentic AI, and chatbot development
- **AI Model Integration** — Proven ability to integrate Claude, OpenAI, Groq, and all major open-source models (Llama, Mistral, DeepSeek, etc.)
- **Full-Stack Skills** — TypeScript, Python, React, Next.js, FastAPI, PostgreSQL
- **Passion for Healthcare** — Genuine motivation to build technology that helps people
- **Dedication** — Ready to commit full-time, fully focused, and deliver as fast as possible
- **Fresh Perspective** — New ideas and energy to push the platform forward

### My Ask

An indemnity of approximately **MUR 20,000/month** (negotiable) to allow me to leave my current job and focus entirely on accelerating MediWyz's development across AI, payments, data, and backend.

### My Promise

As soon as I start, I will prioritize and deliver rapidly:
- MCB Juice payment integration (sandbox tested and production-ready)
- Enhanced AI health chat with symptom analysis and RAG-powered medical knowledge
- Advanced chatbot with agentic AI capabilities for patient triage
- Python analytics service foundation for data engineering
- Integration of Claude and open-source AI models for specialized medical tasks
- Comprehensive API documentation for all new endpoints
- Tested, production-ready code following the project's conventions

Everything will be done as fast as possible — I understand the urgency and I am fully committed.

I am excited about this opportunity and grateful for the chance to discuss it further.

---

*Prepared for the CEO meeting — March 2026*
*MediWyz — Mauritius' Leading Healthcare Platform*
