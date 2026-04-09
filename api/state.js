import { readStore, resetStore } from "./store.js";

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(readStore());
  }

  const shouldReset = req.method === "POST" && (req.query?.reset === "1" || req.query?.reset === "true");
  if (shouldReset) {
    return res.status(200).json(resetStore());
  }

  return res.status(405).json({ error: "Method not allowed" });
}
