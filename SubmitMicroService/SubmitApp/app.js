const express = require("express");
require("dotenv").config();
const app = express();
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const amqp = require("amqplib");

// Parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add Swagger packages
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUI = require("swagger-ui-express");

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Submit App API",
      version: "1.0.0",
      description:
        "Submit App API Documentation for Distributed Systems Assignment",
    },
  },
  apis: ["app.js"], // Path to the API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerDocs));

// Set port from environment variables
const SUBMIT_PORT = process.env.SUBMIT_PORT || 3200;
const CATEGORIES_CACHE_FILE = path.join(__dirname, "data", "categories.json");
const QUEUE_NAME = process.env.QUEUE_NAME || "SUBMITTED_QUESTIONS";
const RMQ_HOST = process.env.RMQ_HOST || "rabbitmq";
const RMQ_PORT = process.env.SUBMIT_QUESTION_PORT || 5672;
const RMQ_USER = process.env.RMQ_USER || "admin";
const RMQ_PASSWORD = process.env.RMQ_PASSWORD || "admin";
const QUESTION_SERVICE_URL =
  process.env.QUESTION_SERVICE_URL || "http://question-app:3000";

// Middleware to return files
app.use(express.static(path.join(__dirname, "public")));

// RabbitMQ Connection variables
let gConnection;
let gChannel;

// Ensure data directory exists
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize RabbitMQ connection
async function initializeRabbitMQ() {
  try {
    const connectionString = `amqp://${RMQ_USER}:${RMQ_PASSWORD}@${RMQ_HOST}:${RMQ_PORT}/`;
    console.log(`Connecting to RabbitMQ at ${RMQ_HOST}:${RMQ_PORT}`);

    gConnection = await amqp.connect(connectionString);
    console.log("Connected to RabbitMQ");

    gChannel = await gConnection.createChannel();
    console.log("Channel created");

    // Assert the queue exists
    await gChannel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`Queue ${QUEUE_NAME} asserted`);

    // Handle connection errors and closed events
    gConnection.on("error", handleConnectionError);
    gConnection.on("close", handleConnectionClose);

    return true;
  } catch (error) {
    //Keep trying to connect to RabbitMQ
    console.error("Failed to connect to RabbitMQ:", error.message);
    console.log("Will retry connection in 5 seconds...");
    setTimeout(initializeRabbitMQ, 5000);
    return false;
  }
}

// Handle connection errors
function handleConnectionError(error) {
  console.error("RabbitMQ connection error:", error.message);
  console.log("Will attempt to reconnect in 5 seconds...");
  setTimeout(initializeRabbitMQ, 5000);
}

// Handle connection close
function handleConnectionClose() {
  console.log("RabbitMQ connection closed unexpectedly");
  console.log("Will attempt to reconnect in 5 seconds...");
  setTimeout(initializeRabbitMQ, 5000);
}

// Update categories cache from question service
async function updateCategoriesCache() {
  try {
    console.log(`Fetching categories from ${QUESTION_SERVICE_URL}/categories`);
    const response = await axios.get(`${QUESTION_SERVICE_URL}/categories`);
    const categories = response.data;

    fs.writeFileSync(CATEGORIES_CACHE_FILE, JSON.stringify(categories));
    console.log("Categories cache updated:", categories);
    return categories;
  } catch (error) {
    console.error("Error updating categories cache:", error.message);
    return getCachedCategories();
  }
}

// Get categories from cache
function getCachedCategories() {
  try {
    if (!fs.existsSync(CATEGORIES_CACHE_FILE)) {
      // If cache doesn't exist, create with default categories
      const defaultCategories = [
        "General Knowledge",
        "Science",
        "Sports",
        "History",
        "Geography",
      ];
      fs.writeFileSync(
        CATEGORIES_CACHE_FILE,
        JSON.stringify(defaultCategories)
      );
      return defaultCategories;
    }
    const categoriesJson = fs.readFileSync(CATEGORIES_CACHE_FILE, "utf8");
    return JSON.parse(categoriesJson);
  } catch (error) {
    console.error("Error reading categories cache:", error.message);
    return ["General Knowledge", "Science", "Sports", "History", "Geography"];
  }
}

