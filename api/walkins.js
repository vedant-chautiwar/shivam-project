import { addWalkin } from "./store.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { vehicle, name, slotId, loc } = req.body || {};

  if (!vehicle) {
    return res.status(400).json({ error: "Vehicle required" });
  }

  const result = addWalkin({ vehicle, name: name || "-", slotId, loc });
  if (result.error) {
    return res.status(409).json({ error: result.error });
  }

  return res.status(201).json({ success: true, booking: result.booking, slot: result.slot });
}
