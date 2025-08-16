/* eslint-disable no-undef */
const cron = require('node-cron');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const COLLECTION = 'chat-updates'; 

cron.schedule('* * * * *', async () => {
  console.log('Running Firestore deletion task:', new Date());
  try {
    const now = Date.now();
    const snapshot = await db.collection(COLLECTION)
      .where('expireAt', '<', now)
      .get();

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      console.log(`Queued deletion: ${doc.id}`);
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.size} expired documents.`);
  } catch (err) {
    console.error('Error deleting expired docs:', err);
  }
});

console.log('Firestore deletion cron started!');

