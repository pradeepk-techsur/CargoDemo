
## Summary Table

| Epic | Name | Story Count | P0 | P1 | P2 | P3 |
|------|------|-------------|----|----|----|----|
| Epic 0 | Platform & Data Foundation | 5 | 5 | 0 | 0 | 0 |
| Epic 1 | Rules, Exception Detection & Revalidation | 7 | 7 | 0 | 0 | 0 |
| Epic 2 | AI Assistance — Explain and Recommend | 5 | 5 | 0 | 0 | 0 |
| Epic 3 | Exception Case Workflow & The Five Actions | 7 | 7 | 0 | 0 | 0 |
| Epic 4 | Document Request & Simulated Upload | 5 | 5 | 0 | 0 | 0 |
| Epic 5 | Specialist → Supervisor Approval Chain | 5 | 5 | 0 | 0 | 0 |
| Epic 6 | Decision & Audit Record | 6 | 6 | 0 | 0 | 0 |
| Epic 7 | Notification Generation | 2 | 0 | 2 | 0 | 0 |
| Epic 8 | Access Control & Rule Administration | 6 | 4 | 2 | 0 | 0 |
| Epic 9 | The Four Primary Screens & Application Shell | 9 | 9 | 0 | 0 | 0 |
| Epic 10 | Quality, Tests & Demo Readiness | 5 | 3 | 2 | 0 | 0 |
| Epic 11 | The 10-Step Demo Walkthrough | 11 | 11 | 0 | 0 | 0 |
| Epic 12 | Governance Guardrails | 7 | 7 | 0 | 0 | 0 |
| **Total** | — | **80** | **74** | **6** | **0** | **0** |

---

## Story Index

