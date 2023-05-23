// Import required modules
const express = require("express"); // express library for web application framework
const cors = require("cors"); // cors middleware for enabling cross-origin resource sharing
const axios = require("axios"); // axios library for making HTTP requests
const fs = require("fs"); // fs library for working with the file system
const { dbFirestore, dbRealtime, dbauth, admin } = require("./connection"); // import references to the Firebase databases
const dotenv = require("dotenv"); // dotenv library for working with environment variables

// Load environment variables from .env file
dotenv.config();

// nodemailer
const nodemailer = require("nodemailer");

// Set the port for the server to listen on
const PORT = process.env.PORT;

// Set the port for the server to listen on
const API_KEY = process.env.API_KEY;

// Set the port for the server to listen on
const USER = process.env.USER;

// Set the port for the server to listen on
const PASSWORD = process.env.PASSWORD;

// Initialize the Express application
const app = express();

// Enable cross-origin resource sharing for all routes
app.use(cors());

// Enable JSON body parsing for incoming requests
app.use(express.json());

// Route for the homepage
app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/all", async (req, res, next) => {
  try {
    const categoriesRef = dbFirestore.collection("Users"); // Get a reference to the "Categories" collection in Firestore.
    const snapshot = await categoriesRef.get(); // Retrieve a snapshot of the "Categories" collection.
    const categories = snapshot.docs.map((doc) => ({ ...doc.data() })); // Map the snapshot to an array of category objects.
    const keys = Object(categories); // Extract the keys from the first category object.
    res.send(keys); // Send the keys as the response.
  } catch (err) {
    if (err.code === 400 || err.code < 400) {
      // console.log("Unable to fetch the data");
    }
    // next(err); // Pass any errors to the next middleware function in the chain
  }
});

app.post("/createUser", async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    // Extract the user details from the request body

    // Create the user in the authentication system
    const { uid } = await dbauth.createUser({
      email,
      password,
    });

    // Create an object with the user details
    const userData = {
      u_name: name,
      email,
      number: phone,
      role_id: "wEXDVTBPg0Fe9Hh4Oywu", // participant
      uid,
    };

    // Create a document with the user ID as the document ID in the "Users" collection
    await dbFirestore.collection("Users").doc(uid).set(userData);

    // console.log("The user with email", email, "has user ID:", uid);
    // Return the user ID as the response
    res.send(uid);
  } catch (error) {
    console.error("Error creating user:", error);
    const errorMessage = error.message || "Error creating user";
    res.status(500).json({
      error: "Error creating user",
      errorMessage: errorMessage,
    });
  }
});

// API endpoint for user login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Send a POST request to the Firebase Authentication REST API
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    // Get the user ID from the response data
    const userId = response.data.localId;

    // Return the user ID as the response
    res.send(userId);
  } catch (error) {
    // console.error("Error logging in user:", error.response.data.error.message);
    res.status(500).json({
      error: "Error logging in user",
      errorMessage: error.response.data.error.message,
    });
  }
});

// Example API endpoint for generating a password reset link and sending the email
app.post("/resetPassword", async (req, res) => {
  try {
    const email = req.query.search_query; // Extract the user's email from the request body

    // Set the action code settings for the password reset link
    const actionCodeSettings = {
      url: "https://gatewayutsav-921d6.firebaseapp.com/__/auth/", // Replace with your reset password URL
      handleCodeInApp: true,
    };

    // Generate the password reset link using Firebase Authentication
    const link = await admin
      .auth()
      .generatePasswordResetLink(email, actionCodeSettings);

    // Send the password reset email
    await sendPasswordResetEmail(email, link);

    res
      .status(200)
      .json({ message: "Password reset email sent successfully." });
  } catch (error) {
    // console.log("Error resetting password:", error);
    res.status(500).json({ error: error.message });
  }
});