// Close RabbitMQ connections properly
async function closeConnection() {
  try {
    if (gChannel) {
      await gChannel.close();
      console.log("RabbitMQ channel closed");
    }

    if (gConnection) {
      await gConnection.close();
      console.log("RabbitMQ connection closed");
    }
  } catch (error) {
    console.error("Error closing RabbitMQ connections:", error.message);
  }
}

// Initialize application
async function initialize() {
  try {
    // Ensure categories cache file exists
    if (!fs.existsSync(CATEGORIES_CACHE_FILE)) {
      const defaultCategories = [
        "General Knowledge",
        "Science",
        "Sports",
        "History",
        "Geography",
      ];
      fs.writeFileSync(
        CATEGORIES_CACHE_FILE,
        JSON.stringify(defaultCategories)
      );
    }

    // Initialize RabbitMQ
    await initializeRabbitMQ();

    // Update categories cache
    await updateCategoriesCache();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health check for the Submit App API
 *     tags:
 *       - Health Check
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: "Submit app is alive."
 */
app.get("/", (req, res) => {
  res.json({ message: "Submit app is alive." });
});

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Retrieve all categories
 *     description: Returns a list of all question categories from the cache or question service
 *     tags:
 *       - Categories
 *     responses:
 *       200:
 *         description: A list of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["Science", "History", "Geography", "Sports"]
 *       500:
 *         description: Server error
 */
app.get("/categories", async (req, res) => {
  try {
    // Try to update cache first
    let categories = await updateCategoriesCache();

    // If update fails, use cached data
    if (!categories || categories.length === 0) {
      categories = getCachedCategories();
    }

    return res.json(categories);
  } catch (error) {
    console.error("Error retrieving categories:", error);
    return res.status(500).send("Internal server error");
  }
});

/**
 * @swagger
 * /submit:
 *   post:
 *     summary: Submit a new question
 *     description: Submit a new question with category and answers to the queue
 *     tags:
 *       - Questions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - category
 *               - answers
 *             properties:
 *               question:
 *                 type: string
 *                 description: The question text
 *               category:
 *                 type: string
 *                 description: The category of the question
 *               answers:
 *                 type: array
 *                 description: An array of 4 possible answers, one marked as correct
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     isCorrect:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Question successfully submitted
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Server error
 */
app.post("/submit", async (req, res) => {
  try {
    // Validate the request body
    const { question, category, answers } = req.body;
    if (
      !question ||
      !category ||
      !answers ||
      !Array.isArray(answers) ||
      answers.length !== 4
    ) {
      return res.status(400).json({
        error:
          "Invalid request body. Ensure question, category, and exactly 4 answers are provided.",
      });
    }

    // Check if at least one answer is marked as correct
    const hasCorrectAnswer = answers.some((answer) => answer.isCorrect);
    if (!hasCorrectAnswer) {
      return res.status(400).json({
        error: "At least one answer must be marked as correct.",
      });
    }

    // Check if RabbitMQ channel is available
    if (!gChannel) {
      await initializeRabbitMQ();
      if (!gChannel) {
        return res.status(500).json({
          error: "Message queue service unavailable, please try again later.",
        });
      }
    }

    // Send to message queue
    await gChannel.sendToQueue(
      QUEUE_NAME,
      Buffer.from(JSON.stringify({ question, category, answers })),
      { persistent: true }
    );

    console.log("Question sent to queue:", { question, category });

    // Update categories cache with new category
    const categories = getCachedCategories();
    if (!categories.includes(category)) {
      categories.push(category);
      fs.writeFileSync(CATEGORIES_CACHE_FILE, JSON.stringify(categories));
      console.log("Added new category to cache:", category);
    }

    return res.status(201).json({
      message: "Question submitted successfully and queued for processing",
    });
  } catch (error) {
    console.error("Error submitting question:", error);
    return res.status(500).send("Internal server error");
  }
});

// Catch all other routes
app.use("*", (req, res) => {
  if (req.originalUrl.startsWith("/docs")) {
    return; // Let Swagger docs pass through wasnt working without this
  }
  res.sendStatus(400);
});

// Start server
const server = app.listen(SUBMIT_PORT, () => {
  console.log(`Submit app listening on port ${SUBMIT_PORT}`);
  initialize();
});
