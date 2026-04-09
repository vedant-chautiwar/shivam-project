import fs from "fs";

const TOTAL = 68;
const DATA_FILE = "/tmp/store.json";

// ---------- helpers ----------
function rnd(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPlate() {
  return (
    rnd(["MH","DL","KA","TN","GJ"]) + " " +
    rnd(["01","02","03","05"]) + " " +
    rnd(["AB","CD","EF","GH"]) + " " +
    (Math.floor(Math.random()*9000)+1000)
  );
}

function genId() {
  return "BK" + Math.random().toString(36).substring(2,8).toUpperCase();
}

function nowTime() {
  return new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
}

function seedStore() {
  const slots = [];
  for (let i = 0; i < TOTAL; i++) {
    let status = Math.random() < 0.5 ? "available" : "occupied";

    slots.push({
      id: i + 1,
      status,
      vehicle: status === "occupied" ? randomPlate() : "",
      bookedBy: "",
      timer: null
    });
  }

  return {
    slots,
    allBookings: []
  };
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

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store));
}

// ---------- MAIN HANDLER ----------
export default function handler(req, res) {
  try {
    const url = req.url;

    // ✅ GET /api/state
    if (req.method === "GET" && url.includes("/api/state")) {
      return res.status(200).json(readStore());
    }

    // ✅ POST /api/bookings
    if (req.method === "POST" && url.includes("/api/bookings")) {
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
        id: genId(),
        vehicle,
        name,
        slot: slot.id,
        time: nowTime()
      };

      store.allBookings.unshift(booking);
      writeStore(store);

      return res.status(201).json({ booking, slot });
    }

    // ✅ POST /api/walkins
    if (req.method === "POST" && url.includes("/api/walkins")) {
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

      return res.json({ success: true });
    }

    // ✅ POST /api/release?id=5
    if (req.method === "POST" && url.includes("/api/release")) {
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

      return res.json({ success: true });
    }

    return res.status(404).json({ error: "Route not found" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}