// Function to send the password reset email using Nodemailer
async function sendPasswordResetEmail(email, link) {
  // Create a Nodemailer transporter using your SMTP configuration
  const transporter = nodemailer.createTransport({
    host: "mail.thegatewaydigital.com", // Replace with your SMTP server
    port: 587,
    secure: false,
    auth: {
      user: USER, // Replace with your email address
      pass: PASSWORD, // Replace with your email password
    },
  });

  // Setup email data
  const mailOptions = {
    from: "Gateway Utsav Team <noreply@gatewayutsav-921d6.firebaseapp.com>", // Replace with your email address and name
    to: email,
    subject: "Reset your password for Gateway Utsav",
    text: `Hello,\n\nFollow this link to reset your Gateway Utsav account password for your ${email} account.\n\n${link}\n\nIf you didn’t ask to reset your password, you can ignore this email.\n\nThanks,\n\nGateway Utsav Team`,
  };

  // Send the email
  const result = await transporter.sendMail(mailOptions);

  // console.log(`Email sent to ${email}: ${result.response}`);
}

app.get("/getEmails", async (req, res, next) => {
  try {
    const usersRef = dbFirestore.collection("Users"); // Get a reference to the "Users" collection in Firestore.
    const snapshot = await usersRef.get(); // Retrieve a snapshot of the documents in the "Users" collection.
    const emails = snapshot.docs.map((doc) => doc.data().email); // Extract the email field from each document.
    res.send(emails); // Send the emails as the response.
  } catch (err) {
    if (err.code === 400 || err.code < 400) {
      console.log("Unable to fetch the data");
    }
    // next(err); // Pass any errors to the next middleware function in the chain
  }
});

