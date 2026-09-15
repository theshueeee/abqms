---
id: SPEC
title: DentaQueue — Specification Router
status: active
parent: null
last_verified: 2026-09-15
---

# DentaQueue — Spec Router

**This file is a router, not a specification.** Every line below is a one-sentence summary or a
link. Detailed content lives in exactly one file each; nothing is duplicated here.

DentaQueue is a browser-based (no app install) platform for the General/Outpatient Dental Clinic,
Faculty of Dentistry, Universiti Malaya. It unifies two currently-disconnected processes — online
appointment booking and physical walk-in queuing — into one system with real-time, patient-facing
queue transparency plus staff-side operational control.

## The rule that shapes everything

**Dual mode (BR-04): AM = live walk-in queue management; PM = pre-scheduled bookings only.
Hard cap: 15 patients/doctor/day (BR-01).** Details: `index/business-rules.md`.

## Reading map

| If you are working on… | Read, in this order | Notes |
|---|---|---|
| **Anything at all** | `index/business-rules.md` → `index/roles-and-rbac.md` | Always first, no exceptions |
| A specific feature | `features/F-NN-*.md` → the `api/` and `data-model/` files it cites | Feature files are the delivery units |
| End-to-end user behaviour | `workflows/patient-journey.md`, `workflows/assistant-journey.md` | Narrative only; deep-links to features |
| Database / Prisma schema | `data-model/_overview.md` → `data-model/<domain>.md` | Schema facts live only here |
| An HTTP endpoint / contract | `api/_conventions.md` → `api/<domain>.md` | Contract facts live only here |
| A binding constraint (realtime, perf, security) | `requirements/non-functional.md` | Referenced by features, never restated |
| "Is this done / tested?" | `traceability.md` → that feature's Test plan section | |
| "Why is this undecided?" | `requirements/open-questions.md` (`OQ-NN`, `D-NN`) | Gaps are tracked, not guessed |

## ID scheme

| Prefix | Meaning | Defined in |
|---|---|---|
| `BR-NN` | Business rule (cross-feature, always binding) | `index/business-rules.md` |
| `FR-<DOMAIN>-NN` | Functional requirement | the owning `features/F-NN-*.md` |
| `NFR-<AREA>-NN` | Non-functional requirement | `requirements/non-functional.md` |
| `OQ-NN` | Open question needing a decision (not a build blocker) | `requirements/open-questions.md` |
| `D-NN` | Pending engineering/stack decision | `requirements/open-questions.md` |
| `F-NN` | Feature / delivery unit | `features/F-NN-*.md` |

Feature frontmatter carries two state fields:
- `spec_status: complete | blocked` — is the behaviour fully specified?
- `delivery_status: open → specified → built → tested → shipped` — is it built, and proven by tests?
  This same vocabulary is the `Status` column in `traceability.md`.

## Non-goals / exclusions

Billing and payments · EHR / clinical notes · SMS · HIS integration · postgraduate and specialist
clinics · direct doctor login (`BR-08`).

## Differentiators vs. existing tools

Calendly / MS Bookings = slot-only, no queue. Legacy hospital systems = staff-only, no patient
visibility. DentaQueue provides both in one system.

## Spec status

- 39 files; 16 are feature delivery units (`F-01`…`F-16`).
- 23 open questions (`OQ-01`…`OQ-23`) and 6 stack decisions (`D-01`…`D-06`) are listed in
  `requirements/open-questions.md`; several block their feature, none block the whole spec.
- Superseded monolith kept verbatim at `archive/SPEC-v1-monolith.md` for reference only.
- This router is capped at ~80 lines. New content goes in a linked file, never here.