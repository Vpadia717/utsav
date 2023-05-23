// Import the firebase-admin module
const admin = require("firebase-admin");

// Import the service account credentials for the Firebase app
const serviceAccount = require("./gateway-utsav-web-firebase-adminsdk-folvd-04f4e9bbb0.json");

// Initialize the Firebase app with the provided credentials
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://gatewayutsav-921d6-default-rtdb.firebaseio.com",
  projectId: "gatewayutsav-921d6",
});

// Get a reference to the real-time database
const dbRealtime = admin.database();

// Get a reference to the Firestore database
const dbFirestore = admin.firestore();

// Get a reference to the Firebase Authentication
const dbauth = admin.auth();

// Export the real-time, Firestore, and Authentication references for use in other modules
module.exports = { admin, dbFirestore, dbRealtime, dbauth };
