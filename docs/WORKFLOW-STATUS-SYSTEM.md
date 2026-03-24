# MediWyz — Workflow & Status System Design

> **Purpose**: Define all role-based workflows, statuses, actions, and notification messages for the entire platform. This document serves as the specification for a **configurable workflow engine** where providers and regional admins can create custom workflows with custom names and notification messages.
>
> **Status**: Planning phase — to be implemented later.
>
> **Date**: 2026-03-20

---

## Table of Contents

1. [All User Roles](#1-all-user-roles)
2. [Workflow Definitions by Role](#2-workflow-definitions-by-role)
3. [Cross-Role Transversal Statuses](#3-cross-role-transversal-statuses)
4. [Configurable Workflow Engine](#4-configurable-workflow-engine)
5. [Feasibility Analysis](#5-feasibility-analysis)
6. [Proposed Database Schema](#6-proposed-database-schema)
7. [API Design](#7-api-design)
8. [Notification System Integration](#8-notification-system-integration)

---

## 1. All User Roles

| # | Role | URL Prefix | UserType | Default Fee |
|---|------|-----------|----------|-------------|
| 1 | Patient | `/patient/` | PATIENT | — |
| 2 | Docteur | `/doctor/` | DOCTOR | varies |
| 3 | Infirmier(e) | `/nurse/` | NURSE | varies |
| 4 | Nanny | `/nanny/` | NANNY | varies |
| 5 | Pharmacien | `/pharmacist/` | PHARMACIST | varies |
| 6 | Technicien Labo | `/lab-technician/` | LAB_TECHNICIAN | 500 Rs |
| 7 | Urgentiste | `/responder/` | EMERGENCY_WORKER | free |
| 8 | Assureur | `/insurance/` | INSURANCE_REP | — |
| 9 | Admin Corporate | `/corporate/` | CORPORATE_ADMIN | — |
| 10 | Partenaire Referent | `/referral-partner/` | REFERRAL_PARTNER | — |
| 11 | Admin Regional | `/regional/` | REGIONAL_ADMIN | — |
| 12 | Caregiver | `/caregiver/` | CAREGIVER | 600 Rs |
| 13 | Physiotherapeute | `/physiotherapist/` | PHYSIOTHERAPIST | 800 Rs |
| 14 | Dentiste | `/dentist/` | DENTIST | 800 Rs |
| 15 | Optometriste | `/optometrist/` | OPTOMETRIST | 800 Rs |
| 16 | Nutritionniste | `/nutritionist/` | NUTRITIONIST | 1000 Rs |
| 17 | Super Admin | `/admin/` | env-based | — |

---

## 2. Workflow Definitions by Role

### Legend

- `[P]` = Patient action | `[PR]` = Provider action | `[SYS]` = System/auto
- Each table row = one status step with: status code, who sees it, available action buttons, display message, and detail fields
- Modes: Office / Home / Video

---

### 2.1 DOCTOR

#### Workflow A — General Consultation

**Office:**
```
pending → confirmed → waiting_room → in_consultation → writing_prescription → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel, Reschedule | "Demande de consultation envoyee" | Reason, specialty, requested date |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle demande de consultation" | Patient name, history, reason |
| 2 | `confirmed` | [P] | Cancel, Reschedule | "Consultation confirmee — X Rs debites" | Office address, date, time |
| 2 | `confirmed` | [PR] | Cancel | "Consultation planifiee" | Patient file accessible |
| 3 | `waiting_room` | [P] | — | "Vous etes en salle d'attente" | Queue position, estimated wait |
| 3 | `waiting_room` | [PR] | **Start Consultation** | "Patient en salle d'attente" | Name, arrival time |
| 4 | `in_consultation` | [P] | — | "Consultation en cours" | — |
| 4 | `in_consultation` | [PR] | **End**, Write Prescription | "Consultation en cours" | Notes, diagnosis |
| 5 | `writing_prescription` | [P] | — | "Le docteur redige votre ordonnance" | — |
| 5 | `writing_prescription` | [PR] | **Send Prescription**, Complete Without | "Redaction ordonnance" | Medications, dosage, duration |
| 6 | `completed` | [P] | View Prescription, Leave Review, Book Follow-up | "Consultation terminee" | Prescription PDF, diagnosis, notes |
| 6 | `completed` | [PR] | — | "Consultation terminee" | Act summary |

**Home:**
```
pending → confirmed → doctor_travelling → doctor_arrived → in_consultation → writing_prescription → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel, Reschedule | "Demande de visite a domicile envoyee" | Address, reason, access info (floor, code) |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle demande visite a domicile" | Patient address, estimated distance |
| 2 | `confirmed` | [P] | Cancel, Reschedule | "Visite confirmee — X Rs debites" | Date, time slot |
| 2 | `confirmed` | [PR] | **Depart**, Cancel | "Visite a domicile planifiee" | Address, route |
| 3 | `doctor_travelling` | [P] | — | "Le docteur est en deplacement vers vous" | ETA |
| 3 | `doctor_travelling` | [PR] | **Arrived** | "En deplacement vers le patient" | GPS nav, patient contact |
| 4 | `doctor_arrived` | [P] | — | "Le docteur est arrive" | — |
| 4 | `doctor_arrived` | [PR] | **Start Consultation** | "Arrive chez le patient" | — |
| 5 | `in_consultation` | [P] | — | "Consultation en cours" | — |
| 5 | `in_consultation` | [PR] | **End**, Write Prescription | "Consultation en cours" | Notes, diagnosis |
| 6 | `writing_prescription` | [P] | — | "Le docteur redige votre ordonnance" | — |
| 6 | `writing_prescription` | [PR] | **Send Prescription** | "Redaction ordonnance" | Medications, dosage |
| 7 | `completed` | [P] | View Prescription, Leave Review | "Visite terminee" | Prescription, diagnosis |

**Video:**
```
pending → confirmed → call_ready → in_call → writing_prescription → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel, Reschedule | "Demande de teleconsultation envoyee" | Reason, date |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle demande teleconsultation" | Patient name, reason |
| 2 | `confirmed` | [P] | Cancel, Reschedule | "Teleconsultation confirmee — X Rs debites" | Date, time, video link |
| 3 | `call_ready` | [P] | **Join Call** | "La salle d'appel est prete" | Video link, test mic/camera |
| 3 | `call_ready` | [PR] | **Join Call** | "Salle prete — patient en attente" | Video link |
| 4 | `in_call` | [P] | Hang Up | "Consultation video en cours" | Duration, connection quality |
| 4 | `in_call` | [PR] | **End Call**, Write Prescription | "Appel en cours" | Real-time notes |
| 5 | `writing_prescription` | [P] | — | "Le docteur redige votre ordonnance" | — |
| 5 | `writing_prescription` | [PR] | **Send Prescription** | "Redaction ordonnance" | Medications, dosage |
| 6 | `completed` | [P] | View Prescription, Leave Review | "Teleconsultation terminee" | Prescription PDF, notes |

#### Workflow B — Surgery / Medical Procedure

**Office only:**
```
pending → confirmed → pre_op_assessment → ready_for_procedure → in_procedure → post_op_observation → recovery_instructions → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de procedure envoyee" | Procedure type, reason |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle demande de procedure" | Patient file, procedure type |
| 2 | `confirmed` | [P] | Cancel | "Procedure confirmee — X Rs debites" | Date, pre-op instructions (fasting etc.) |
| 3 | `pre_op_assessment` | [P] | — | "Evaluation pre-operatoire en cours" | Required lab results |
| 3 | `pre_op_assessment` | [PR] | **Patient Ready**, Postpone | "Evaluation du patient" | Vitals, allergies, consent |
| 4 | `ready_for_procedure` | [P] | — | "Pret pour l'intervention" | — |
| 4 | `ready_for_procedure` | [PR] | **Start Procedure** | "Patient pret" | Surgical checklist |
| 5 | `in_procedure` | [P] | — | "Intervention en cours" | Type, estimated duration |
| 5 | `in_procedure` | [PR] | **End Procedure** | "Procedure en cours" | Operative notes |
| 6 | `post_op_observation` | [P] | — | "Observation post-operatoire" | Signs to watch |
| 6 | `post_op_observation` | [PR] | **Discharge Patient** | "Observation en cours" | Vitals, complications |
| 7 | `recovery_instructions` | [P] | View Instructions | "Instructions de recuperation envoyees" | Post-op care, follow-up appt, medications |
| 7 | `recovery_instructions` | [PR] | **Complete** | "Envoi instructions post-op" | Prescription, follow-up scheduled |
| 8 | `completed` | [P] | Book Follow-up, Leave Review | "Procedure terminee" | Operative report |

#### Workflow C — Diagnostic / Health Checkup

**Office:**
```
pending → confirmed → check_in → examination → awaiting_results → results_ready → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de bilan envoyee" | Checkup type |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle demande de bilan" | Patient, checkup type |
| 2 | `confirmed` | [P] | Cancel | "Bilan confirme — X Rs debites" | Required prep (fasting etc.) |
| 3 | `check_in` | [PR] | **Start Examination** | "Patient enregistre" | — |
| 4 | `examination` | [P] | — | "Examen en cours" | — |
| 4 | `examination` | [PR] | **Send to Lab**, **Direct Results** | "Examen en cours" | Measurements, observations |
| 5 | `awaiting_results` | [P] | — | "En attente des resultats" | Estimated delay |
| 5 | `awaiting_results` | [PR] | **Enter Results** | "Resultats en attente" | — |
| 6 | `results_ready` | [P] | **View Results**, Download PDF | "Resultats de bilan disponibles" | Values, norms, interpretation |
| 6 | `results_ready` | [PR] | **Complete** | "Resultats envoyes au patient" | — |
| 7 | `completed` | [P] | Book Follow-up | "Bilan termine" | Full summary |

#### Workflow D — Follow-up

**Video (most common for follow-ups):**
```
pending → confirmed → call_ready → in_call → follow_up_notes → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de suivi envoyee" | Previous consultation referenced |
| 2 | `confirmed` | [P] | Join | "Suivi confirme" | Link to previous file |
| 3 | `call_ready` | Both | **Join Call** | "Salle prete" | — |
| 4 | `in_call` | [PR] | **End** | "Appel suivi en cours" | Evolution notes |
| 5 | `follow_up_notes` | [P] | — | "Le docteur finalise les notes de suivi" | — |
| 5 | `follow_up_notes` | [PR] | **Complete**, Renew Prescription | "Redaction notes de suivi" | Evolution, treatment adjustment |
| 6 | `completed` | [P] | View Notes, Book Next Follow-up | "Suivi termine" | Notes, updated prescription |

---

### 2.2 NURSE

#### Workflow A — General Care (injection, bandage, blood draw)

**Office:**
```
pending → confirmed → check_in → preparing_care → in_care → post_care_notes → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de soins envoyee" | Care type, prescription attached |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle demande de soins" | Patient, care type, prescription |
| 2 | `confirmed` | [P] | Cancel, Reschedule | "Soins confirmes — X Rs debites" | Office address, time |
| 3 | `check_in` | [PR] | **Prepare Care** | "Patient arrive" | — |
| 4 | `preparing_care` | [P] | — | "Preparation des soins en cours" | — |
| 4 | `preparing_care` | [PR] | **Start Care** | "Preparation materiel" | Verify prescription, allergies |
| 5 | `in_care` | [P] | — | "Soins en cours" | Act type |
| 5 | `in_care` | [PR] | **End Care** | "Acte en cours" | Care notes |
| 6 | `post_care_notes` | [PR] | **Complete** | "Redaction notes de soins" | Observations, next care |
| 7 | `completed` | [P] | View Notes, Leave Review | "Soins termines" | Care report, next appt if series |

**Home:**
```
pending → confirmed → nurse_travelling → nurse_arrived → preparing_care → in_care → post_care_notes → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de soins a domicile envoyee" | Address, floor, access code |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle demande soins a domicile" | Distance, care type |
| 2 | `confirmed` | [P] | Cancel, Reschedule | "Soins a domicile confirmes — X Rs" | Date, slot |
| 3 | `nurse_travelling` | [P] | — | "Infirmier(e) en deplacement vers vous" | ETA |
| 3 | `nurse_travelling` | [PR] | **Arrived** | "En route vers le patient" | Navigation, contact |
| 4 | `nurse_arrived` | [P] | — | "L'infirmier(e) est arrive(e)" | — |
| 4 | `nurse_arrived` | [PR] | **Prepare Care** | "Arrive(e) chez le patient" | — |
| 5 | `preparing_care` | [PR] | **Start Care** | "Preparation" | Verify prescription |
| 6 | `in_care` | [PR] | **End Care** | "Acte en cours" | — |
| 7 | `post_care_notes` | [PR] | **Complete** | "Redaction notes" | Observations |
| 8 | `completed` | [P] | View Notes, Leave Review | "Soins termines" | Report |

**Video (advice, post-care follow-up):**
```
pending → confirmed → call_ready → in_call → care_notes → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de teleconsultation infirmier envoyee" | Reason |
| 2 | `confirmed` | [P] | Reschedule | "Confirme — X Rs debites" | Video link |
| 3 | `call_ready` | Both | **Join** | "Salle prete" | — |
| 4 | `in_call` | [PR] | **End** | "Appel en cours" | Advice, observations |
| 5 | `care_notes` | [PR] | **Complete** | "Redaction notes" | Follow-up instructions |
| 6 | `completed` | [P] | View Notes | "Teleconsultation terminee" | Notes, recommendations |

#### Workflow B — Sample Collection & Lab Delivery

**Home:**
```
pending → confirmed → nurse_travelling → nurse_arrived → sample_collection → sample_collected → sample_delivering_to_lab → sample_delivered → awaiting_results → results_ready → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de prelevement envoyee" | Sample type, prescription |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle demande de prelevement" | Type, prescription attached |
| 2 | `confirmed` | [P] | Cancel | "Prelevement confirme — X Rs" | Instructions (fasting etc.) |
| 3 | `nurse_travelling` | [P] | — | "Infirmier(e) en route" | ETA |
| 4 | `nurse_arrived` | [P] | — | "Infirmier(e) arrive(e)" | — |
| 5 | `sample_collection` | [P] | — | "Prelevement en cours" | — |
| 5 | `sample_collection` | [PR] | **Sample Collected** | "Collecte en cours" | Sample type, tubes |
| 6 | `sample_collected` | [P] | — | "Prelevement effectue" | — |
| 6 | `sample_collected` | [PR] | **Depart to Lab** | "Echantillon collecte" | Labeling, conservation |
| 7 | `sample_delivering_to_lab` | [P] | — | "Echantillon en transit vers le laboratoire" | Lab destination |
| 7 | `sample_delivering_to_lab` | [PR] | **Delivered to Lab** | "En route vers le labo" | — |
| 8 | `sample_delivered` | [P] | — | "Echantillon depose au laboratoire" | Estimated results delay |
| 9 | `awaiting_results` | [P] | — | "Analyse en cours au laboratoire" | — |
| 10 | `results_ready` | [P] | **View Results** | "Resultats disponibles" | Results, values, norms |
| 11 | `completed` | [P] | Download, Book Follow-up | "Prelevement termine" | PDF results |

#### Workflow C — Post-Operative Home Care

**Home:**
```
pending → confirmed → nurse_travelling → nurse_arrived → wound_assessment → wound_care → post_care_notes → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1-4 | *(same as home travel steps)* | | | | |
| 5 | `wound_assessment` | [PR] | **Start Care** | "Evaluation de la plaie" | Healing state, photos |
| 6 | `wound_care` | [PR] | **End** | "Soins de plaie en cours" | Bandage, disinfection |
| 7 | `post_care_notes` | [PR] | **Complete**, Alert Doctor | "Notes de suivi" | Evolution, infection signs |
| 8 | `completed` | [P] | View Notes | "Soins post-op termines" | Next appt, alerts |

---

### 2.3 NANNY

#### Workflow A — Standard Childcare

**Home (primary mode):**
```
pending → confirmed → nanny_travelling → nanny_arrived → children_handover → in_care → care_update → children_return → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de garde envoyee" | Children names, ages, instructions |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle demande de garde" | Nb children, duration, special instructions |
| 2 | `confirmed` | [P] | Cancel, Reschedule | "Garde confirmee — X Rs debites" | Date, duration (120min default) |
| 3 | `nanny_travelling` | [P] | — | "La nounou est en route" | ETA |
| 3 | `nanny_travelling` | [PR] | **Arrived** | "En route" | Navigation |
| 4 | `nanny_arrived` | [P] | — | "La nounou est arrivee" | — |
| 4 | `nanny_arrived` | [PR] | **Handover** | "Arrive(e)" | — |
| 5 | `children_handover` | [P] | — | "Prise en charge des enfants" | — |
| 5 | `children_handover` | [PR] | **Start Care** | "Verification instructions" | Allergies, medications, emergency contacts |
| 6 | `in_care` | [P] | — | "Garde en cours" | — |
| 6 | `in_care` | [PR] | **Send Update**, **End** | "Garde en cours" | Duration timer |
| 7 | `care_update` | [P] | — | "Mise a jour de la nounou" | Photo, activity, meal, nap |
| 7 | `care_update` | [PR] | **Continue Care** | "Mise a jour envoyee" | — |
| 8 | `children_return` | [P] | **Confirm Return** | "Enfants rendus au parent" | — |
| 8 | `children_return` | [PR] | **Complete** | "Remise des enfants" | Day summary |
| 9 | `completed` | [P] | Leave Review | "Garde terminee" | Activities summary, meals, naps |

**Office (daycare center):**
```
pending → confirmed → check_in → children_handover → in_care → care_update → children_return → completed
```

*(Same steps without travel)*

**Video (parenting advice, development follow-up):**
```
pending → confirmed → call_ready → in_call → recommendations → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de consultation parentalite" | Topic, child age |
| 2 | `confirmed` | [P] | Reschedule | "Confirme — X Rs" | Video link |
| 3 | `call_ready` | Both | **Join** | "Salle prete" | — |
| 4 | `in_call` | [PR] | **End** | "Consultation en cours" | — |
| 5 | `recommendations` | [PR] | **Complete** | "Redaction recommandations" | Development advice, nutrition |
| 6 | `completed` | [P] | View Recommendations | "Consultation terminee" | PDF recommendations |

#### Workflow B — Child Emergency

**Home:**
```
pending → confirmed → nanny_travelling → nanny_arrived → child_assessment → first_aid → escalation_decision → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1-4 | *(same as home travel)* | | | | |
| 5 | `child_assessment` | [PR] | **First Aid**, **Call Emergency** | "Evaluation de l'enfant" | Symptoms, state |
| 6 | `first_aid` | [PR] | **Resolved**, **Escalate** | "Premiers soins en cours" | Acts performed |
| 7 | `escalation_decision` | [PR] | **Complete**, **Transfer to Emergency** | "Decision d'escalade" | Hospitalization needed? |
| 8 | `completed` | [P] | View Report | "Intervention terminee" | Detailed report, recommendations |

---

### 2.4 LAB TECHNICIAN

#### Workflow A — Lab Test (sample at lab)

**Office:**
```
pending → confirmed → check_in → sample_collection → sample_processing → analysis_in_progress → quality_check → results_ready → results_validated → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de test envoyee" | Test name, prescription attached |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle demande de test" | Test type, required sample |
| 2 | `confirmed` | [P] | Cancel | "Test confirme — X Rs debites" | Date, prep (fasting 12h etc.) |
| 3 | `check_in` | [PR] | **Collect Sample** | "Patient arrive" | Identity verification |
| 4 | `sample_collection` | [P] | — | "Prelevement en cours" | Sample type |
| 4 | `sample_collection` | [PR] | **Sample Collected** | "Collecte en cours" | Tubes, labeling |
| 5 | `sample_processing` | [P] | — | "Echantillon en traitement" | — |
| 5 | `sample_processing` | [PR] | **Start Analysis** | "Preparation echantillon" | Centrifugation, preparation |
| 6 | `analysis_in_progress` | [P] | — | "Analyse en cours" | Estimated delay |
| 6 | `analysis_in_progress` | [PR] | **Enter Results** | "Analyse en cours" | Machine, method |
| 7 | `quality_check` | [P] | — | "Controle qualite en cours" | — |
| 7 | `quality_check` | [PR] | **Validate**, **Redo Analysis** | "Verification resultats" | Values, norms, anomalies |
| 8 | `results_ready` | [P] | **View Results** | "Resultats preliminaires disponibles" | Values, norms, flagged |
| 8 | `results_ready` | [PR] | **Validate & Send** | "Resultats prets" | Technician comments |
| 9 | `results_validated` | [P] | Download PDF, Share with Doctor | "Resultats valides" | Official PDF with signature |
| 9 | `results_validated` | [PR] | **Complete** | "Resultats valides et envoyes" | — |
| 10 | `completed` | [P] | Book Doctor Follow-up | "Test termine" | Archived results |

#### Workflow B — Home Sample Collection

**Home:**
```
pending → confirmed → tech_travelling → tech_arrived → sample_collection → sample_collected → sample_in_transit → sample_received_at_lab → analysis_in_progress → quality_check → results_ready → results_validated → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de prelevement a domicile" | Test, prescription |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle demande prelevement domicile" | Distance, test type |
| 2 | `confirmed` | [P] | Cancel | "Confirme — X Rs" | Prep instructions |
| 3 | `tech_travelling` | [P] | — | "Technicien en route" | ETA |
| 4 | `tech_arrived` | [PR] | **Start Collection** | "Arrive chez le patient" | — |
| 5 | `sample_collection` | [PR] | **Sample Done** | "Collecte en cours" | — |
| 6 | `sample_collected` | [PR] | **Depart to Lab** | "Echantillon collecte" | Conservation, temperature |
| 7 | `sample_in_transit` | [P] | — | "Echantillon en transit vers le labo" | — |
| 8 | `sample_received_at_lab` | [P] | — | "Echantillon recu au laboratoire" | — |
| 9+ | *(same as office workflow from analysis_in_progress)* | | | | |

#### Workflow C — Results Explanation Call

**Video:**
```
results_validated → call_scheduled → call_ready → in_call → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `call_scheduled` | [P] | Reschedule | "Appel d'explication resultats planifie" | Results to discuss |
| 2 | `call_ready` | Both | **Join** | "Salle prete" | — |
| 3 | `in_call` | [PR] | **End** | "Explication des resultats en cours" | Screen share results |
| 4 | `completed` | [P] | View Summary | "Explication terminee" | Notes, recommendations |

---

### 2.5 EMERGENCY WORKER

#### Workflow A — Emergency with Hospital Transport

**Home only (by nature):**
```
pending → dispatched → en_route → arrived_on_scene → patient_assessment → first_aid → stabilized → transporting_to_hospital → patient_delivered → report_filing → resolved
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Urgence signalee — recherche d'un intervenant" | Emergency type, priority (low/medium/high/critical), GPS location |
| 1 | `pending` | [PR] (all) | **Accept**, **Deny** | "Nouvelle urgence" | Distance, priority, type |
| 2 | `dispatched` | [P] | Cancel | "Intervenant assigne et en preparation" | Responder name, vehicle |
| 2 | `dispatched` | [PR] | **En Route** | "Intervention assignee" | Patient location, contact |
| 3 | `en_route` | [P] | — | "Intervenant en route" | ETA, real-time position |
| 3 | `en_route` | [PR] | **Arrived** | "En deplacement" | GPS navigation |
| 4 | `arrived_on_scene` | [P] | — | "L'intervenant est arrive" | — |
| 4 | `arrived_on_scene` | [PR] | **Assess Patient** | "Arrive sur les lieux" | — |
| 5 | `patient_assessment` | [P] | — | "Evaluation en cours" | — |
| 5 | `patient_assessment` | [PR] | **First Aid**, **Stabilize** | "Evaluation du patient" | Vitals, consciousness, injuries |
| 6 | `first_aid` | [P] | — | "Premiers soins en cours" | — |
| 6 | `first_aid` | [PR] | **Patient Stabilized** | "Premiers soins" | Acts performed |
| 7 | `stabilized` | [P] | — | "Patient stabilise" | — |
| 7 | `stabilized` | [PR] | **Transport to Hospital**, **Resolved On-Site** | "Patient stable" | Transport or resolve decision |
| 8 | `transporting_to_hospital` | [P] | — | "Transport vers l'hopital" | Hospital destination |
| 8 | `transporting_to_hospital` | [PR] | **Patient Delivered** | "En route vers l'hopital" | Hospital, ETA |
| 9 | `patient_delivered` | [P] | — | "Patient remis a l'hopital" | Hospital name, department |
| 9 | `patient_delivered` | [PR] | **File Report** | "Patient remis" | Delivery time, department |
| 10 | `report_filing` | [PR] | **Complete** | "Redaction rapport d'intervention" | Timeline, acts, patient state |
| 11 | `resolved` | [P] | Leave Review | "Urgence resolue" | Full report |
| 11 | `resolved` | [PR] | — | "Intervention terminee" | Archived report |

#### Workflow B — Emergency Resolved On-Site

**Home only:**
```
pending → dispatched → en_route → arrived_on_scene → patient_assessment → first_aid → resolved_on_scene → report_filing → resolved
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1-6 | *(same as Workflow A)* | | | | |
| 7 | `resolved_on_scene` | [P] | — | "Situation resolue sur place" | — |
| 7 | `resolved_on_scene` | [PR] | **File Report** | "Resolu sans transport" | Notes, advice |
| 8 | `report_filing` | [PR] | **Complete** | "Redaction rapport" | — |
| 9 | `resolved` | [P] | Leave Review | "Urgence resolue" | Report |

---

### 2.6 PHARMACIST

#### Workflow A — Prescription Order

**Office (pharmacy pickup):**
```
pending → prescription_review → stock_check → order_confirmed → preparing → ready_for_pickup → picked_up → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Commande envoyee" | Prescription attached, medication list |
| 1 | `pending` | [PR] | **Review Prescription** | "Nouvelle commande" | Prescription, prescriber |
| 2 | `prescription_review` | [P] | — | "Ordonnance en cours de verification" | — |
| 2 | `prescription_review` | [PR] | **Valid**, **Contact Prescriber**, **Deny** | "Verification ordonnance" | Validity, interactions, contraindications |
| 3 | `stock_check` | [P] | — | "Verification disponibilite" | — |
| 3 | `stock_check` | [PR] | **All In Stock**, **Partial Stock**, **Out of Stock** | "Verification stock" | Availability per medication |
| 4 | `order_confirmed` | [P] | — | "Commande confirmee — X Rs" | Total amount, breakdown |
| 4 | `order_confirmed` | [PR] | **Prepare** | "Commande confirmee" | Preparation list |
| 5 | `preparing` | [P] | — | "Commande en preparation" | — |
| 5 | `preparing` | [PR] | **Ready** | "Preparation en cours" | Check dosages |
| 6 | `ready_for_pickup` | [P] | — | "Commande prete — retrait en pharmacie" | Pharmacy address, hours |
| 6 | `ready_for_pickup` | [PR] | **Handed to Patient** | "En attente de retrait" | — |
| 7 | `picked_up` | [P] | **Confirm Receipt** | "Commande retiree" | — |
| 7 | `picked_up` | [PR] | **Complete** | "Remis au patient" | — |
| 8 | `completed` | [P] | Leave Review | "Commande terminee" | Dosage instructions |

**Home (delivery):**
```
pending → prescription_review → stock_check → order_confirmed → preparing → ready_for_delivery → delivery_in_progress → delivered → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1-5 | *(same as office)* | | | | |
| 6 | `ready_for_delivery` | [P] | — | "Commande prete — livraison planifiee" | — |
| 6 | `ready_for_delivery` | [PR] | **Send Delivery** | "Pret pour livraison" | Patient address |
| 7 | `delivery_in_progress` | [P] | — | "Livraison en cours" | ETA |
| 7 | `delivery_in_progress` | [PR] | **Delivered** | "En cours de livraison" | Delivery person, position |
| 8 | `delivered` | [P] | **Confirm Receipt** | "Commande livree" | — |
| 9 | `completed` | [P] | Leave Review | "Commande terminee" | Medication instructions |

**Video (pharmaceutical advice):**
```
pending → confirmed → call_ready → in_call → medication_advice → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de conseil pharma envoyee" | Questions |
| 2 | `confirmed` | [P] | Reschedule | "Confirme — X Rs" | Video link |
| 3 | `call_ready` | Both | **Join** | "Salle prete" | — |
| 4 | `in_call` | [PR] | **End** | "Conseil en cours" | Dosage questions, interactions |
| 5 | `medication_advice` | [PR] | **Complete** | "Redaction conseils" | Advice sheet, alternatives |
| 6 | `completed` | [P] | View Advice | "Conseil termine" | PDF advice sheet |

#### Workflow B — Prescription Renewal

**Office:**
```
pending → prescription_check → renewal_approved → preparing → ready_for_pickup → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de renouvellement envoyee" | Previous prescription ref |
| 2 | `prescription_check` | [PR] | **Renew**, **Contact Doctor**, **Expired** | "Verification ordonnance" | Validity date, renewals remaining |
| 3 | `renewal_approved` | [P] | — | "Renouvellement approuve" | — |
| 4+ | *(same as order preparing → pickup/delivery)* | | | | |

---

### 2.7 INSURANCE REP

#### Workflow A — Claim / Reimbursement

**Office / Video:**
```
pending → document_review → assessment → additional_info_requested → final_review → approved/rejected → payment_processing → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Reclamation soumise" | Amount, consultation ref, supporting docs |
| 1 | `pending` | [PR] | **Review** | "Nouvelle reclamation" | Patient, amount, care type |
| 2 | `document_review` | [P] | — | "Documents en cours d'examen" | — |
| 2 | `document_review` | [PR] | **Documents OK**, **Request Documents** | "Revue documentaire" | Invoices, prescriptions, reports |
| 3 | `assessment` | [P] | — | "Evaluation de la reclamation" | — |
| 3 | `assessment` | [PR] | **Approve**, **Reject**, **Need More Info** | "Evaluation" | Coverage, ceiling, deductible |
| 4 | `additional_info_requested` | [P] | **Submit Documents** | "Documents supplementaires requis" | Missing documents list |
| 4 | `additional_info_requested` | [PR] | — | "En attente de documents" | — |
| 5 | `final_review` | [PR] | **Approve**, **Reject** | "Revue finale" | Proposed amount |
| 6a | `approved` | [P] | — | "Reclamation approuvee — X Rs" | Reimbursed amount, timeline |
| 6b | `rejected` | [P] | **Contest** | "Reclamation rejetee" | Detailed reason |
| 7 | `payment_processing` | [P] | — | "Paiement en cours de traitement" | — |
| 8 | `completed` | [P] | — | "Remboursement effectue" | Amount credited to wallet |

#### Workflow B — Pre-authorization

**Office / Video:**
```
pending → document_review → pre_auth_assessment → approved/rejected → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | — | "Demande de pre-autorisation soumise" | Planned procedure, estimated cost |
| 2 | `document_review` | [PR] | **Documents OK** | "Revue documents" | Medical justification |
| 3 | `pre_auth_assessment` | [PR] | **Authorize**, **Deny**, **Partial** | "Evaluation pre-autorisation" | Coverage, conditions |
| 4a | `approved` | [P] | — | "Pre-autorise — couverture X%" | Covered amount, conditions |
| 4b | `rejected` | [P] | **Contest** | "Pre-autorisation refusee" | Reason |

---

### 2.8 CAREGIVER

#### Workflow A — Daily Care / Personal Assistance

**Home (primary mode):**
```
pending → confirmed → caregiver_travelling → caregiver_arrived → patient_handover → in_care → care_update → care_summary → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande d'aide-soignant envoyee" | Care type (toilette, meals, mobility), duration |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle demande de soins" | Patient, assistance type, duration |
| 2 | `confirmed` | [P] | Cancel, Reschedule | "Soins confirmes — 600 Rs" | Date, slot |
| 3 | `caregiver_travelling` | [P] | — | "Aide-soignant en route" | ETA |
| 3 | `caregiver_travelling` | [PR] | **Arrived** | "En route" | Navigation |
| 4 | `caregiver_arrived` | [P] | — | "Aide-soignant arrive" | — |
| 5 | `patient_handover` | [PR] | **Start Care** | "Prise en charge du patient" | Patient state, family instructions |
| 6 | `in_care` | [P] | — | "Soins en cours" | Current care type |
| 6 | `in_care` | [PR] | **Send Update**, **End** | "Soins en cours" | Activities done |
| 7 | `care_update` | [P] | — | "Mise a jour: repas donne / toilette faite" | Activity details |
| 8 | `care_summary` | [PR] | **Complete** | "Redaction resume" | Patient state, observations, alerts |
| 9 | `completed` | [P] | Leave Review, Rebook | "Soins termines" | Day summary, recommendations |

**Office (care center):**
```
pending → confirmed → check_in → patient_handover → in_care → care_summary → completed
```

**Video (remote follow-up, family advice):**
```
pending → confirmed → call_ready → in_call → care_recommendations → completed
```

#### Workflow B — Long-Term Care Series

```
pending → confirmed → session_1_in_progress → session_1_completed → session_2_scheduled → ... → series_completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| N | `session_N_in_progress` | [PR] | **End Session** | "Session N/X en cours" | Activities, patient state |
| N+1 | `session_N_completed` | [P] | — | "Session N/X terminee" | Session notes, evolution |
| end | `series_completed` | [P] | Renew, Leave Review | "Serie de soins terminee" | Full assessment |

---

### 2.9 PHYSIOTHERAPIST

#### Workflow A — Rehabilitation Session

**Office:**
```
pending → confirmed → check_in → initial_assessment → treatment_plan → in_session → exercises → post_session_notes → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de seance envoyee" | Body zone, pain level, prescription |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle demande" | Patient, zone, history |
| 2 | `confirmed` | [P] | Reschedule | "Confirme — 800 Rs" | Date, recommended attire |
| 3 | `check_in` | [PR] | **Start Assessment** | "Patient arrive" | — |
| 4 | `initial_assessment` | [P] | — | "Evaluation en cours" | — |
| 4 | `initial_assessment` | [PR] | **Create Plan** | "Evaluation initiale" | Mobility, pain (1-10), functional tests |
| 5 | `treatment_plan` | [P] | View Plan | "Plan de traitement propose" | Nb sessions, objectives, exercises |
| 5 | `treatment_plan` | [PR] | **Start Session** | "Plan etabli" | Detailed program |
| 6 | `in_session` | [P] | — | "Seance en cours" | — |
| 6 | `in_session` | [PR] | **Go to Exercises** | "Traitement en cours" | Techniques (massage, electro, etc.) |
| 7 | `exercises` | [P] | — | "Exercices en cours" | — |
| 7 | `exercises` | [PR] | **End** | "Exercices guides" | Exercise list, reps, sets |
| 8 | `post_session_notes` | [PR] | **Complete** | "Redaction notes" | Progress, post-pain, home exercises |
| 9 | `completed` | [P] | View Home Exercises, Book Next | "Seance terminee" | PDF home exercises, next appt |

**Home:**
```
pending → confirmed → physio_travelling → physio_arrived → initial_assessment → in_session → exercises → post_session_notes → completed
```

**Video (exercise follow-up, program adjustment):**
```
pending → confirmed → call_ready → in_call → exercise_review → program_adjustment → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 4 | `exercise_review` | [PR] | **Adjust Program** | "Revue des exercices" | Patient demonstrates, posture correction |
| 5 | `program_adjustment` | [PR] | **Complete** | "Ajustement programme" | New exercises, progression |
| 6 | `completed` | [P] | View Updated Program | "Suivi termine" | Updated PDF |

#### Workflow B — Full Rehabilitation Program (series)

```
pending → assessment_scheduled → initial_assessment → treatment_plan_created → session_1 → session_1_completed → ... → final_assessment → program_completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 3 | `treatment_plan_created` | [P] | View Plan, Accept | "Plan de reeducation: X seances sur Y semaines" | Objectives, frequency, total cost |
| N | `session_N_completed` | [P] | — | "Seance N/X terminee — Progres: Y%" | Pain evolution, mobility |
| end | `final_assessment` | [PR] | **Complete Program** | "Evaluation finale" | Before/after comparison |
| end+1 | `program_completed` | [P] | Leave Review | "Programme termine — Objectifs atteints" | Assessment, maintenance exercises |

---

### 2.10 DENTIST

#### Workflow A — Dental Consultation / Checkup

**Office:**
```
pending → confirmed → check_in → dental_examination → diagnosis → treatment_recommendation → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de consultation dentaire envoyee" | Reason (pain, checkup, aesthetic) |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle consultation dentaire" | Patient, reason, last visit |
| 2 | `confirmed` | [P] | Reschedule | "Confirme — 800 Rs" | Date, instructions (no food before) |
| 3 | `check_in` | [PR] | **Start Examination** | "Patient arrive" | Update dental file |
| 4 | `dental_examination` | [P] | — | "Examen dentaire en cours" | — |
| 4 | `dental_examination` | [PR] | **Diagnosis** | "Examen en cours" | Dental chart, x-rays if needed |
| 5 | `diagnosis` | [P] | — | "Diagnostic en cours" | — |
| 5 | `diagnosis` | [PR] | **Send Recommendations** | "Diagnostic" | Cavities, gums, alignment, wear |
| 6 | `treatment_recommendation` | [P] | View Diagnosis, Book Treatment | "Diagnostic et recommandations" | Recommended care, estimate, urgency |
| 7 | `completed` | [P] | Leave Review, Book Care | "Consultation terminee" | Updated dental file |

#### Workflow B — Dental Care (filling, crown, etc.)

**Office only:**
```
pending → confirmed → check_in → anesthesia → dental_procedure → post_procedure → care_instructions → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1-3 | *(same as consultation)* | | | | |
| 4 | `anesthesia` | [P] | — | "Anesthesie en cours" | Anesthesia type |
| 4 | `anesthesia` | [PR] | **Start Treatment** | "Administration anesthesie" | Product, dosage |
| 5 | `dental_procedure` | [P] | — | "Soin dentaire en cours" | Care type (filling, extraction, etc.) |
| 5 | `dental_procedure` | [PR] | **End Treatment** | "Procedure en cours" | Teeth treated, material |
| 6 | `post_procedure` | [P] | — | "Soin termine — observation" | — |
| 6 | `post_procedure` | [PR] | **Send Instructions** | "Observation post-soin" | Bleeding, sensitivity |
| 7 | `care_instructions` | [P] | View Instructions | "Instructions post-soin envoyees" | Diet, hygiene, medications, control appt |
| 8 | `completed` | [P] | Book Control | "Soin termine" | Summary, next control recommended |

#### Workflow C — Tooth Extraction

**Office only:**
```
pending → confirmed → check_in → x_ray → anesthesia → extraction → hemostasis → post_extraction_care → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 4 | `x_ray` | [PR] | **Proceed** | "Radio dentaire" | Image, root analysis |
| 5 | `anesthesia` | [PR] | **Start Extraction** | "Anesthesie" | Product, dosage |
| 6 | `extraction` | [PR] | **Extraction Done** | "Extraction en cours" | Tooth extracted, technique |
| 7 | `hemostasis` | [PR] | **Stable** | "Controle saignement" | Compress, suture if needed |
| 8 | `post_extraction_care` | [P] | View Instructions | "Instructions post-extraction" | Ice, soft food, antibiotics |
| 9 | `completed` | [P] | Book Control | "Extraction terminee" | Follow-up date |

#### Workflow D — Scaling / Cleaning

**Office:**
```
pending → confirmed → check_in → scaling → polishing → fluoride_treatment → care_instructions → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 4 | `scaling` | [PR] | **Scaling Done** | "Detartrage en cours" | Treated zones |
| 5 | `polishing` | [PR] | **Polishing Done** | "Polissage" | — |
| 6 | `fluoride_treatment` | [PR] | **Treatment Done** | "Application fluor" | Fluoride type |
| 7 | `care_instructions` | [P] | View Instructions | "Conseils d'hygiene envoyes" | Brushing, flossing, frequency |
| 8 | `completed` | [P] | Leave Review | "Nettoyage termine" | Next recommended cleaning |

**Video (advice / follow-up only):**
```
pending → confirmed → call_ready → in_call → dental_advice → completed
```

---

### 2.11 OPTOMETRIST

#### Workflow A — Eye Examination

**Office:**
```
pending → confirmed → check_in → visual_acuity_test → refraction_test → eye_health_exam → diagnosis → prescription_glasses → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande d'examen de la vue envoyee" | Reason (vision loss, headaches, renewal) |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle demande examen vue" | Patient, reason, last prescription |
| 2 | `confirmed` | [P] | Reschedule | "Confirme — 800 Rs" | Date, remove contacts 24h before |
| 3 | `check_in` | [PR] | **Start Tests** | "Patient arrive" | Optical file |
| 4 | `visual_acuity_test` | [P] | — | "Test d'acuite visuelle en cours" | — |
| 4 | `visual_acuity_test` | [PR] | **Next Test** | "Acuite visuelle" | OD, OG, binocular scores |
| 5 | `refraction_test` | [P] | — | "Test de refraction en cours" | — |
| 5 | `refraction_test` | [PR] | **Next Test** | "Refraction" | Sphere, cylinder, axis per eye |
| 6 | `eye_health_exam` | [P] | — | "Examen de sante oculaire" | — |
| 6 | `eye_health_exam` | [PR] | **Diagnosis** | "Fond d'oeil / Tonometrie" | Ocular pressure, retina, optic nerve |
| 7 | `diagnosis` | [P] | — | "Diagnostic en cours" | — |
| 7 | `diagnosis` | [PR] | **Write Prescription** | "Diagnostic" | Myopia, hyperopia, astigmatism, presbyopia |
| 8 | `prescription_glasses` | [P] | **View Prescription** | "Ordonnance lunettes/lentilles disponible" | OD/OG correction, recommended lens type |
| 8 | `prescription_glasses` | [PR] | **Complete** | "Ordonnance redigee" | Validity, recommendations |
| 9 | `completed` | [P] | Download Prescription, Order Glasses, Leave Review | "Examen termine" | PDF prescription, next control |

#### Workflow B — Fundus Exam / In-Depth Examination

**Office only:**
```
pending → confirmed → check_in → pupil_dilation → waiting_dilation → fundus_exam → oct_scan → diagnosis → report_ready → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1-3 | *(same as eye examination)* | | | | |
| 4 | `pupil_dilation` | [PR] | **Drops Administered** | "Dilatation pupillaire" | Drops, product |
| 5 | `waiting_dilation` | [P] | — | "Attente dilatation (20-30 min)" | Estimated remaining time |
| 6 | `fundus_exam` | [PR] | **Exam Done** | "Fond d'oeil en cours" | Retina, macula, vessels |
| 7 | `oct_scan` | [PR] | **Scan Done** | "OCT / Scan retinien" | High-resolution images |
| 8 | `diagnosis` | [PR] | **Write Report** | "Diagnostic" | Glaucoma, AMD, retinopathy |
| 9 | `report_ready` | [P] | **View Report** | "Rapport d'examen disponible" | Images, measurements, diagnosis, treatment |
| 10 | `completed` | [P] | Share with Doctor | "Examen termine" | Warning: blurred vision 4-6h after |

#### Workflow C — Contact Lens Fitting

**Office:**
```
pending → confirmed → check_in → eye_measurements → lens_fitting → trial_period → follow_up_check → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 4 | `eye_measurements` | [PR] | **Fitting** | "Mesures oculaires" | Keratometry, cornea diameter |
| 5 | `lens_fitting` | [PR] | **Lenses Placed** | "Essayage lentilles" | Type, brand, parameters |
| 6 | `trial_period` | [P] | **Trial Feedback** | "Periode d'essai lentilles" | Care instructions, progressive wear |
| 7 | `follow_up_check` | [PR] | **Complete** | "Controle adaptation" | Comfort, vision, cornea state |
| 8 | `completed` | [P] | Leave Review | "Adaptation terminee" | Final prescription |

**Video (follow-up, advice):**
```
pending → confirmed → call_ready → in_call → vision_advice → completed
```

---

### 2.12 NUTRITIONIST

#### Workflow A — Initial Consultation + Meal Plan

**Office:**
```
pending → confirmed → check_in → health_assessment → dietary_analysis → meal_plan_creation → plan_review → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [P] | Cancel | "Demande de consultation nutrition envoyee" | Goal (weight loss, diabetes, sports, etc.) |
| 1 | `pending` | [PR] | **Accept**, **Deny** | "Nouvelle consultation nutrition" | Patient, goal, medical conditions |
| 2 | `confirmed` | [P] | Reschedule | "Confirme — 1000 Rs" | Bring 3-day food diary |
| 3 | `check_in` | [PR] | **Start Assessment** | "Patient arrive" | — |
| 4 | `health_assessment` | [P] | — | "Evaluation sante en cours" | — |
| 4 | `health_assessment` | [PR] | **Dietary Analysis** | "Evaluation" | Weight, height, BMI, waist, goals |
| 5 | `dietary_analysis` | [P] | — | "Analyse de vos habitudes alimentaires" | — |
| 5 | `dietary_analysis` | [PR] | **Create Plan** | "Analyse alimentaire" | Current intake, deficiencies, excesses |
| 6 | `meal_plan_creation` | [P] | — | "Creation de votre plan alimentaire" | — |
| 6 | `meal_plan_creation` | [PR] | **Send Plan** | "Redaction plan" | Weekly menus, macros, recipes |
| 7 | `plan_review` | [P] | View Plan, Questions | "Plan alimentaire disponible" | PDF plan, shopping list, alternatives |
| 7 | `plan_review` | [PR] | **Complete** | "Plan envoye" | — |
| 8 | `completed` | [P] | Download Plan, Book Follow-up | "Consultation terminee" | Plan PDF, goals, next appt |

**Home:**
```
pending → confirmed → nutritionist_travelling → nutritionist_arrived → health_assessment → dietary_analysis → kitchen_audit → meal_plan_creation → plan_review → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 3 | `nutritionist_travelling` | [P] | — | "Nutritionniste en route" | ETA |
| 4 | `nutritionist_arrived` | [PR] | **Start Assessment** | "Arrive(e)" | — |
| 7 | `kitchen_audit` | [PR] | **Create Plan** | "Audit cuisine & refrigerateur" | Available products, adjustments, shopping list |

**Video:**
```
pending → confirmed → call_ready → in_call → dietary_analysis → meal_plan_creation → plan_review → completed
```

#### Workflow B — Nutritional Follow-up

**Video (primary mode for follow-ups):**
```
pending → confirmed → call_ready → in_call → progress_review → plan_adjustment → completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 4 | `in_call` | [PR] | **Assess Progress** | "Appel suivi en cours" | Current weight, feelings, difficulties |
| 5 | `progress_review` | [PR] | **Adjust Plan** | "Evaluation progres" | Weight evolution, measurements, energy |
| 6 | `plan_adjustment` | [P] | View New Plan | "Plan alimentaire ajuste" | Modifications, new objectives |
| 7 | `completed` | [P] | Download Updated Plan | "Suivi termine" | PDF plan v2 |

#### Workflow C — Weight Loss / Specific Program (series)

```
pending → initial_consultation → plan_created → week_1_check → week_1_completed → week_2_check → ... → final_assessment → program_completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 2 | `plan_created` | [P] | View Plan | "Programme X semaines cree" | Goal, milestones, menus |
| N | `week_N_check` | [PR] | **Validate Week** | "Bilan semaine N" | Weight, adherence, adjustments |
| end | `final_assessment` | [PR] | **Complete** | "Evaluation finale" | Before/after, goals achieved |
| end+1 | `program_completed` | [P] | Leave Review | "Programme termine" | Full assessment, maintenance plan |

---

### 2.13 CORPORATE ADMIN

#### Workflow — Employee Plan Enrollment

```
pending → employee_verification → enrollment_processing → enrollment_completed
```

| Step | Status | Who | Action Buttons | Message Label | Details / Content |
|------|--------|-----|----------------|---------------|-------------------|
| 1 | `pending` | [Admin] | — | "Demande d'inscription en cours" | Employee list, selected plan |
| 2 | `employee_verification` | [SYS] | — | "Verification des employes" | Valid emails, duplicates |
| 3 | `enrollment_processing` | [Admin] | — | "Inscription en cours" | Processed / total count |
| 4 | `enrollment_completed` | [Admin] | View Report | "X employes inscrits" | Successes, failures, total cost |

---

### 2.14 REGIONAL ADMIN

#### Workflow — Subscription Plan Management

```
draft → published → active → suspended → archived
```

| Step | Status | Action Buttons | Message Label | Details / Content |
|------|--------|---------------|---------------|-------------------|
| 1 | `draft` | **Publish** | "Plan en brouillon" | Linked services, prices, quotas |
| 2 | `published` | **Activate**, Modify | "Plan publie — visible" | Subscription count |
| 3 | `active` | **Suspend**, Modify | "Plan actif" | Revenue, active users |
| 4 | `suspended` | **Reactivate**, **Archive** | "Plan suspendu" | Suspension reason |
| 5 | `archived` | — | "Plan archive" | History |

---

### 2.15 REFERRAL PARTNER

#### Workflow — Referral Tracking

```
referral_sent → referral_registered → referral_subscribed → commission_earned → commission_paid
```

| Step | Status | Action Buttons | Message Label | Details / Content |
|------|--------|---------------|---------------|-------------------|
| 1 | `referral_sent` | View Link | "Lien de parrainage envoye" | Referral code, unique link |
| 2 | `referral_registered` | — | "Nouveau filleul inscrit" | Name, registration date |
| 3 | `referral_subscribed` | — | "Filleul a souscrit un plan" | Plan chosen, amount |
| 4 | `commission_earned` | — | "Commission gagnee: X Rs" | Commission rate, calculation |
| 5 | `commission_paid` | — | "Commission versee" | Amount credited to wallet |

---

## 3. Cross-Role Transversal Statuses

These statuses apply to **any workflow** at applicable points:

| Status | Action Buttons | Message Label | When | Details |
|--------|---------------|---------------|------|---------|
| `cancelled` | Rebook | "Annule" | Any time before completion | Reason + refund if applicable |
| `rescheduled` | — | "Reprogramme au [new date]" | From pending or confirmed | New date/time |
| `expired` | Rebook | "Expire — creneau depasse sans action" | No action within timeout | — |
| `disputed` | Submit Evidence | "Contestation en cours" | After rejection or contested cancel | — |
| `refund_processing` | — | "Remboursement en cours" | After cancellation of paid booking | — |
| `refund_completed` | — | "Remboursement effectue: X Rs" | Wallet credited | Amount |
| `no_show` | Rebook | "Patient absent au RDV" | Provider reports absence | — |
| `review_pending` | Leave Review | "En attente de votre avis" | After completion | — |

---

## 4. Configurable Workflow Engine

### 4.1 Concept

Providers and Regional Admins can **create, customize, and manage workflows** for their services:

- **Provider** can create custom workflow templates for their specific services (e.g., a dentist adding a "teeth whitening" workflow with custom steps)
- **Regional Admin** can create/modify workflow templates at the regional level, applying to all providers of a given type in their region
- **System default workflows** serve as base templates (defined in Section 2 above)
- Custom workflows inherit from defaults but can add/remove/rename steps

### 4.2 Customization Capabilities

| Feature | Provider | Regional Admin |
|---------|----------|----------------|
| Create custom workflow template | Yes (own services) | Yes (regional scope) |
| Rename workflow steps | Yes | Yes |
| Add custom steps | Yes | Yes |
| Remove optional steps | Yes | Yes |
| Customize notification messages | Yes | Yes |
| Set step timeouts | No | Yes |
| Set mandatory vs optional steps | No | Yes |
| Override default workflows | No | Yes |
| Define escalation rules | No | Yes |

### 4.3 Notification Message Customization

Each step transition generates a notification. Providers/admins can customize:

- **Title**: e.g., "Dr. Martin est en route" instead of default "Docteur en deplacement"
- **Message**: e.g., "Votre dentiste Dr. Martin arrive dans ~15 minutes. Merci de preparer la salle."
- **Template variables**: `{{providerName}}`, `{{patientName}}`, `{{serviceName}}`, `{{scheduledAt}}`, `{{amount}}`, `{{eta}}`

---

## 5. Feasibility Analysis

### 5.1 Current State Assessment

| Aspect | Current State | Impact |
|--------|--------------|--------|
| **Status fields** | All booking models use `String` type (not enums) | Easy to support dynamic statuses |
| **Emergency status** | Uses `EmergencyStatus` enum in Prisma | Needs migration to String for flexibility |
| **Notification model** | Has `referenceId` + `referenceType` fields | Already supports linking to any booking |
| **Provider config** | `ProviderServiceConfig` + `PlatformService` exist | Good foundation for workflow config |
| **Regional admin model** | `RegionalAdminProfile` with region/country | Supports regional scoping |
| **Booking models** | 6 separate models (Appointment, NurseBooking, etc.) | Need a unified approach or polymorphic pattern |

### 5.2 Technical Feasibility: **HIGH**

**Strengths:**
- String-based statuses already allow dynamic transitions (no enum migration needed for most models)
- Notification system already has `referenceId/referenceType` for flexible linking
- Provider and regional admin configuration patterns already established
- Next.js API routes are modular and can be extended

**Challenges:**
- 6 separate booking models need unified workflow handling (solution: generic `WorkflowStep` table that references any booking type)
- EmergencyBooking uses Prisma enum (solution: migrate to String in schema)
- Frontend needs dynamic rendering based on workflow config (solution: config-driven UI components)
- Real-time status updates need Socket.IO integration (solution: already have Socket.IO infrastructure)

### 5.3 Architecture Decision

**Recommended approach: Workflow Engine as a separate layer on top of existing models**

```
[WorkflowTemplate] → defines steps, transitions, notifications
       ↓
[WorkflowInstance] → tracks a specific booking's progress through a template
       ↓
[WorkflowStep]    → each status change is recorded as a step
       ↓
[Notification]    → auto-generated on each step transition
```

This approach:
- Does NOT require modifying existing booking models
- Adds workflow tracking as a parallel system
- Keeps backward compatibility
- Allows gradual migration

### 5.4 Migration Strategy

1. **Phase 1**: Create workflow tables (WorkflowTemplate, WorkflowInstance, WorkflowStep)
2. **Phase 2**: Create default templates from Section 2 definitions
3. **Phase 3**: Build generic API for status transitions (`POST /api/workflow/transition`)
4. **Phase 4**: Add provider/admin UI for workflow customization
5. **Phase 5**: Add notification template customization
6. **Phase 6**: Migrate existing booking status updates to use workflow engine

---

## 6. Proposed Database Schema

```prisma
// Workflow template — defines a reusable workflow
model WorkflowTemplate {
  id              String   @id @default(uuid())
  name            String   // "Consultation Generale", "Extraction Dentaire"
  slug            String   // "doctor-consultation-office"
  description     String?
  providerType    String   // DOCTOR, NURSE, DENTIST, etc.
  bookingType     String   // appointment, nurse_booking, service_booking, etc.
  serviceMode     String   // office, home, video
  isDefault       Boolean  @default(false)
  isActive        Boolean  @default(true)

  // Ownership
  createdByProviderId String?   // null = system default
  createdByAdminId    String?   // regional admin
  regionCode          String?   // null = global

  // Steps as ordered JSON array
  // Each step: { order, statusCode, label, description, actions[], notifyRole, notifyTitle, notifyMessage }
  steps           Json

  // Allowed transitions as JSON
  // Each transition: { from, to, action, allowedRoles[], conditions? }
  transitions     Json

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  instances       WorkflowInstance[]
}

// Workflow instance — tracks one booking's progress
model WorkflowInstance {
  id              String   @id @default(uuid())
  templateId      String
  template        WorkflowTemplate @relation(fields: [templateId], references: [id])

  // Polymorphic reference to any booking
  bookingId       String
  bookingType     String   // appointment, nurse_booking, childcare_booking, etc.

  currentStatus   String   // current step status code
  previousStatus  String?  // last step status code

  patientUserId   String
  providerUserId  String

  startedAt       DateTime @default(now())
  completedAt     DateTime?
  cancelledAt     DateTime?

  metadata        Json?    // extra data (e.g., prescription content, lab results)

  steps           WorkflowStepLog[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// Step log — records every status transition
model WorkflowStepLog {
  id              String   @id @default(uuid())
  instanceId      String
  instance        WorkflowInstance @relation(fields: [instanceId], references: [id])

  fromStatus      String?  // null for initial step
  toStatus        String
  action          String   // "accept", "start_care", "complete", etc.
  actionByUserId  String
  actionByRole    String   // "patient", "provider", "system"

  // Display info
  label           String   // "Consultation en cours"
  message         String?  // Detailed message

  // Attached content (polymorphic)
  contentType     String?  // "prescription", "lab_result", "care_notes", "report"
  contentData     Json?    // { medications: [...], dosage: "..." } or { findings: "...", values: [...] }

  // Notification sent
  notificationId  String?  // reference to created Notification

  createdAt       DateTime @default(now())
}

// Notification template customization
model NotificationTemplate {
  id              String   @id @default(uuid())
  templateId      String   // WorkflowTemplate.id
  statusCode      String   // which step this notification is for
  targetRole      String   // "patient" or "provider"

  title           String   // supports {{variables}}
  message         String   // supports {{variables}}
  type            String   // notification type code

  // Ownership
  createdByProviderId String?
  createdByAdminId    String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## 7. API Design

### 7.1 Workflow Transition API

```
POST /api/workflow/transition
Body: {
  instanceId: string,        // or bookingId + bookingType
  action: string,            // "accept", "start", "complete", etc.
  notes?: string,            // optional notes
  contentType?: string,      // "prescription", "lab_result", etc.
  contentData?: object       // attached content
}

Response: {
  success: true,
  data: {
    instanceId: string,
    previousStatus: string,
    currentStatus: string,
    nextActions: Action[],     // available next actions for current user
    notification: { id, title, message }  // notification that was sent
  }
}
```

### 7.2 Workflow Template Management

```
GET    /api/workflow/templates                    — List templates (filter by providerType, serviceMode)
GET    /api/workflow/templates/[id]               — Get template with steps
POST   /api/workflow/templates                    — Create custom template (provider/admin)
PATCH  /api/workflow/templates/[id]               — Update template
DELETE /api/workflow/templates/[id]               — Deactivate template

GET    /api/workflow/templates/[id]/notifications — Get notification customizations
PATCH  /api/workflow/templates/[id]/notifications — Update notification messages
```

### 7.3 Workflow Instance API

```
POST   /api/workflow/instances                    — Create instance (when booking is created)
GET    /api/workflow/instances/[id]               — Get instance with step history
GET    /api/workflow/instances/[id]/steps          — Get step log / timeline
GET    /api/workflow/instances?bookingId=X         — Get instance by booking
```

### 7.4 Provider Configuration

```
GET    /api/workflow/my-templates                 — Provider's custom templates
POST   /api/workflow/my-templates                 — Create provider template
PATCH  /api/workflow/my-templates/[id]            — Edit provider template
```

### 7.5 Regional Admin Configuration

```
GET    /api/regional/workflow-templates           — Regional templates
POST   /api/regional/workflow-templates           — Create regional template
PATCH  /api/regional/workflow-templates/[id]      — Edit regional template
```

---

## 8. Notification System Integration

### 8.1 Auto-Notification on Step Transition

Every call to `POST /api/workflow/transition` automatically:

1. Validates the transition is allowed (from current status, by current user role)
2. Updates `WorkflowInstance.currentStatus`
3. Creates a `WorkflowStepLog` entry
4. Looks up `NotificationTemplate` (custom first, then default)
5. Resolves template variables (`{{providerName}}`, `{{patientName}}`, etc.)
6. Creates a `Notification` record for the target user
7. Emits a Socket.IO event for real-time push
8. Returns the new state + available next actions

### 8.2 Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{patientName}}` | Patient full name | "Jean Dupont" |
| `{{providerName}}` | Provider full name | "Dr. Martin" |
| `{{providerType}}` | Provider role label | "Docteur" |
| `{{serviceName}}` | Service/workflow name | "Consultation Generale" |
| `{{scheduledAt}}` | Scheduled date/time | "20 Mars 2026 a 14h00" |
| `{{amount}}` | Amount charged/refunded | "500 Rs" |
| `{{status}}` | Current status label | "En consultation" |
| `{{eta}}` | Estimated time of arrival | "~15 minutes" |
| `{{bookingId}}` | Booking reference | "BK-2026-0342" |
| `{{actionBy}}` | Who performed the action | "Dr. Martin" |

### 8.3 Default Notification Messages per Status

| Status Code | Target | Default Title | Default Message |
|-------------|--------|---------------|-----------------|
| `pending` | Provider | "Nouvelle demande" | "{{patientName}} a demande un(e) {{serviceName}} pour le {{scheduledAt}}" |
| `confirmed` | Patient | "Reservation confirmee" | "Votre {{serviceName}} avec {{providerName}} est confirmee pour le {{scheduledAt}}. Montant: {{amount}}" |
| `provider_travelling` | Patient | "{{providerName}} en route" | "{{providerName}} est en deplacement vers vous. Arrivee estimee: {{eta}}" |
| `provider_arrived` | Patient | "{{providerName}} est arrive(e)" | "{{providerName}} est arrive(e) a votre domicile" |
| `in_progress` | Patient | "Service en cours" | "Votre {{serviceName}} avec {{providerName}} est en cours" |
| `completed` | Patient | "Service termine" | "Votre {{serviceName}} avec {{providerName}} est termine. Merci de laisser un avis." |
| `cancelled` | Other | "Reservation annulee" | "La reservation {{serviceName}} du {{scheduledAt}} a ete annulee par {{actionBy}}" |
| `results_ready` | Patient | "Resultats disponibles" | "Les resultats de votre {{serviceName}} sont disponibles. Consultez-les dans votre dossier." |
| `prescription_ready` | Patient | "Ordonnance disponible" | "{{providerName}} a emis une ordonnance suite a votre {{serviceName}}" |
| `refund_completed` | Patient | "Remboursement effectue" | "{{amount}} ont ete credites sur votre portefeuille suite a l'annulation de votre {{serviceName}}" |

---

## Summary: Workflow Counts

| Role | Workflows | Modes | Total Status Steps (approx) |
|------|-----------|-------|----------------------------|
| Doctor | 4 (consultation, surgery, diagnostic, follow-up) | Office, Home, Video | ~35 |
| Nurse | 3 (care, sample collection, post-op) | Office, Home, Video | ~30 |
| Nanny | 2 (standard care, child emergency) | Office, Home, Video | ~20 |
| Lab Technician | 3 (lab test, home collection, results call) | Office, Home, Video | ~30 |
| Emergency Worker | 2 (transport, on-site resolution) | Home only | ~20 |
| Pharmacist | 2 (prescription order, renewal) | Office, Home, Video | ~25 |
| Insurance Rep | 2 (claim, pre-authorization) | Office, Video | ~15 |
| Caregiver | 2 (daily care, long-term series) | Office, Home, Video | ~20 |
| Physiotherapist | 2 (session, full program) | Office, Home, Video | ~25 |
| Dentist | 4 (consultation, care, extraction, scaling) | Office, Video | ~30 |
| Optometrist | 3 (eye exam, fundus, contact lens) | Office, Video | ~25 |
| Nutritionist | 3 (initial, follow-up, program) | Office, Home, Video | ~25 |
| Corporate Admin | 1 (enrollment) | — | ~4 |
| Regional Admin | 1 (plan management) | — | ~5 |
| Referral Partner | 1 (referral tracking) | — | ~5 |
| **TOTAL** | **~33 workflows** | | **~310 unique status steps** |
