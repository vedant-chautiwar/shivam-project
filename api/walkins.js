import fs from "fs";

const DATA_FILE = "/tmp/store.json";

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    return { slots: [] };
  }
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store));
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { vehicle } = req.body || {};

  if (!vehicle) {
    return res.status(400).json({ error: "Vehicle required" });
  }

  const store = readStore();
  const slot = store.slots.find(s => s.status === "available");

  if (!slot) {
    return res.status(409).json({ error: "No slots" });
  }

  slot.status = "occupied";
  slot.vehicle = vehicle;

  writeStore(store);

  res.json({ success: true });
}