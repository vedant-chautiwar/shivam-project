import { reserveSlot } from "./store.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { vehicle, name, phone, slotIdPreferred, dur, loc, user } = req.body || {};

  if (!vehicle || !name || !phone) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const result = reserveSlot({ vehicle, name, phone, slotIdPreferred, dur, loc, user: user || null });

  if (result.error) {
    return res.status(409).json({ error: result.error });
  }

  return res.status(201).json({ booking: result.booking, slot: result.slot });
}
