const express = require("express");
require("dotenv").config();
const app = express();
const path = require("path");
const db = require("./lib/db");

// Set port from environment variables
const QUESTION_PORT = process.env.QUESTION_PORT || 3000;

// Middleware to return files
app.use(express.static(path.join(__dirname, "/public/html")));
app.use(express.static(path.join(__dirname, "/public/js")));
app.use(express.static(path.join(__dirname, "/public/css")));

// Parse JSON requests
app.use(express.json());

// Initialize database connection
db.connectDB();

// Endpoint for categories
app.get("/categories", async (req, res) => {
  try {
    const categories = await db.getAllCategories();
    return res.json(categories);
  } catch (error) {
    console.error("Error retrieving categories:", error);
    return res.status(500).send("Internal server error");
  }
});

// Endpoint for questions by category async, waiting for response
app.get("/question/:category", async (req, res) => {
  try {
    // Get parameters
    const category = req.params.category; // category as a path parameter
    const count = Number(req.query.count) || 1; // count as a query parameter
    let questions = [];

    // Get questions based on category
    if (category === "all") {
      questions = await db.getAllQuestions(count);
    } else {
      questions = await db.getQuestionsByCategory(category, count);

      // If no questions found for that category
      if (questions.length === 0) {
        return res
          .status(404)
          .sendFile(path.join(__dirname, "/public/html/404.html"));
      }
    }

    // For each question, randomize the order of answers
    const questionsWithRandomizedAnswers = questions.map((question) => {
      const questionCopy = JSON.parse(JSON.stringify(question));
      questionCopy.answers = shuffleArray(questionCopy.answers);
      return questionCopy;
    });

    return res.json(questionsWithRandomizedAnswers);
  } catch (error) {
    console.error("Error retrieving questions:", error);
    return res.status(500).send("Internal server error");
  }
});

// Function to shuffle array (for randomizing answer order)
function shuffleArray(array) {
  //Shallow copy array (Don't want to modify original array)
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Question app is running");
});

// Catches anything not defined and sends 400 bad request back
app.get("/*", (req, res) => {
  res.sendStatus(400);
});

// Make sure server is working
const server = app.listen(QUESTION_PORT, () =>
  console.log(`Question app listening on port ${QUESTION_PORT}`)
);
