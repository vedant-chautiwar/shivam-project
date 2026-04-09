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

  const id = new URL(req.url, "http://x").searchParams.get("id");

  const store = readStore();
  const slot = store.slots.find(s => s.id === Number(id));

  if (!slot) {
    return res.status(404).json({ error: "Not found" });
  }

  slot.status = "available";
  slot.vehicle = "";
  slot.bookedBy = "";

  writeStore(store);

  res.json({ success: true });
}