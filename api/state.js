import fs from "fs";

const DATA_FILE = "/tmp/store.json";
const TOTAL = 68;

function seedStore() {
  const slots = [];
  for (let i = 0; i < TOTAL; i++) {
    slots.push({
      id: i + 1,
      status: Math.random() < 0.5 ? "available" : "occupied",
      vehicle: "",
      bookedBy: ""
    });
  }
  return { slots, allBookings: [] };
}

function readStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(seedStore()));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    return seedStore();
  }
}

export default function handler(req, res) {
  res.status(200).json(readStore());
}