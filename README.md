# shivam-project

Hybrid Parking Management System for malls and restaurants. Customers can check live availability and reserve slots online, while admin/staff users can register walk-in vehicles, release slots, and view centralized booking records.

## Run backend + frontend

1. Install dependencies

```bash
npm install
```

2. Start server

```bash
npm start
```

3. Open in browser

```text
http://localhost:3000
```

Data is shared and persisted in `data/store.json`, so bookings from one phone/device appear on other phones/devices connected to the same server.

## Demo logins

- User: `user1`, `user2`, or `user3` with password `1234`
- Admin/staff: `admin1` or `staff1` with password `1234`

## Working flows

- User dashboard: live availability, online reservation, active booking history.
- Admin dashboard: real-time slot map, walk-in entry, manual slot release, all bookings, reports.
- Timeout release: online reservations are held for 15 minutes and are automatically released during live sync if unused.
