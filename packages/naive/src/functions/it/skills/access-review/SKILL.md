---
name: access-review
description: >
  Review who and which agent role can reach each outside system the venture
  connects, and keep that access to the least the work needs: MFA on high-impact
  accounts, one scoped credential per agent role, no shared admin keys, leavers
  revoked, rotation and restore tests on schedule. Use in the IT intake and the
  quarterly access review whenever a connection record is written.
---

# Access review

Use this when a workflow step writes or reviews a connection (`it/connections/[id]`). It draws on CIS Controls v8.1 Implementation Group 1 (Controls 5, account management, and 6, access control management), the NIST Cybersecurity Framework 2.0 (PR.AA, identity management, authentication and access control) and the OWASP Top 10 for LLM Applications 2025 (LLM06, Excessive Agency). You may narrow access yourself; widening it is the founder's decision.

## 1. MFA on high-impact accounts

List every account that can move money, change DNS, push code or read customer data. Each one needs multi-factor authentication (CIS Controls v8.1, Control 6). The count without MFA should be zero; report each exception with the owner who can turn it on.

## 2. One scoped credential per agent role

- Every agent role that acts in an outside system has its own credential, never a person's credential or a shared admin key (OWASP LLM06).
- Each credential holds the narrowest scope that does that role's work. A delegated role never holds wider access than the role that delegated to it (compare with `governance/delegation`).
- High-impact actions (spend, delete, publish, permission change) need a person's approval in the system that carries them out, not only in the agent's instructions. On the connection, each such action names its decision class: public-commitment for a send, spend-money for a payment, legal-or-terms for a signature. `node packages/naive/src/checks/check-connections.ts` refuses one without it.
- Name credentials by variable name only. Never read or write a secret's value.

## 3. Least privilege, each quarter

For each connection, compare the scopes each person and role holds with what its work used in the quarter (from traces, provenance and the system's own logs where the connection reads them). Remove what was not used: that is security-tightening, which you decide. Any request for more is security-loosening, which goes to the founder with the reason and the narrowest scope that would do.

## 4. Leavers and retired roles

When a person leaves or an agent role is retired, revoke all its access within a day and record when (an inference from CIS Controls 5 and 6; the exact window varies). In the quarterly review, any access still held by a leaver is a finding.

## 5. Rotation, patching and restore

- Record each credential's last rotation date and flag any older than the venture's policy.
- Critical and high security updates should be applied within 14 days of release (UK Cyber Essentials).
- The venture's records should be backed up, and a restore tested at least each quarter (CIS Controls v8.1, Control 11). An untested backup is reported as untested.

## 6. Tools against spend

Compare connections with the spend register (`finance/spend/[id]`). A paid tool with no connection or no use this quarter is a cancel-or-downgrade decision for the founder; a connection with no spend line where the tool is paid is a gap for finance. You never write the spend register.
