const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const TOTAL = 68;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

app.use(express.json());
app.use(express.static(__dirname));

function rnd(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPlate() {
  return (
    rnd(['MH', 'DL', 'KA', 'TN', 'GJ']) +
    ' ' +
    rnd(['01', '02', '03', '05']) +
    ' ' +
    rnd(['AB', 'CD', 'EF', 'GH']) +
    ' ' +
    (Math.floor(Math.random() * 9000) + 1000)
  );
}

function randomName() {
  return rnd(['Amit K.', 'Priya S.', 'Rahul M.', 'Sneha P.', 'Vijay R.', 'Kavya T.', 'Arjun D.', 'Meena L.', 'Rohan B.', 'Nisha T.']);
}

function slotLabel(id) {
  return 'P' + (id <= 9 ? '0' : '') + id;
}

function genId() {
  return 'BK' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function nowTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function seedStore() {
  const slots = [];
  for (let i = 0; i < TOTAL; i += 1) {
    const r = Math.random();
    let status = r < 0.47 ? 'available' : r < 0.88 ? 'occupied' : 'reserved';
    if (i < 4) {
      status = 'available';
    }
    const vehicle = status === 'occupied' ? randomPlate() : '';
    const bookedBy = status === 'reserved' ? randomName() : '';
    const timer = status === 'reserved' ? Math.floor(Math.random() * 13 + 2) : null;
    const loc = i < 40 ? 'Mall' : 'Restaurant';
    slots.push({ id: i + 1, status, vehicle, bookedBy, timer, loc, type: status === 'occupied' ? 'Walk-in' : 'Online' });
  }

  const activities = [
    { type: 'check-in', text: 'MH 01 AB 3345 checked in - slot P14', time: '2 min ago' },
    { type: 'reserve', text: 'Online booking confirmed - P22 by Priya S.', time: '5 min ago' },
    { type: 'release', text: 'Slot P07 auto-released after timeout', time: '12 min ago' },
    { type: 'check-out', text: 'MH 02 CD 7890 checked out - slot P31', time: '18 min ago' },
    { type: 'check-in', text: 'MH 03 EF 1122 checked in - slot P05', time: '24 min ago' },
    { type: 'reserve', text: 'Walk-in assigned to slot P41', time: '31 min ago' },
  ];

  const walkins = slots
    .filter((s) => s.status === 'occupied')
    .slice(0, 8)
    .map((s) => ({ slot: s.id, vehicle: s.vehicle, name: randomName(), loc: s.loc, time: nowTime() }));

  const allBookings = [
    ...slots
      .filter((s) => s.status === 'occupied')
      .slice(0, 5)
      .map((s) => ({
        id: genId(),
        type: 'Walk-in',
        slot: s.id,
        vehicle: s.vehicle,
        name: randomName(),
        user: null,
        loc: s.loc,
        dur: '-',
        time: nowTime(),
        status: 'Active',
      })),
    ...slots
      .filter((s) => s.status === 'reserved')
      .slice(0, 5)
      .map((s) => ({
        id: genId(),
        type: 'Online',
        slot: s.id,
        vehicle: '-',
        name: s.bookedBy,
        user: null,
        loc: s.loc,
        dur: '3 hrs',
        time: nowTime(),
        status: 'Reserved',
      })),
  ];

  return {
    slots,
    activities,
    allBookings,
    walkins,
    updatedAt: new Date().toISOString(),
  };
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(seedStore(), null, 2), 'utf8');
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeStore(store) {
  store.updatedAt = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

app.get('/api/state', (req, res) => {
  const store = readStore();
  res.json(store);
});

app.post('/api/bookings', (req, res) => {
  const { vehicle, name, phone, slotIdPreferred, dur, loc, user } = req.body;

  if (!vehicle || !name || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const store = readStore();
  const available = store.slots.filter((s) => s.status === 'available');
  if (!available.length) {
    return res.status(409).json({ error: 'No available slots' });
  }

  let chosen = available[0];
  if (slotIdPreferred) {
    const preferred = store.slots.find((s) => s.id === Number(slotIdPreferred) && s.status === 'available');
    if (preferred) {
      chosen = preferred;
    }
  }

  const bookingId = genId();
  const location = loc === 'Restaurant' ? 'Restaurant' : 'Mall';
  chosen.status = 'reserved';
  chosen.bookedBy = name;
  chosen.timer = 15;
  chosen.loc = location;
  chosen.type = 'Online';

  const entry = {
    id: bookingId,
    type: 'Online',
    slot: chosen.id,
    vehicle,
    name,
    user: user || null,
    loc: location,
    dur: dur || '2 hrs',
    time: nowTime(),
    status: 'Reserved',
  };

  store.allBookings.unshift(entry);
  store.activities.unshift({ type: 'reserve', text: `Online booking by ${name} - slot ${slotLabel(chosen.id)}`, time: 'just now' });
  writeStore(store);

  return res.status(201).json({ booking: entry, slot: chosen });
});

app.post('/api/walkins', (req, res) => {
  const { vehicle, name, slotId, loc } = req.body;
  if (!vehicle) {
    return res.status(400).json({ error: 'Vehicle is required' });
  }

  const store = readStore();
  const available = store.slots.filter((s) => s.status === 'available');
  if (!available.length) {
    return res.status(409).json({ error: 'No available slots' });
  }

  let chosen = available[0];
  if (slotId) {
    const preferred = store.slots.find((s) => s.id === Number(slotId) && s.status === 'available');
    if (preferred) {
      chosen = preferred;
    }
  }

  const location = loc === 'Restaurant' ? 'Restaurant' : 'Mall';
  chosen.status = 'occupied';
  chosen.vehicle = vehicle;
  chosen.type = 'Walk-in';
  chosen.loc = location;
  chosen.bookedBy = '';
  chosen.timer = null;

  const booking = {
    id: genId(),
    type: 'Walk-in',
    slot: chosen.id,
    vehicle,
    name: name || '-',
    user: null,
    loc: location,
    dur: '-',
    time: nowTime(),
    status: 'Active',
  };

  store.allBookings.unshift(booking);
  store.walkins.unshift({ slot: chosen.id, vehicle, name: name || '-', loc: location, time: nowTime() });
  store.activities.unshift({ type: 'check-in', text: `Walk-in: ${vehicle} - slot ${slotLabel(chosen.id)}`, time: 'just now' });
  writeStore(store);

  return res.status(201).json({ booking, slot: chosen });
});

app.post('/api/slots/:id/release', (req, res) => {
  const slotId = Number(req.params.id);
  const store = readStore();
  const slot = store.slots.find((s) => s.id === slotId);

  if (!slot) {
    return res.status(404).json({ error: 'Slot not found' });
  }

  if (slot.status === 'available') {
    return res.status(409).json({ error: 'Slot is already available' });
  }

  store.activities.unshift({
    type: 'release',
    text: `Slot ${slotLabel(slotId)} released (${slot.vehicle || slot.bookedBy || 'reserved'})`,
    time: 'just now',
  });

  store.allBookings
    .filter((b) => b.slot === slotId && (b.status === 'Active' || b.status === 'Reserved'))
    .forEach((b) => {
      b.status = 'Released';
    });

  slot.status = 'available';
  slot.vehicle = '';
  slot.bookedBy = '';
  slot.timer = null;
  slot.type = 'Online';

  writeStore(store);
  return res.json({ slotId });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

ensureStore();
app.listen(PORT, () => {
  console.log(`ParkSync server running at http://localhost:${PORT}`);
});
