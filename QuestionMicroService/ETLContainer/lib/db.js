// question-microservice/ETLContainer/lib/db.js
const mongoose = require("mongoose");
require("dotenv").config();

// MongoDB Connection details
const DB_NAME = process.env.MONGO_DB_NAME || "questions_db";
const MONGO_HOST = process.env.MONGO_HOST || "mongodb"; // Use service name
const MONGO_PORT = process.env.MONGO_PORT || 27017;
const conStr = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${DB_NAME}`;

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(conStr, {
      serverSelectionTimeoutMS: 30000, // Increased timeout
      socketTimeoutMS: 45000,
    });
    const dbName = mongoose.connection.name;
    console.log(
      `Successfully connected to MongoDB ${dbName} database at ${conStr}`
    );
    return true;
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    return false;
  }
};

// Define Question schema
const questionSchema = new mongoose.Schema({
  id: Number,
  category: String,
  question: String,
  answers: [
    {
      text: String,
      isCorrect: Boolean,
    },
  ],
});

// Create model
const Question = mongoose.model("Question", questionSchema);

// Get next ID for a new question
const getNextId = async () => {
  try {
    const maxQuestion = await Question.findOne().sort("-id");
    return maxQuestion ? maxQuestion.id + 1 : 1;
  } catch (err) {
    console.error("Error getting next ID:", err.message);
    throw err;
  }
};

module.exports = {
  connectDB,
  getNextId,
  Question,
};