| Story | Title | Persona | Priority | Feature Ref |
|---|---|---|---|---|
| US-0.1 | Persist the Full Cargo Exception Domain | PER-03 Priya Raghavan | P0 | F0 |
| US-0.2 | Ingest Simulated Cargo Entries from a JSON File | PER-03 Priya Raghavan | P0 | F1 |
| US-0.3 | Post Cargo Entries to a Local Ingestion Endpoint | PER-03 Priya Raghavan | P0 | F1, F14 |
| US-0.4 | Start with a Seeded, Deterministic Demo Dataset | PER-04 Angela Pruitt | P0 | F2 |
| US-0.5 | Consume One Consistent Backend API from the UI | PER-01 Marisol Reyes | P0 | F3, F14 |
| US-1.1 | Detect a Missing Required Document | PER-01 Marisol Reyes | P0 | F4, F5 |
| US-1.2 | Detect an Invalid or Incomplete HTS Code | PER-01 Marisol Reyes | P0 | F4, F5 |
| US-1.3 | Detect a Conflicting Country of Origin | PER-01 Marisol Reyes | P0 | F4, F5 |
| US-1.4 | Trust That Validation Is Deterministic and Never Suppressed | PER-04 Angela Pruitt | P0 | F4 |
| US-1.5 | See Field-Level Evidence for Every Exception | PER-01 Marisol Reyes | P0 | F5 |
| US-1.6 | Revalidate a Shipment After Its Evidence Changes | PER-01 Marisol Reyes | P0 | F6 |
| US-1.7 | Have Revalidation Recorded and the AI Refreshed | PER-02 Dwayne Okafor | P0 | F6, F12, F13 |
| US-2.1 | Read a Plain-Language Summary of Why a Shipment Was Flagged | PER-01 Marisol Reyes | P0 | F7, F18 |
| US-2.2 | See Every AI Output Labelled and Attributed | PER-04 Angela Pruitt | P0 | F7, F8, F18, F19, F20 |
| US-2.3 | Continue the Walkthrough When the AI Provider Is Unavailable | PER-03 Priya Raghavan | P0 | F7, F8, F22 |
| US-2.4 | See a Recommended Resolution with an Explicit Confidence Level | PER-01 Marisol Reyes | P0 | F8, F19 |
| US-2.5 | Have Agreement or Divergence with the AI Recorded | PER-02 Dwayne Okafor | P0 | F8, F12 |
| US-3.1 | Take One of Exactly Five Actions on a Case | PER-01 Marisol Reyes | P0 | F9 |
| US-3.2 | Request Additional Information | PER-01 Marisol Reyes | P0 | F9, F10 |
| US-3.3 | Send a Case for Specialist Review | PER-02 Dwayne Okafor | P0 | F9 |
| US-3.4 | Place a Case on Hold with a Stated Reason | PER-01 Marisol Reyes | P0 | F9 |
| US-3.5 | Escalate a Case and Transfer Authority Upward | PER-01 Marisol Reyes | P0 | F9 |
| US-3.6 | Have Invalid Transitions Rejected with a Clear Reason | PER-01 Marisol Reyes | P0 | F9, F12 |
| US-3.7 | See Why an Action Is Unavailable to Me | PER-01 Marisol Reyes | P0 | F9, F19 |
| US-4.1 | Track the Lifecycle of a Document Request | PER-01 Marisol Reyes | P0 | F10 |
| US-4.2 | Upload a Simulated Document Against an Open Request | PER-01 Marisol Reyes | P0 | F10, F14 |
| US-4.3 | Be Prevented from Uploading Anything Other Than a Synthetic Document | PER-03 Priya Raghavan | P0 | F10 |
| US-4.4 | Have an Upload Trigger Revalidation Atomically | PER-01 Marisol Reyes | P0 | F10, F6 |
| US-4.5 | See Where Every Document Came From | PER-04 Angela Pruitt | P0 | F10, F18 |
| US-5.1 | Recommend Clearance and Route It to a Supervisor | PER-01 Marisol Reyes | P0 | F11, F9 |
| US-5.2 | Find Pending-Approval Work Without Hunting for It | PER-02 Dwayne Okafor | P0 | F11, F17 |
| US-5.3 | Approve a Clearance as the Named Approving Official | PER-02 Dwayne Okafor | P0 | F11, F12, F13 |
| US-5.4 | Reject or Return a Recommendation with a Reason | PER-02 Dwayne Okafor | P0 | F11, F13 |
| US-5.5 | Be Warned When the Evidence Changed Since the Recommendation | PER-02 Dwayne Okafor | P0 | F11, F6 |
| US-6.1 | Have Every Decision Recorded with All Eight Required Fields | PER-02 Dwayne Okafor | P0 | F12 |
| US-6.2 | Be Blocked from Finalising an Incomplete Decision | PER-04 Angela Pruitt | P0 | F12, F21 |
| US-6.3 | Rely on the Record Being Append-Only | PER-04 Angela Pruitt | P0 | F12, F22 |
| US-6.4 | Read the Complete Case Timeline in Chronological Order | PER-02 Dwayne Okafor | P0 | F12, F20 |
| US-6.5 | Export a Case Record for Offline Review | PER-02 Dwayne Okafor | P0 | F12, F20 |
| US-6.6 | Read the Evidence as It Was at Decision Time | PER-04 Angela Pruitt | P0 | F12, F21 |
| US-7.1 | Have a Notification Generated on Every Decision and State Change | PER-02 Dwayne Okafor | P1 | F13, F12 |
| US-7.2 | See Notifications In-App and Know They Were Never Sent | PER-04 Angela Pruitt | P1 | F13, F16, F20 |
| US-8.1 | Enter the Application as a Named Acting User | PER-03 Priya Raghavan | P0 | F14 |
| US-8.2 | Work Within My Role as a Cargo Specialist | PER-01 Marisol Reyes | P0 | F14 |
| US-8.3 | Work Within My Role as a Supervisor | PER-02 Dwayne Okafor | P0 | F14 |
| US-8.4 | Have Authorisation Enforced Server-Side on Every Mutating Operation | PER-04 Angela Pruitt | P0 | F14, F21 |
| US-8.5 | Manage Business Rules as Configuration | PER-03 Priya Raghavan | P1 | F15, F14 |
| US-8.6 | Preview and Audit the Effect of a Rule Change | PER-03 Priya Raghavan | P1 | F15, F12, F6 |
| US-9.1 | Navigate the Application with My Role Always Visible | PER-01 Marisol Reyes | P0 | F16 |
| US-9.2 | Work a Queue of Flagged Shipments | PER-01 Marisol Reyes | P0 | F17 |
| US-9.3 | Filter and Sort the Queue Deterministically | PER-02 Dwayne Okafor | P0 | F17 |
| US-9.4 | See Multi-Exception Shipments Without Collapsing | PER-01 Marisol Reyes | P0 | F17, F5 |
| US-9.5 | See the Whole Case on One Review Screen | PER-01 Marisol Reyes | P0 | F18 |
| US-9.6 | See What Changed After a Revalidation | PER-01 Marisol Reyes | P0 | F18, F6 |
| US-9.7 | Decide from a Screen That States the AI Recommends and I Decide | PER-01 Marisol Reyes | P0 | F19 |
| US-9.8 | Adjudicate a Recommendation from the Resolution Screen | PER-02 Dwayne Okafor | P0 | F19, F11 |
| US-9.9 | Replay the Complete Audit Trail on a Read-Only Screen | PER-04 Angela Pruitt | P0 | F20, F12 |
| US-10.1 | Have the Rule and Revalidation Behaviour Covered by Tests | PER-03 Priya Raghavan | P0 | F21, F4, F6 |
| US-10.2 | Have the Workflow, RBAC and Audit Claims Covered by Tests | PER-04 Angela Pruitt | P0 | F21, F9, F11, F12, F14 |
| US-10.3 | Have the Whole Walkthrough Covered End-to-End by One Test | PER-03 Priya Raghavan | P0 | F21, F22 |
| US-10.4 | Start and Reset a Demo-Ready Environment in One Command | PER-03 Priya Raghavan | P1 | F22, F2 |
| US-10.5 | Confirm the Environment Is Demo-Ready Before Presenting | PER-03 Priya Raghavan | P1 | F22 |
| US-11.1 | Step 1 — Show the Exception Queue | PER-04 Angela Pruitt | P0 | F17, F5, F2 |
| US-11.2 | Step 2 — Open a Flagged Shipment | PER-01 Marisol Reyes | P0 | F18, F0, F3 |
| US-11.3 | Step 3 — Show the AI-Generated Summary | PER-01 Marisol Reyes | P0 | F7, F18 |
| US-11.4 | Step 4 — Display the Triggering Rule and Evidence | PER-01 Marisol Reyes | P0 | F5, F4, F8, F19 |
| US-11.5 | Step 5 — Request a Missing Document | PER-01 Marisol Reyes | P0 | F10, F9, F13 |
| US-11.6 | Step 6 — Upload the Simulated Document | PER-01 Marisol Reyes | P0 | F10 |
| US-11.7 | Step 7 — Revalidate the Shipment | PER-01 Marisol Reyes | P0 | F6, F4 |
| US-11.8 | Step 8 — Specialist Recommends Clearance | PER-01 Marisol Reyes | P0 | F9, F8, F11 |
| US-11.9 | Step 9 — Supervisor Approves | PER-02 Dwayne Okafor | P0 | F11, F14, F13 |
| US-11.10 | Step 10 — Show the Complete Audit Trail | PER-04 Angela Pruitt | P0 | F12, F20 |
| US-11.11 | Survive an Unscripted, Out-of-Order Walkthrough | PER-04 Angela Pruitt | P0 | F22, F2, F17 |
| US-12.1 | Prevent the AI from Clearing a Shipment Autonomously | PER-04 Angela Pruitt | P0 | F8, F9, F12 |
| US-12.2 | Prevent a Specialist from Approving Their Own Recommendation | PER-02 Dwayne Okafor | P0 | F11, F14, F12 |
| US-12.3 | Prevent Any Path to Cleared Without a Named Approving Official | PER-04 Angela Pruitt | P0 | F11, F9, F6 |
| US-12.4 | Prevent Audit Records from Being Edited or Deleted | PER-04 Angela Pruitt | P0 | F12, F22 |
| US-12.5 | Prevent a Decision Without a Human-Authored Justification | PER-02 Dwayne Okafor | P0 | F9, F11, F12 |
| US-12.6 | Prevent Role Boundaries from Being Crossed | PER-03 Priya Raghavan | P0 | F14, F9, F15 |
| US-12.7 | Prevent Excluded Capabilities from Reappearing | PER-04 Angela Pruitt | P0 | F1, F4, F2, F14, F13, F7, F16 |

