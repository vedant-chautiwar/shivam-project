import fs from "fs";

const DATA_FILE = "/tmp/store.json";
const TOTAL = 68;

function seedStore() {
  const slots = [];

  for (let i = 0; i < TOTAL; i++) {
    let status = i < 50 ? "available" : "occupied"; // ✅ ensure availability

    slots.push({
      id: i + 1,
      status,
      vehicle: "",
      bookedBy: ""
    });
  }

  return { slots, allBookings: [] };
}

function readStore() {
  // ALWAYS reset (for demo)
  const store = seedStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store));
  return store;
}

export default function handler(req, res) {
  res.status(200).json(readStore());
}