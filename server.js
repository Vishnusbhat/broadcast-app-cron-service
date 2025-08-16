/* eslint-disable no-undef */
const cron = require("node-cron");
const admin = require("firebase-admin");
// const serviceAccount = require("./serviceAccountKey.json");
const serviceAccount = JSON.parse('/etc/secrets/GOOGLE_APPLICATION_CREDENTIALS_JSON');
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

app.listen(() => {
  console.log("Listening on port 8080.");
}, 8080);
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

    await db.collection(COLLECTION).add({
      type: "deletion-log",
      timestamp: new Date(),
      message: `Deleted cron ran.`,
    });
    console.log("Logged deletion operation in collection.");
  } catch (err) {
    console.error("Error deleting expired docs:", err);
  }
});

console.log("Firestore deletion cron started!");
