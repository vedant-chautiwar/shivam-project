import { releaseSlotById } from "../../store.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const id = req.query?.id;
  const result = releaseSlotById(id);

  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }

  return res.status(200).json({ success: true, slot: result.slot });
}
