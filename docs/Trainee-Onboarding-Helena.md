# MediWyz — Trainee Onboarding & Project Vision Book

> **Prepared by:** Guillaume — Technical Lead, MediWyz
> **Date:** March 2026
> **For:** Candy Helena — Mobile Developer & UI/UX Designer

---

## Table of Contents

1. [About Me — Trainee Introduction](#1-about-me--trainee-introduction)
2. [MediWyz — Project Vision & Overview](#2-mediwyz--project-vision--overview)
3. [Current Platform Capabilities](#3-current-platform-capabilities)
4. [My Role & Responsibilities](#4-my-role--responsibilities)
5. [Flutter Mobile App — Rewrite Plan](#5-flutter-mobile-app--rewrite-plan)
6. [Native Features Only Flutter Can Deliver](#6-native-features-only-flutter-can-deliver)
7. [UI/UX Design & Branding Improvements](#7-uiux-design--branding-improvements)
8. [SEO & Growth Strategy with Next.js](#8-seo--growth-strategy-with-nextjs)
9. [Roadmap of Deliverables](#9-roadmap-of-deliverables)
10. [How I Will Execute](#10-how-i-will-execute)
11. [Why I Need This Opportunity — Indemnity Request](#11-why-i-need-this-opportunity--indemnity-request)
12. [Conclusion](#12-conclusion)

---

## 1. About Me — Trainee Introduction

### Personal Background

My name is **Candy Helena**. I am from **Madagascar**, currently in my 4th year of a **Computer Science degree (Licence en Ingénierie Informatique)** at **IT University Andoharanofotsy, Antananarivo**. I am a junior full-stack developer passionate about building web and mobile applications that solve real-world problems.

### Academic Background

- **Licence en Ingénierie Informatique** — IT University Andoharanofotsy, Antananarivo, Madagascar (2021–2027)
- Strong foundation in object-oriented programming, software engineering, and database design
- Currently working as **Full-Stack Engineer (Apprenticeship)** at **ICHTUS IT** since November 2025

### Professional Experience

I have already shipped real production applications:

| Project | Tech Stack | Description |
|---------|-----------|-------------|
| **Point-of-Sale ERP** | Full-stack | Complete POS system with products, stock management, sales tracking, cash register and reporting |
| **Real-time Crypto Trading Platform** | Spring Boot, Vue.js, React Native, Firebase | Live trading platform with real-time data feeds |
| **ERP Module for Chocolaterie Robert** | CMADA project | Enterprise resource planning module for a major Malagasy brand |
| **Inventory & Accounting Web App** | Full-stack | Complete system for SK Distribution |

### Technical Skills

**Backend:** Java, Spring Boot, C#, .NET, Python
**Frontend:** Vue.js, React, TypeScript
**Mobile:** React Native, **Flutter**
**Databases:** PostgreSQL, MySQL, Oracle, Firebase
**Tools:** Git, GitHub, Docker, Figma, Airflow
**Design:** Logo design, typography, color palettes, UI/UX design principles
**Languages:** French (DELF 96/100), English (intermediate)

### Design & Branding Skills

Beyond development, I have strong skills in **visual design and branding**:
- Logo design and brand identity creation
- Typography selection and hierarchy
- Color palette design and accessibility
- UI component design in Figma
- Understanding of user experience principles

These skills are directly applicable to improving MediWyz's visual identity, app store presence, and overall user experience.

### Current Situation & Future Studies

I am planning to pursue a **Master's degree in Madagascar** to deepen my expertise in software engineering and mobile development. To fund my studies, I need financial support. This trainee position at MediWyz would allow me to gain real-world experience on a deployed healthcare platform while earning an indemnity that will help me continue my education.

I want to fully commit to MediWyz and apply my mobile development, design, and full-stack skills to deliver a production-quality Flutter application that serves real patients and healthcare professionals in Mauritius.

### Why MediWyz?

- It is a real deployed product used by real people in Mauritius, not an academic exercise
- The Flutter rewrite is a greenfield opportunity to build a native mobile app from scratch
- Healthcare is a meaningful domain where technology directly improves lives
- The project combines mobile development, UI/UX design, and SEO, which are all areas where I can contribute immediately
- I can work remotely from Madagascar, which fits perfectly with my studies schedule

---

## 2. MediWyz — Project Vision & Overview

### What is MediWyz?

MediWyz is a **full-stack healthcare platform built for Mauritius** that connects patients with healthcare professionals through video consultations, appointment booking, prescription management, and AI-powered health insights.

### The Vision

To become **Mauritius' leading digital healthcare platform** where any Mauritian can find a doctor, book a consultation, track their health, order medicines, and pay seamlessly from their phone.

### Who Uses MediWyz?

MediWyz supports **11 user types**, each with their own dedicated dashboard:

| User Type | What They Do |
|-----------|-------------|
| **Patient** | Book consultations, manage prescriptions, track health, order medicines |
| **Doctor** | Manage appointments, write prescriptions, video consult, post articles |
| **Nurse** | Home care bookings, patient management |
| **Nanny/Childcare** | Childcare bookings, activity tracking |
| **Pharmacist** | Manage inventory, process prescription orders |
| **Lab Technician** | Process lab tests, manage results |
| **Emergency Worker** | Emergency dispatch, rapid response |
| **Insurance Rep** | Plans portfolio, claims processing |
| **Corporate Admin** | Employee health benefits |
| **Referral Partner** | Track referrals, commission earnings |
| **Regional Admin** | Manage users and providers in a region |

### Current Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Node.js, Socket.IO |
| Database | PostgreSQL with Prisma ORM (80+ models) |
| AI | Groq API (Llama 3.1, Llama 4 Scout Vision) |
| Real-time | WebRTC video calls, Socket.IO signaling |
| Mobile (current) | Capacitor WebView (limited native access) |
| Mobile (planned) | **Flutter (my responsibility)** |
| Hosting | Hostinger VPS, Docker |

### Why Flutter is Needed

The current mobile app is a **Capacitor WebView** wrapping the Next.js website. It works but has significant limitations:

| Limitation | Impact |
|------------|--------|
| Cannot access device sensors (accelerometer, gyroscope, light) | No automatic sleep detection |
| Cannot access camera at frame level | No PPG blood pressure measurement |
| Cannot run persistent background services | No overnight tracking |
| Cannot access Android Sleep API | No AI-powered sleep detection |
| Cannot access UsageStatsManager | No screen time tracking |
| Slower performance than native | Less fluid animations and transitions |
| No offline support | App doesn't work without internet |
| Limited push notification control | Basic notification capabilities |

**Flutter solves all of these** while sharing a single codebase for Android and iOS.

---

## 3. Current Platform Capabilities

### What Already Works (Web + Capacitor)

**Healthcare:**
- Multi-role registration with AI document verification
- Appointment booking for all provider types
- Video consultations via WebRTC
- Prescription management and refill tracking
- Medical records and health history
- Lab test booking and results
- Emergency services dispatch
- Pharmacy and medicine ordering
- Insurance plans and claims

**AI Features:**
- AI health chatbot (Groq LLM)
- Food image recognition and nutrition estimation
- Exercise, sleep, and water tracking (manual)
- AI-generated meal plans
- Health insights and pattern detection

**Financial:**
- Wallet system with multi-level commissions
- MCB Juice and card payment support (UI ready, integration in progress)

**Community:**
- Doctor posts/articles feed
- User connections and messaging
- Real-time notifications

---

## 4. My Role & Responsibilities

### Primary: Flutter Mobile App Rewrite

Rewrite the entire MediWyz mobile experience as a **native Flutter application** that delivers smooth performance, native device access, and features impossible in a WebView.

### Secondary: UI/UX Design & Branding

Improve the visual design, branding consistency, and user experience across the platform using my design skills (Figma, typography, color systems).

### Tertiary: SEO & Growth

Leverage Next.js capabilities to improve search engine optimization and organic user acquisition for the web platform.

---

## 5. Flutter Mobile App — Rewrite Plan

### 5.1 — Architecture

```
┌─────────────────────────────────────┐
│         Flutter Mobile App           │
│  (Android + iOS from single code)    │
├─────────────────────────────────────┤
│  UI Layer (Material Design 3)        │
│  State Management (Riverpod/Bloc)    │
│  Navigation (GoRouter)              │
├─────────────────────────────────────┤
│  Service Layer                       │
│  ├── API Client (Dio/HTTP)          │
│  ├── Auth Service (JWT + Secure)    │
│  ├── WebRTC Service (video calls)   │
│  ├── Socket.IO Service (real-time)  │
│  ├── Camera/PPG Service             │
│  ├── Sleep Detection Service        │
│  └── Push Notification Service      │
├─────────────────────────────────────┤
│  Platform Channels                   │
│  ├── Google Sleep API               │
│  ├── UsageStatsManager              │
│  ├── Health Connect API             │
│  └── Biometric Auth                 │
├─────────────────────────────────────┤
│  Local Storage                       │
│  ├── SQLite (offline data)          │
│  ├── Secure Storage (tokens)        │
│  └── Hive (cached content)          │
└─────────────────────────────────────┘
              │
              │ REST API + WebSocket
              ▼
┌─────────────────────────────────────┐
│       MediWyz Backend (existing)     │
│    Next.js API + Socket.IO + DB      │
└─────────────────────────────────────┘
```

### 5.2 — Screens to Build

**Authentication:**
- Splash screen with MediWyz branding
- Login (phone/email + password)
- Registration (multi-step, all 11 user types)
- Forgot password

**Patient Dashboard:**
- Home/Feed with health summary
- Doctor search and booking
- Video consultation room
- Prescriptions list and details
- Lab results
- Health tracker (food, exercise, sleep, water)
- AI chatbot
- Medicine ordering
- Emergency services
- Profile and settings
- MCB Juice payment checkout

**Provider Dashboards (Doctor, Nurse, Pharmacist, etc.):**
- Appointment management
- Patient list
- Video consultation
- Messaging
- Earnings and billing
- Profile and settings

**Shared:**
- Real-time messaging
- Notifications center
- Network/connections
- Settings (security, notifications, documents)

### 5.3 — Key Flutter Packages

| Package | Purpose |
|---------|---------|
| `flutter_riverpod` or `flutter_bloc` | State management |
| `go_router` | Navigation and deep linking |
| `dio` | HTTP client for API calls |
| `socket_io_client` | Real-time communication |
| `flutter_webrtc` | Video consultations |
| `camera` | Camera access for PPG and food scanning |
| `firebase_messaging` | Push notifications |
| `flutter_local_notifications` | Local notifications |
| `flutter_secure_storage` | Secure token storage |
| `sqflite` | Offline SQLite database |
| `screen_state` | Screen on/off detection |
| `flutter_background_service` | Background services |
| `health` | Google Health Connect integration |
| `local_auth` | Biometric authentication |
| `image_picker` | Photo capture and gallery |
| `fl_chart` | Health data charts and graphs |

---

## 6. Native Features Only Flutter Can Deliver

### 6.1 — Automatic Sleep Tracking

**How it works:**
1. App registers with **Google Sleep API** which uses device light and motion sensors
2. Sleep API runs an on-device AI model to detect when user falls asleep
3. Screen off event at night is logged as estimated bedtime
4. Screen on event in the morning is logged as estimated wake time
5. App calculates sleep duration automatically
6. On morning wake up, app shows a "Good morning" card with sleep summary
7. Data syncs to MediWyz backend when connected to internet

**User sees:** "Good morning! You slept approximately 7h 23m last night. Quality: Good."

### 6.2 — Screen Time Tracking

**How it works:**
1. App uses Android's **UsageStatsManager** API (with user permission)
2. Tracks total screen on time throughout the day
3. Tracks per-app usage breakdowns
4. Generates daily insights ("You spent 4h 30m on your phone today")
5. AI suggests reducing screen time if patterns show excessive use
6. Correlates screen time with sleep quality

### 6.3 — Blood Pressure Estimation (PPG)

**How it works:**
1. User places fingertip over rear camera + flash LED
2. Flutter `camera` package captures 30 seconds of video
3. Extract red channel from each frame to build PPG waveform
4. Apply Butterworth band-pass filter (0.5-8 Hz) to clean signal
5. AI/ML model analyzes waveform to estimate systolic/diastolic BP
6. Display result with confidence level
7. Medical disclaimer shown ("for informational purposes, not a medical device")

### 6.4 — Offline Support

**How it works:**
1. Cache essential data locally in SQLite (appointments, prescriptions, health records)
2. Users can view their health data without internet
3. New entries (food log, exercise) saved locally and synced when online
4. Appointment details available offline
5. Graceful degradation with clear offline indicators

### 6.5 — Biometric Authentication

**How it works:**
1. Login with fingerprint or face recognition instead of typing password every time
2. Secure storage of JWT tokens using device keychain
3. Re-authenticate for sensitive actions (viewing medical records, making payments)

---

## 7. UI/UX Design & Branding Improvements

### 7.1 — What I Will Improve

| Area | Current State | Planned Improvement |
|------|--------------|-------------------|
| App icon | Basic pulse line | Professional branded icon with multiple variants |
| Splash screen | Simple spinner | Animated MediWyz logo with brand colors |
| Color system | Functional but inconsistent | Unified design tokens, accessible contrast ratios |
| Typography | Default Inter font | Curated type scale with clear hierarchy |
| Illustrations | None | Custom healthcare illustrations for empty states |
| App Store listing | Not published | Optimized screenshots, description, keywords |
| Dark mode | Not available | Full dark mode support |
| Animations | Basic transitions | Smooth page transitions, micro-interactions |
| Onboarding | None | First-time user onboarding flow with feature highlights |

### 7.2 — Design System

I will create a **MediWyz Design System** in Figma:
- Color palette (primary, secondary, semantic, neutral)
- Typography scale (headings, body, captions)
- Component library (buttons, cards, inputs, modals)
- Icon set (consistent healthcare icons)
- Spacing and layout grid
- Dark mode variants

This design system ensures consistency between the web platform and the Flutter app.

---

## 8. SEO & Growth Strategy with Next.js

### 8.1 — SEO Improvements for the Web Platform

Using my Next.js and frontend knowledge, I will also contribute to:

| SEO Task | Description |
|----------|-------------|
| Meta tags optimization | Dynamic meta titles, descriptions for each page |
| Structured data (JSON-LD) | Medical organization, doctor profiles, service schema |
| Sitemap generation | Dynamic sitemap for all public pages |
| Open Graph tags | Rich previews when sharing on social media |
| Image optimization | Next.js Image component with proper alt text |
| Core Web Vitals | Optimize LCP, FID, CLS scores |
| Doctor profile pages | SEO-friendly public doctor profiles for Google indexing |
| Blog/articles section | Doctor posts indexed for organic healthcare searches |
| Local SEO | Mauritius-specific keywords, Google Business integration |

### 8.2 — App Store Optimization (ASO)

When the Flutter app is ready for Google Play and App Store:
- Optimized app title and description with healthcare keywords
- Professional screenshots showing key features
- Feature graphic and promotional video
- Localized listing (English + French)
- Keywords targeting Mauritius healthcare searches

---

## 9. Roadmap of Deliverables

### Phase 1: Foundation

| Task | Description |
|------|-------------|
| Flutter project setup | Architecture, state management, navigation, API client |
| Authentication flow | Login, register, forgot password with biometric support |
| Patient home screen | Dashboard with health summary, upcoming appointments |
| API integration layer | Connect to all existing MediWyz backend endpoints |
| Design system | Figma components + Flutter theme implementation |

### Phase 2: Core Features

| Task | Description |
|------|-------------|
| Doctor search and booking | Search, filter, view profile, book appointment |
| Video consultation | WebRTC integration in Flutter |
| Health tracker | Food diary, exercise, sleep, water (manual + AI scan) |
| Messaging | Real-time chat with Socket.IO |
| Notifications | Push notifications via Firebase |
| MCB Juice payment | Payment checkout flow |

### Phase 3: Native-Only Features

| Task | Description |
|------|-------------|
| Automatic sleep tracking | Google Sleep API + screen state detection |
| Screen time tracking | UsageStatsManager integration |
| Blood pressure PPG | Camera-based PPG measurement |
| Offline mode | SQLite caching for offline access |
| Biometric auth | Fingerprint/face login |

### Phase 4: Polish & Launch

| Task | Description |
|------|-------------|
| Dark mode | Full dark mode support |
| Animations | Smooth transitions and micro-interactions |
| SEO improvements | Web platform meta tags, structured data, sitemap |
| App Store submission | Google Play + Apple App Store listing |
| Performance optimization | Profiling and optimization for smooth 60fps |

---

## 10. How I Will Execute

### Working Methodology

| Aspect | Approach |
|--------|----------|
| **Daily** | Communication with Guillaume (Technical Lead) on progress and blockers |
| **Weekly** | Deliverable-based milestones with clear outputs |
| **Code Quality** | Clean architecture, tests, consistent naming conventions |
| **Design** | Figma mockups before implementation, design review with team |
| **Collaboration** | GitHub PRs for code review, branches per feature |
| **Remote** | Work from Madagascar, available during Mauritius business hours |

### Tools I Will Use

| Tool | Purpose |
|------|---------|
| Flutter + Dart | Mobile app development |
| Figma | UI/UX design and prototyping |
| VS Code | Code editor |
| GitHub | Version control and code review |
| Firebase | Push notifications and analytics |
| Postman | API testing |
| Android Studio | Android build and testing |
| Xcode (if available) | iOS build and testing |

### My Commitment

- **Full dedication** to delivering a production-quality Flutter app
- **Design-driven development** with mockups before code
- **Ownership** of the entire mobile experience from design to deployment
- **Proactive communication** with the team on progress and challenges
- **Quality over shortcuts** with tested, maintainable code

---

## 11. Why I Need This Opportunity — Indemnity Request

### My Situation

I am a 4th-year Computer Science student in Madagascar planning to pursue a **Master's degree** to further specialize in software engineering and mobile development. To fund my future studies, I need financial support.

This trainee position at MediWyz is the perfect bridge between my current studies and my Master's. It gives me real-world production experience while helping me save for my education.

### Indemnity Request: MUR 14,000 — 18,000/month

I am requesting an **indemnity of encouragement between MUR 14,000 and MUR 18,000 per month** to support my living expenses and future study savings.

This would cover:

| Expense | Estimated Monthly Cost |
|---------|----------------------|
| Rent and living expenses (Madagascar) | MUR 5,000 - 7,000 |
| Food and essentials | MUR 3,000 - 4,000 |
| Internet (required for remote work) | MUR 2,000 - 2,500 |
| Transport and utilities | MUR 1,500 - 2,000 |
| Savings for Master's studies | Remainder |
| **Total basic needs** | **~MUR 14,000 - 18,000** |

### What You Get in Return

| Deliverable | Value to MediWyz |
|-------------|-----------------|
| Complete Flutter app (Android + iOS) | Native mobile presence with smooth performance |
| Native features (sleep tracking, PPG, offline) | Features impossible with current WebView, strong market differentiator |
| UI/UX design system | Professional, consistent brand across web and mobile |
| SEO improvements | More organic users finding MediWyz on Google |
| App Store publication | MediWyz on Google Play and Apple App Store |
| Design skills | Professional app icon, illustrations, marketing materials |

### I Am Flexible

While MUR 18,000 would allow me to focus fully on MediWyz and save for my Master's, **I am open to discussion**. Even the lower end of MUR 14,000 would help me dedicate significant time to the project. The most important thing for me is the opportunity to work on a real deployed product, gain production experience, and build something meaningful.

### Long-Term Vision

I see this as the beginning of a long-term collaboration. Beyond MediWyz, I am eager to contribute to other projects and applications under the same team. My combined skills in mobile development, UI/UX design, and full-stack engineering make me a versatile contributor for any future product.

---

## 12. Conclusion

### Summary

I am Candy Helena, a junior full-stack developer from Madagascar with hands-on experience shipping real applications (POS ERP, crypto trading platform, enterprise modules). I have strong skills in Flutter, React Native, UI/UX design, and front-end SEO optimization. I am ready to take full ownership of the MediWyz Flutter mobile app rewrite, delivering a native experience with features that are impossible in the current WebView version, including automatic sleep tracking, blood pressure estimation, screen time insights, and offline support.

### What I Bring to the Team

- **Flutter & Mobile Expertise** — React Native and Flutter experience with shipped production apps
- **UI/UX Design** — Logo, typography, color palettes, Figma prototyping
- **Full-Stack Skills** — Java, Spring Boot, Vue.js, React, TypeScript, Python, PostgreSQL
- **SEO Knowledge** — Next.js optimization, meta tags, structured data, app store optimization
- **Shipped Products** — Real production apps for real businesses (not just academic projects)
- **Design Eye** — Ability to improve branding, visual consistency, and user experience
- **Dedication** — Ready to commit fully and deliver as fast as possible

### My Ask

An indemnity of **MUR 14,000 — 18,000/month** to support my living expenses and future Master's studies while I dedicate myself to building the MediWyz Flutter app and improving the platform's design and SEO.

### My Promise

As soon as I start, I will deliver rapidly:
- Flutter project architecture with clean state management and API layer
- Authentication flow with biometric support
- Patient home dashboard connected to the live MediWyz backend
- Figma design system with MediWyz brand components
- First APK build for internal testing
- SEO quick wins on the existing web platform

I am excited about this opportunity and grateful for the chance to contribute to MediWyz.

---

*Prepared for the CEO meeting — March 2026*
*MediWyz — Mauritius' Leading Healthcare Platform*
