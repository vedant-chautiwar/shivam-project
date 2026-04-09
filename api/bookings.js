import fs from "fs";

const DATA_FILE = "/tmp/store.json";

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    return { slots: [], allBookings: [] };
  }
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store));
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { vehicle, name, phone } = req.body || {};

  if (!vehicle || !name || !phone) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const store = readStore();
  const slot = store.slots.find(s => s.status === "available");

  if (!slot) {
    return res.status(409).json({ error: "No slots" });
  }

  slot.status = "reserved";
  slot.bookedBy = name;

  const booking = {
    vehicle,
    name,
    slot: slot.id
  };

  store.allBookings.unshift(booking);
  writeStore(store);

  res.status(201).json({ booking, slot });
}