app.get("/fetchCurrentUser", async (req, res, next) => {
  try {
    const documentId = req.query.search_query;
    const recordsRef = dbFirestore.collection("Users"); // Replace "Users" with the actual name of your collection.
    const documentSnapshot = await recordsRef.doc(documentId).get();

    if (documentSnapshot.exists) {
      res.send(documentSnapshot.data()); // Send the document data as the response.
    } else {
      res.status(404).json({ error: "Document not found" });
    }
  } catch (err) {
    console.log("Error fetching records:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/updateUserProfile", async (req, res, next) => {
  try {
    const documentId = req.query.search_query;
    const recordsRef = dbFirestore.collection("Users"); // Replace "Users" with the actual name of your collection.
    const documentSnapshot = await recordsRef.doc(documentId).get();

    if (documentSnapshot.exists) {
      const newData = req.body;
      await recordsRef.doc(documentId).update(newData);
      res.send("Document updated successfully");
    } else {
      res.status(404).json({ error: "Document not found" });
    }
  } catch (err) {
    console.log("Error updating document:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/deleteUserProfile", async (req, res, next) => {
  try {
    const documentId = req.query.search_query;
    const recordsRef = dbFirestore.collection("Users"); // Replace "Users" with the actual name of your collection.
    const documentSnapshot = await recordsRef.doc(documentId).get();

    if (documentSnapshot.exists) {
      // Delete the document from Firestore
      await recordsRef.doc(documentId).delete();

      // Delete the corresponding user from Firebase Authentication
      const { uid } = documentSnapshot.data();
      await dbauth.deleteUser(uid);

      res.send("Document and user deleted successfully");
    } else {
      res.status(404).json({ error: "Document not found" });
    }
  } catch (err) {
    console.log("Error deleting document and user:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/getallRooms", async (req, res, next) => {
  try {
    const roomsRef = dbFirestore.collection("Room"); // Get a reference to the "Room" collection in Firestore.
    const snapshot = await roomsRef.get(); // Retrieve a snapshot of the "Room" collection.
    const rooms = snapshot.docs.map((doc) => ({ ...doc.data() })); // Map the snapshot to an array of room objects.
    const keys = Object.values(rooms); // Extract the keys from the first room object.
    res.send(keys); // Send the keys as the response.
  } catch (err) {
    if (err.code === 400 || err.code < 400) {
      console.log("Unable to fetch the data");
    }
    // next(err); // Pass any errors to the next middleware function in the chain
  }
});

app.get("/roomsCurrentUser", async (req, res, next) => {
  try {
    const roomsRef = dbFirestore.collection("Members"); // Get a reference to the "Members" collection in Firestore.
    const snapshot = await roomsRef.get(); // Retrieve a snapshot of the "Room" collection.
    const rooms = snapshot.docs.map((doc) => ({ ...doc.data() })); // Map the snapshot to an array of room objects.
    const keys = Object.values(rooms); // Extract the keys from the first room object.
    res.send(keys); // Send the keys as the response.
  } catch (err) {
    if (err.code === 400 || err.code < 400) {
      console.log("Unable to fetch the data");
    }
    // next(err); // Pass any errors to the next middleware function in the chain
  }
});

app.get("/getallContribution", async (req, res, next) => {
  try {
    const contributionRef = dbFirestore.collection("Contribution");
    const snapshot = await contributionRef.get();
    const contributions = snapshot.docs.map(async (doc) => {
      const contributionData = doc.data();
      const { r_id, uid } = contributionData;

      const roomRef = dbFirestore.collection("Room").doc(r_id);
      const userRef = dbFirestore.collection("Users").doc(uid);

      const roomDoc = await roomRef.get();
      const userDoc = await userRef.get();

      const roomData = roomDoc.data();
      const userData = userDoc.data();

      const contributionWithAdditionalData = {
        ...contributionData,
        r_name: roomData?.r_name || "",
        u_name: userData?.u_name || "",
        u_img: userData?.u_img || "",
      };

      return contributionWithAdditionalData;
    });

    const contributionsWithData = await Promise.all(contributions);
    res.send(contributionsWithData);
  } catch (err) {
    if (err.code === 400 || err.code < 400) {
      console.log("Unable to fetch the data");
    }
    // next(err);
  }
});

app.get("/getallContributionSum", async (req, res, next) => {
  try {
    const contributionRef = dbFirestore.collection("Contribution"); // Get a reference to the "Contribution" collection in Firestore.
    const snapshot = await contributionRef.get(); // Retrieve a snapshot of the "Contribution" collection.
    const contributions = snapshot.docs.map((doc) => doc.data()); // Map the snapshot to an array of contribution objects.
    const paymentSum = contributions.reduce(
      (total, contribution) => total + parseInt(contribution.payment),
      0
    ); // Calculate the sum of payments using reduce.

    res.send({ paymentSum }); // Send only the paymentSum as the response.
  } catch (err) {
    if (err.code === 400 || err.code < 400) {
      console.log("Unable to fetch the data");
    }
    // next(err); // Pass any errors to the next middleware function in the chain
  }
});

app.get("/getallExpense", async (req, res, next) => {
  try {
    const expenseRef = dbFirestore.collection("Expense");
    const snapshot = await expenseRef.get();
    const expenses = snapshot.docs.map(async (doc) => {
      const expenseData = doc.data();
      const { r_id, uid } = expenseData;

      const roomRef = dbFirestore.collection("Room").doc(r_id);
      const userRef = dbFirestore.collection("Users").doc(uid);

      const [roomDoc, userDoc] = await Promise.all([
        roomRef.get(),
        userRef.get(),
      ]);

      const roomData = roomDoc.data();
      const userData = userDoc.data();

      const expenseWithAdditionalData = {
        ...expenseData,
        r_name: roomData?.r_name || "",
        u_name: userData?.u_name || "",
        u_img: userData?.u_img || "",
      };

      return expenseWithAdditionalData;
    });

    const expensesWithData = await Promise.all(expenses);
    res.send(expensesWithData);
  } catch (err) {
    if (err.code === 400 || err.code < 400) {
      console.log("Unable to fetch the data");
    }
    // next(err);
  }
});

app.get("/getallExpenseSum", async (req, res, next) => {
  try {
    const expenseRef = dbFirestore.collection("Expense"); // Get a reference to the "Expense" collection in Firestore.
    const snapshot = await expenseRef.get(); // Retrieve a snapshot of the "Expense" collection.
    const expenses = snapshot.docs.map((doc) => doc.data()); // Map the snapshot to an array of expense objects.
    const expenseSum = expenses.reduce(
      (total, expense) => total + parseInt(expense.e_amt),
      0
    ); // Calculate the sum of e_amt using reduce.

    res.send({ expenseSum }); // Send only the expenseSum as the response.
  } catch (err) {
    if (err.code === 400 || err.code < 400) {
      console.log("Unable to fetch the data");
    }
    // next(err); // Pass any errors to the next middleware function in the chain
  }
});

// Listening for incoming requests on the specified PORT
app.listen(PORT, () => {
  // Outputting a message to the console indicating the server is listening on the specified PORT
  console.log(`Listening on PORT: ${PORT}`);
});
