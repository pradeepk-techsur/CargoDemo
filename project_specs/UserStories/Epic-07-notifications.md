
## Epic 7: Notification Generation (F13)

Notifications recorded and surfaced in-app on every decision and state change — and visibly never transmitted.

### US-7.1: Have a Notification Generated on Every Decision and State Change
**As a** Dwayne Okafor (Supervisor), **I want to** a notification to be generated and recorded for every case state change and every decision, **so that** a recommendation can never sit unnoticed and every decision has a communication record attached to it.

**Acceptance Criteria:**
- [ ] A notification is generated on document request, document upload, revalidation, recommendation, approval, rejection, return-for-information, hold and escalation
- [ ] Each notification records recipient role, optional recipient user, subject, plain-language body, related shipment and case, and a generation timestamp
- [ ] Each notification is persisted and linked to the audit entry that produced it, in the same transaction
- [ ] The audit entry's generated-notification field is populated from that link
- [ ] Exactly one notification is produced per case action — never zero, never two
- [ ] A state change without its notification is structurally impossible because both are written in one transaction

**Priority:** P1 | **Feature Ref:** F13, F12

---

### US-7.2: See Notifications In-App and Know They Were Never Sent
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** notifications to be visible in the application and explicitly labelled as generated rather than transmitted, **so that** I am never misled into thinking real correspondence left the system.

**Acceptance Criteria:**
- [ ] A notification indicator in the application shell gives access to an in-app notification list
- [ ] A per-case notification list is available and each notification carries a read state
- [ ] Every notification displays the fixed label "Generated, not transmitted"
- [ ] Notifications are shown on the Decision & Audit Record screen alongside the decisions that produced them
- [ ] Every notification record carries `transmitted: false`
- [ ] No email, SMS or other outbound transport client exists anywhere in the codebase, and no network egress occurs on notification generation

**Priority:** P1 | **Feature Ref:** F13, F16, F20

---
