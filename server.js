import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import stateHandler from "./api/state.js";
import bookingsHandler from "./api/bookings.js";
import walkinsHandler from "./api/walkins.js";
import releaseHandler from "./api/release.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const preferredPort = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.static(__dirname));

function runHandler(handler) {
  return (req, res) => handler(req, res);
}

app.all("/api/state", runHandler(stateHandler));
app.all("/api/bookings", runHandler(bookingsHandler));
app.all("/api/walkins", runHandler(walkinsHandler));
app.all("/api/release", runHandler(releaseHandler));
app.all("/api/slots/:id/release", (req, res) => {
  req.query = { ...req.query, id: req.params.id };
  releaseHandler(req, res);
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

function startServer(port, attemptsLeft = 10) {
  const server = app.listen(port, () => {
    console.log(`Hybrid Parking Management System running at http://localhost:${port}`);
  });

  server.on("error", error => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0 && !process.env.PORT) {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1, attemptsLeft - 1);
      return;
    }

    console.error(error.message);
    process.exit(1);
  });
}

startServer(preferredPort);
