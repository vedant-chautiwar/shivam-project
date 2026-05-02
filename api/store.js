import fs from "fs";
import path from "path";

const TOTAL = 68;
const AVAILABLE_SLOTS = 50;
const RESERVATION_TIMEOUT_MINUTES = 15;
const DATA_FILE = process.env.VERCEL
  ? "/tmp/store.json"
  : path.join(process.cwd(), "data", "store.json");

function nowTime() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function bookingId() {
  return "BK" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function slotLabel(slotId) {
  return `P${String(slotId).padStart(2, "0")}`;
}

function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function minutesUntil(isoDate) {
  if (!isoDate) {
    return null;
  }

  const remaining = Math.ceil((new Date(isoDate).getTime() - Date.now()) / 60000);
  return Number.isFinite(remaining) ? Math.max(0, remaining) : null;
}

function baseSlots() {
  return Array.from({ length: TOTAL }, (_, idx) => {
    const id = idx + 1;
    return {
      id,
      status: idx < AVAILABLE_SLOTS ? "available" : "occupied",
      vehicle: "",
      bookedBy: "",
      timer: null,
      reservedUntil: null,
      loc: id <= 40 ? "Mall" : "Restaurant",
      type: "Online"
    };
  });
}

function baseState() {
  return {
    slots: baseSlots(),
    activities: [],
    allBookings: [],
    walkins: [],
    updatedAt: new Date().toISOString()
  };
}

function normalizeStore(store) {
  const fallback = baseState();

  if (!store || typeof store !== "object") {
    return fallback;
  }

  const slots = (Array.isArray(store.slots) ? store.slots : fallback.slots).map((slot, idx) => ({
    ...fallback.slots[idx],
    ...slot,
    reservedUntil: slot?.reservedUntil || null
  }));

  return {
    ...fallback,
    ...store,
    slots,
    activities: Array.isArray(store.activities) ? store.activities : [],
    allBookings: Array.isArray(store.allBookings) ? store.allBookings : [],
    walkins: Array.isArray(store.walkins) ? store.walkins : []
  };
}

function releaseExpiredReservations(store) {
  let changed = false;

  store.slots.forEach(slot => {
    if (slot.status !== "reserved") {
      return;
    }

    if (!slot.reservedUntil && slot.timer) {
      slot.reservedUntil = minutesFromNow(slot.timer);
      changed = true;
    }

    const remaining = minutesUntil(slot.reservedUntil);
    slot.timer = remaining;

    if (remaining !== null && remaining <= 0) {
      const activeBooking = store.allBookings.find(
        booking => booking.slot === slot.id && booking.status === "Reserved"
      );

      if (activeBooking) {
        activeBooking.status = "Released";
        activeBooking.releaseReason = "Auto timeout";
      }

      store.activities.unshift({
        type: "release",
        text: `Slot ${slotLabel(slot.id)} auto-released after timeout`,
        time: "just now"
      });

      slot.status = "available";
      slot.vehicle = "";
      slot.bookedBy = "";
      slot.timer = null;
      slot.reservedUntil = null;
      slot.type = "Online";
      changed = true;
    }
  });

  if (changed) {
    store.activities = store.activities.slice(0, 30);
    store.updatedAt = new Date().toISOString();
  }

  return changed;
}

function ensureDataDir() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    return true;
  } catch {
    return false;
  }
}

export function readStore() {
  ensureDataDir();

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const store = normalizeStore(JSON.parse(raw));
    if (releaseExpiredReservations(store)) {
      writeStore(store);
    }
    return store;
  } catch {
    const seeded = baseState();
    writeStore(seeded);
    return seeded;
  }
}

export function writeStore(store) {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(normalizeStore(store), null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function resetStore() {
  const seeded = baseState();
  writeStore(seeded);
  return seeded;
}

export function reserveSlot({ vehicle, name, phone, slotIdPreferred = 0, dur = "2 hrs", loc, user = null }) {
  const store = readStore();

  let slot = null;
  if (slotIdPreferred) {
    slot = store.slots.find(s => s.id === Number(slotIdPreferred) && s.status === "available");
  }
  if (!slot) {
    slot = store.slots.find(s => s.status === "available");
  }

  if (!slot) {
    return { error: "No slots" };
  }

  slot.status = "reserved";
  slot.vehicle = "";
  slot.bookedBy = name;
  slot.reservedUntil = minutesFromNow(RESERVATION_TIMEOUT_MINUTES);
  slot.timer = RESERVATION_TIMEOUT_MINUTES;
  slot.type = "Online";
  if (loc) {
    slot.loc = loc;
  }

  const booking = {
    id: bookingId(),
    type: "Online",
    slot: slot.id,
    vehicle,
    name,
    phone,
    user,
    loc: slot.loc,
    dur,
    time: nowTime(),
    reservedUntil: slot.reservedUntil,
    status: "Reserved"
  };

  store.allBookings.unshift(booking);
  store.activities.unshift({
    type: "reserve",
    text: `Online booking by ${name} - slot ${slotLabel(slot.id)}`,
    time: "just now"
  });

  store.updatedAt = new Date().toISOString();
  writeStore(store);

  return { booking, slot, store };
}

export function addWalkin({ vehicle, name = "-", slotId = 0, loc }) {
  const store = readStore();

  let slot = null;
  if (slotId) {
    slot = store.slots.find(s => s.id === Number(slotId) && s.status === "available");
  }
  if (!slot) {
    slot = store.slots.find(s => s.status === "available");
  }

  if (!slot) {
    return { error: "No slots" };
  }

  slot.status = "occupied";
  slot.vehicle = vehicle;
  slot.bookedBy = "";
  slot.timer = null;
  slot.reservedUntil = null;
  slot.type = "Walk-in";
  if (loc) {
    slot.loc = loc === "mall" ? "Mall" : loc === "restaurant" ? "Restaurant" : loc;
  }

  const booking = {
    id: bookingId(),
    type: "Walk-in",
    slot: slot.id,
    vehicle,
    name,
    user: null,
    loc: slot.loc,
    dur: "-",
    time: nowTime(),
    status: "Active"
  };

  store.allBookings.unshift(booking);
  store.walkins.unshift({
    slot: slot.id,
    vehicle,
    name,
    loc: slot.loc,
    time: booking.time
  });

  store.activities.unshift({
    type: "check-in",
    text: `${vehicle} checked in - slot ${slotLabel(slot.id)}`,
    time: "just now"
  });

  store.updatedAt = new Date().toISOString();
  writeStore(store);

  return { booking, slot, store };
}

export function releaseSlotById(id) {
  const numericId = Number(id);
  if (!numericId) {
    return { error: "Invalid slot id", status: 400 };
  }

  const store = readStore();
  const slot = store.slots.find(s => s.id === numericId);

  if (!slot) {
    return { error: "Not found", status: 404 };
  }

  if (slot.status !== "available") {
    slot.status = "available";
    slot.vehicle = "";
    slot.bookedBy = "";
    slot.timer = null;
    slot.reservedUntil = null;
    slot.type = "Online";

    const activeBooking = store.allBookings.find(
      booking => booking.slot === numericId && (booking.status === "Reserved" || booking.status === "Active")
    );

    if (activeBooking) {
      activeBooking.status = "Released";
    }

    store.activities.unshift({
      type: "release",
      text: `Slot ${slotLabel(numericId)} released`,
      time: "just now"
    });

    store.updatedAt = new Date().toISOString();
    writeStore(store);
  }

  return { success: true, slot };
}
