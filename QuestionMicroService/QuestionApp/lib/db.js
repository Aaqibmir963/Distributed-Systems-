const mongoose = require("mongoose");
require("dotenv").config();

const DB_NAME = process.env.MONGO_DB_NAME || "questions_db";
const MONGO_HOST = process.env.MONGO_HOST || "mongodb"; // Use Docker service name
const MONGO_PORT = process.env.MONGO_PORT || 27017;
const conStr = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${DB_NAME}`;

// MongoDB Connection with enhanced logging and options
async function connectDB() {
  try {
    console.log(`Attempting to connect to MongoDB at: ${conStr}`);

    // Connect to MongoDB using Mongoose with better options
    await mongoose.connect(conStr, {
      serverSelectionTimeoutMS: 30000, // Longer timeout
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
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
}

// Add connection retry logic
async function connectWithRetry(attempts = 5, delay = 5000) {
  for (let i = 0; i < attempts; i++) {
    try {
      console.log(`Connection attempt ${i + 1}/${attempts}`);
      const success = await connectDB();
      if (success) return true;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error.message);
    }

    if (i < attempts - 1) {
      console.log(`Waiting ${delay / 1000} seconds before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  console.error(`Failed to connect after ${attempts} attempts`);
  return false;
}

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

// Get all categories
const getAllCategories = async () => {
  try {
    // Get distinct categories from the questions collection
    return await Question.distinct("category");
  } catch (err) {
    console.error("Error getting all categories:", err.message);
    throw err;
  }
};

// Get questions by category
const getQuestionsByCategory = async (category, count = 1) => {
  try {
    // Get random questions of the specified category
    return await Question.aggregate([
      { $match: { category: category } },
      { $sample: { size: parseInt(count) } },
    ]);
  } catch (err) {
    console.error(
      `Error getting questions of category ${category}:`,
      err.message
    );
    throw err;
  }
};

// Get all questions
const getAllQuestions = async (count = 1) => {
  try {
    // Get random questions from any category
    return await Question.aggregate([{ $sample: { size: parseInt(count) } }]);
  } catch (err) {
    console.error("Error getting all questions:", err.message);
    throw err;
  }
};

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
  connectDB: connectWithRetry, // Use the retry wrapper instead of direct function
  getAllCategories,
  getQuestionsByCategory,
  getAllQuestions,
  getNextId,
  Question,
};
