import { releaseSlotById } from "./store.js";

function getSlotId(req) {
  const url = new URL(req.url, "http://localhost");
  const queryId = url.searchParams.get("id");
  if (queryId) {
    return queryId;
  }

  const match = url.pathname.match(/\/slots\/(\d+)\/release$/);
  return match ? match[1] : null;
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const slotId = getSlotId(req);
  const result = releaseSlotById(slotId);

  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }

  return res.status(200).json({ success: true, slot: result.slot });
}
