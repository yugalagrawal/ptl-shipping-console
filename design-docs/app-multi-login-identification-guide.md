# App Multi-Login Identification Guide

**Product:** FLOW (web portal) and PTL APP (mobile)
**Owner:** Yugal Agarwal, Product
**Status:** Draft for review
**Last updated:** 6 Oct 2026

---

## 1. Why this guide exists

FLOW is used by three very different kinds of people: our own **LT Team**, our **Clients** who book shipments, and our **Partners** who move them. All three sign in through the same front door.

Today the login screen asks people to tell us who they are by picking LT Team, Partner or Client, and then choosing their name from a demo list. That works for a prototype. It cannot work for a real product, because a real person will only type their phone number or email, and the system has to work out the rest.

This guide explains **how the app will recognise who someone is the moment they sign in**, what we need to store to make that possible, and what rules keep the wrong person out of the wrong place.

## 2. The one-line answer

> **Every person belongs to exactly one organization, and the type of that organization decides what kind of user they are.**

- Belongs to **LetsTransport** → LT Team
- Belongs to an organization created in **Client Onboarding** → Client
- Belongs to an organization created in **Partner Onboarding** → Partner

The user never chooses their own type. We read it from the organization they were created under.

## 3. Who the three user types are

| | LT Team | Client | Partner |
|---|---|---|---|
| **Who they are** | Our employees: ops, supply, finance, admin, tech | Brands and businesses that book pickups and shipments with us | Agents, co-loaders, franchises, fleet owners, drivers who execute the move |
| **Where their organization comes from** | LetsTransport itself | Client Onboarding | Partner Onboarding |
| **Who creates their login** | Admin, in User Management | Created after the client is approved and activated | Created after the partner is approved and activated |
| **What they see** | Modules based on their role and permissions | Their own orders, tracking and invoices | Their own trips, tracking and invoices |
| **What they must never see** | – | Other clients' data | Other partners' data, or order booking |

## 4. How a person is identified when they sign in

1. The person opens FLOW or PTL APP and types their **mobile number or email**. Nothing else, no persona tab.
2. The system looks that number or email up in one list of known accounts.
3. If it finds a match, it reads three saved facts about that person: **organization type**, **which organization**, and **their role inside it**.
4. It sends a one-time password (OTP) to that number or email.
5. When the OTP is right, the person lands in the right experience: LT Team sees the full console for their role, a Client sees the client view, a Partner sees the partner view.
6. If there is no match, the person sees a polite message: *"We couldn't find this account. Please contact LT Support."* We do not say which organizations exist.

**The key point:** the choice happens when the account is *created*, by a human with the right authority. At sign-in, the system only *reads* it.

## 5. What we store about each user

Each login needs these facts saved against it:

- **Name, mobile, email** (mobile and email are each unique across the whole system)
- **Organization type:** LT Team, Client or Partner
- **Organization:** the exact client or partner it belongs to (we store an ID, not just a name)
- **Role within the organization:** for example Owner, Operations, Finance, Driver
- **Status:** Active or Disabled

We store the organization by **ID**, not by name. Two companies can share a name (a brand that is both a client and a transporter, for example), and a name match would mix them up.

## 6. Where each type of user comes from

**LT Team.** Created only by an Admin in *Admin > User Management*. They get a role (Finance Manager, Supply Executive and so on), which already controls what they can see. "LetsTransport" is **not** a choice a client or partner admin can pick when adding someone. This protects us from anyone giving themselves LT access.

**Clients.** When a client is onboarded, we already collect their contact people (POC, operations and finance emails and mobile numbers). Once the client is **approved and active**, their organization becomes available when adding users.

**Partners.** Same idea. Partner Onboarding collects the POC mobile and email. Once the partner is **approved and active**, their organization becomes available. In User Management today, the Organization field already works this way for external partners.

## 7. The rules that keep it safe

1. **One login, one organization.** A mobile number or email belongs to one person in one organization. If we need someone in two, they get two logins (or we add a workspace switcher later, see section 10).
2. **Only active organizations are selectable.** A client still in onboarding or waiting for pricing approval, or a partner still in KYC, cannot have users yet. No contract, no login.
3. **If the organization stops, the login stops.** If a client or partner is deactivated, all its users lose access at the next sign-in. Nothing needs to be turned off person by person.
4. **Only the right people can add external users.** An LT Admin, or the organization's registered point of contact, can add a user under a client or partner. The OTP goes only to a number or email that is registered for that organization.
5. **Disable, never delete.** When someone leaves, we switch their account off but keep the history, so past orders, pickups and audit trails still make sense.
6. **Every screen checks, not just the menu.** Hiding menu items is not security. Every request to the server must confirm that this person's type and organization allow what they are asking for.

## 8. What each person experiences

- **Anita from Oriflame (Client):** types her work email, gets an OTP, enters it, and lands on her own dashboard with only Oriflame's orders and invoices.
- **Rakesh from Speedex Logistics (Partner):** types his mobile number, gets an OTP, and sees his trips and invoices. He cannot create orders.
- **Priya from LetsTransport (LT Team):** signs in and sees the modules her role allows.
- **Someone we don't know:** gets a gentle "contact LT Support" message and nothing else.

## 9. What changes from today

| Today (prototype) | Target |
|---|---|
| User picks LT Team / Partner / Client tab | No tabs. System decides from the saved account |
| Demo dropdown of users | Real lookup by mobile or email |
| Password field (not used) | OTP to the registered mobile or email |
| Partner users saved with only a name and email | Every user saved with organization type, organization ID, role and status |
| Users not linked to a client organization | Client users linked to the organization created in Client Onboarding |
| Menu hidden by role only | Same, plus a server-side check on every request |

The mobile app (PTL APP) already shows the right *behaviour*: it detects the role from what is typed. It does this against a small demo list, which must be replaced with the real account list above.

## 10. Open questions for review

1. **Can one person belong to more than one organization?** For example a contact who works with two clients, or someone who is both a client contact and a partner contact. *Recommendation: no for now. One login, one organization. Add a workspace switcher only if real cases show up.*
2. **Will drivers and riders sign in themselves?** If yes, they need their own accounts under the partner's organization, with a Driver role. *Recommendation: yes, in the mobile app, created by the partner's point of contact and approved by LT.*
3. **Should LT staff use company sign-in (Google or Microsoft) instead of an OTP?** *Recommendation: yes, for LT Team only.*
4. **Who approves a new external user?** Partner's POC alone, or LT Admin as well? *Recommendation: POC creates, LT Admin approves, at least at first.*
5. **What happens when a phone number changes?** *Recommendation: OTP on both the old and the new number.*

## 11. How we will know it works

- 100% of sign-ins resolve to exactly one organization type, with no manual choice.
- Zero cases of a client seeing another client's data, or a partner seeing client booking screens.
- A person added today can sign in with an OTP within minutes, with no help from tech.
- Deactivating an organization blocks all its users at the next sign-in.

## 12. Suggested build order

1. Add organization type, organization ID, role and status to every user, and back-fill existing users.
2. Limit the Organization list in User Management to active clients and partners, and keep "LetsTransport" for Admin-created LT users only.
3. Build the real lookup by mobile or email, and the OTP sign-in.
4. Remove the persona tabs and the demo dropdown from the login screens (FLOW and PTL APP).
5. Add the server-side checks on every request.
6. Add the optional extras: workspace switcher, company sign-in for LT, driver self-sign-in.
