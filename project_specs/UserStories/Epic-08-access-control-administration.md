
## Epic 8: Access Control & Rule Administration (F14)

Three roles, a simulated login that still produces a named acting user, server-side enforcement everywhere, and rules that the policy owner can change without a developer.

### US-8.1: Enter the Application as a Named Acting User
**As a** Priya Raghavan (System Administrator), **I want to** a simulated login and role selector that establishes a named acting user, **so that** every action is attributable even though production authentication is out of scope.

**Acceptance Criteria:**
- [ ] Exactly three roles exist: Cargo Specialist, Supervisor, System Administrator
- [ ] The role selector establishes a named user and role for the session, drawn from seeded users
- [ ] The current user name and role are always visible in the application shell
- [ ] The acting user's name and role are stamped on every audit entry
- [ ] The login surface is visibly labelled as simulated, and a demo-mode indicator is present
- [ ] No PIV/CAC, SSO or external identity provider integration exists
- [ ] Seed data contains at least two Supervisors, so the supervisor-recommends path is demonstrable rather than deadlocked
- [ ] An expired or invalid session gates the UI behind the role selector and returns `SESSION_INVALID` from the API

**Priority:** P0 | **Feature Ref:** F14

---

### US-8.2: Work Within My Role as a Cargo Specialist
**As a** Marisol Reyes (Cargo Specialist), **I want to** be able to do everything my role permits and nothing it does not, **so that** the boundary of my authority is real rather than procedural.

**Acceptance Criteria:**
- [ ] A Cargo Specialist can work the queue, review shipments, request documents, upload simulated documents, revalidate, take the five actions and recommend clearance
- [ ] A Cargo Specialist cannot approve a clearance: the approval endpoint returns `403 FORBIDDEN_ROLE`
- [ ] A Cargo Specialist cannot create, edit, enable or disable a rule: the rule endpoints return `403 FORBIDDEN_ROLE`
- [ ] A Cargo Specialist cannot reset the environment or reseed data
- [ ] Administrator-only surfaces are hidden from the specialist's navigation
- [ ] Cross-case audit search is not offered to a specialist and is denied by the server
- [ ] Every denial writes an `ACCESS_DENIED` audit entry naming the user, the role, the attempted operation and the reason

**Priority:** P0 | **Feature Ref:** F14

---

### US-8.3: Work Within My Role as a Supervisor
**As a** Dwayne Okafor (Supervisor), **I want to** everything a specialist can do plus approval authority and full queue visibility, **so that** I can oversee the team and adjudicate their recommendations.

**Acceptance Criteria:**
- [ ] A Supervisor can take all five user actions and can approve, reject or return a pending recommendation
- [ ] A Supervisor can view all cases regardless of assignment, and can filter the queue across the whole team
- [ ] A Supervisor can act on an `ESCALATED` case, which specialists cannot
- [ ] A Supervisor cannot create, edit, enable or disable a rule: the rule endpoints return `403 FORBIDDEN_ROLE`
- [ ] A Supervisor cannot reset the environment or reseed data
- [ ] A Supervisor can read cross-case audit history filtered by actor, event type and date range

**Priority:** P0 | **Feature Ref:** F14

---

### US-8.4: Have Authorisation Enforced Server-Side on Every Mutating Operation
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** role checks to be enforced by the server and not merely by hidden buttons, **so that** the governance claim survives someone calling the API directly.

**Acceptance Criteria:**
- [ ] Every mutating endpoint authorises the acting role server-side, independently of any client state
- [ ] Hiding or disabling a control in the UI is never the only enforcement for any operation
- [ ] Unauthorised attempts are rejected with `403 FORBIDDEN_ROLE` and logged as an audit entry
- [ ] A System Administrator attempting any workflow action, approval, upload or revalidation (other than via the rule-change path) is rejected with `FORBIDDEN_ROLE`
- [ ] An automated test exercises each of the three roles against each protected operation and asserts the expected allow/deny outcome
- [ ] 100% of protected operations reject unauthorised roles server-side, verified by test

**Priority:** P0 | **Feature Ref:** F14, F21

---

### US-8.5: Manage Business Rules as Configuration
**As a** Priya Raghavan (System Administrator), **I want to** list, create, edit, enable and disable rules and edit their parameters through the application, **so that** I can change what the system flags with no code change and no redeploy.

**Acceptance Criteria:**
- [ ] The rule list shows every rule with its exception type, severity, enabled state and policy reference
- [ ] Rules can be created, edited, enabled and disabled within the three supported exception types only; a fourth type cannot be created
- [ ] Editable parameters include required document types, HTS expected digit count and format, origin-comparison fields, value thresholds, severity and priority mapping
- [ ] Rule definitions are validated on save and malformed configuration is rejected with a clear message naming the failing field, and never reaches validation
- [ ] Changing a rule parameter changes validation results with zero code changes and zero redeploys
- [ ] Rule CRUD is restricted to the System Administrator role and denied to Cargo Specialist and Supervisor server-side
- [ ] A System Administrator cannot adjudicate or approve a shipment; such attempts are rejected server-side and logged

**Priority:** P1 | **Feature Ref:** F15, F14

---

### US-8.6: Preview and Audit the Effect of a Rule Change
**As a** Priya Raghavan (System Administrator), **I want to** see which shipments a rule change would affect and have the change recorded under my name, **so that** configuration drift is both predictable and traceable.

**Acceptance Criteria:**
- [ ] Saving a rule change offers either an impact preview naming the shipments whose validation results would change, or the option to revalidate affected shipments
- [ ] Revalidating affected shipments runs through the standard revalidation path with `trigger = RULE_CHANGE`
- [ ] Exceptions resolved by a rule change record a resolution reason of `RULE_DISABLED` or `RULE_PARAMS_CHANGED`
- [ ] Every rule create, update, enable and disable writes an audit entry attributed to the administrator with a timestamp
- [ ] The rule version and rule-set fingerprint change on every saved edit, so the configuration in force at any past evaluation is recoverable
- [ ] A rule change never modifies a `CLEARED` case

**Priority:** P1 | **Feature Ref:** F15, F12, F6

---
