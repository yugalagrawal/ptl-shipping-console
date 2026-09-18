# PTL Shipping Console

A high-fidelity product prototype for **LetsTransport's PTL (Part Truck Load) shipping platform** — the internal console operations, sales, finance, and partner teams use to manage clients, pickups, pricing, and the partner network.

Built and iterated by me as a Product Manager, using React + AI-assisted prototyping to move directly from concept to a clickable, realistic UI — skipping the low-fidelity wireframe stage to test flows with real stakeholders faster.

> This is a **prototype**, not the production app. All data (clients, users, pickups) is mocked for demonstration.

## Modules

- **Create Pickup** — the core pickup-scheduling flow, including consignor/consignee selection, PRS (Pickup Request Slip) date calendars, and validation rules
- **Client Module** — client onboarding, standard pricing configuration, and email logs
- **Partner Module** — partner onboarding and network management
- **Order Module** — order lifecycle and tracking
- **User Module** — internal user/role management

## Stack

React 19 · Vite · Tailwind CSS · React Router

## Running locally

```bash
npm install
npm run dev
```

## Design docs

The [`design-docs/`](./design-docs) folder has standalone HTML references for the design system, network simulator, and module-specific specs used while building this out.