---

## Feature → Story Coverage

| Feature | Priority | Stories |
|---|---|---|
| F0: Cargo Entry Data Model & Persistence | P0 | US-0.1, US-11.2 |
| F1: Cargo Entry Ingestion (JSON / local API) | P0 | US-0.2, US-0.3, US-12.7 |
| F2: Synthetic Seed Dataset | P0 | US-0.4, US-10.4, US-11.1, US-11.11, US-12.7 |
| F3: Backend HTTP API | P0 | US-0.5, US-11.2 |
| F4: Configurable Business Rule Engine | P0 | US-1.1, US-1.2, US-1.3, US-1.4, US-10.1, US-11.4, US-11.7, US-12.7 |
| F5: Exception Detection, Evidence Capture & Flagging | P0 | US-1.1, US-1.2, US-1.3, US-1.5, US-9.4, US-11.1, US-11.4 |
| F6: Shipment Revalidation | P0 | US-1.6, US-1.7, US-4.4, US-8.6, US-9.6, US-10.1, US-11.7, US-12.3 |
| F7: AI Plain-Language Shipment Summary | P0 | US-2.1, US-2.2, US-2.3, US-11.3, US-12.7 |
| F8: AI Recommended Resolution with Confidence Level | P0 | US-2.2, US-2.3, US-2.4, US-2.5, US-11.4, US-11.8, US-12.1 |
| F9: Exception Case Workflow & User Actions | P0 | US-3.1–US-3.7, US-5.1, US-10.2, US-11.5, US-11.8, US-12.1, US-12.3, US-12.5, US-12.6 |
| F10: Document Request & Simulated Upload | P0 | US-3.2, US-4.1–US-4.5, US-11.5, US-11.6 |
| F11: Specialist → Supervisor Approval Chain | P0 | US-5.1–US-5.5, US-9.8, US-10.2, US-11.8, US-11.9, US-12.2, US-12.3, US-12.5 |
| F12: Decision & Audit Record | P0 | US-1.7, US-2.5, US-3.6, US-6.1–US-6.6, US-7.1, US-8.6, US-10.2, US-11.10, US-12.1, US-12.2, US-12.4, US-12.5 |
| F13: Notification Generation | P1 | US-1.7, US-5.3, US-5.4, US-7.1, US-7.2, US-11.5, US-11.9, US-12.7 |
| F14: Role Simulation & RBAC | P0 | US-0.3, US-0.5, US-4.2, US-8.1–US-8.4, US-10.2, US-11.9, US-12.2, US-12.6, US-12.7 |
| F15: Rule Administration | P1 | US-8.5, US-8.6, US-12.6 |
| F16: Application Shell, Navigation & Role Switcher | P0 | US-7.2, US-9.1, US-12.7 |
| F17: Cargo Exception Queue Screen | P0 | US-5.2, US-9.2, US-9.3, US-9.4, US-11.1, US-11.11 |
| F18: Shipment Review Screen | P0 | US-2.1, US-2.2, US-4.5, US-9.5, US-9.6, US-11.2, US-11.3 |
| F19: Recommended Resolution Screen | P0 | US-2.2, US-2.4, US-3.7, US-9.7, US-9.8, US-11.4 |
| F20: Decision & Audit Record Screen | P0 | US-2.2, US-6.4, US-6.5, US-7.2, US-9.9, US-11.10 |
| F21: Automated Test Suite | P0 | US-6.2, US-6.6, US-8.4, US-10.1, US-10.2, US-10.3 |
| F22: Demo Environment & Reset | P1 | US-2.3, US-6.3, US-10.3, US-10.4, US-10.5, US-11.11, US-12.4 |

**Coverage check:** all 23 PRD features (F0–F22) are referenced by at least one story. All ten walkthrough steps in PRD §3.2 have a dedicated story (US-11.1 – US-11.10). All governance constraints in PROJECT.md are expressed as negative stories in Epic 12.

---
