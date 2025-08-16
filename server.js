/* eslint-disable no-undef */
const cron = require("node-cron");
const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = JSON.parse(
  fs.readFileSync("/etc/secrets/GOOGLE_APPLICATION_CREDENTIALS_JSON", "utf8")
);
const express = require("express");
const app = express();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const COLLECTION = "chat-updates";

app.use(express.json());
app.get("/wakeup", (req, res) => {
  res.status(200).send("Cron-Service is active!");
});

app.listen(8080, () => {
  console.log("Listening on port 8080.");
});
cron.schedule("* * * * *", async () => {
  console.log("Running Firestore deletion task:", new Date());
  try {
    const now = Date.now();
    const snapshot = await db
      .collection(COLLECTION)
      .where("expireAt", "<", now)
      .get();

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
      console.log(`Queued deletion: ${doc.id}`);
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.size} expired documents.`);
  } catch (err) {
    console.error("Error deleting expired docs:", err);
  }
});

console.log("Firestore deletion cron started!");
