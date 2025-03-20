// question-microservice/ETLContainer/app.js
const express = require("express");
require("dotenv").config();
const app = express();
const amqp = require("amqplib");
const db = require("./lib/db");

// Set port from environment variables
const ETL_PORT = process.env.ETL_PORT || 3001;
const QUEUE_NAME = process.env.QUEUE_NAME || "SUBMITTED_QUESTIONS";
const RMQ_HOST = process.env.RMQ_HOST || "rabbitmq";
const RMQ_PORT = process.env.RMQ_PORT || 4201;
const RMQ_USER = process.env.RMQ_USER || "admin";
const RMQ_PASSWORD = process.env.RMQ_PASSWORD || "admin";

let connection;
let channel;

// Initialize database connection
async function initialize() {
  try {
    await db.connectDB();
    await createQueueConnection();
  } catch (error) {
    console.error("Initialization error:", error);
    process.exit(1);
  }
}

// Health check endpoint
app.get("/", (req, res) => {
  res.send("ETL Container is running");
});

// Start server
const server = app.listen(ETL_PORT, () => {
  console.log(`ETL Container listening on port ${ETL_PORT}`);
  initialize();
});

// Connect to RabbitMQ
async function createQueueConnection() {
  try {
    const connectionString = `amqp://${RMQ_USER}:${RMQ_PASSWORD}@${RMQ_HOST}:${RMQ_PORT}/`;
    console.log(`Attempting to connect to RabbitMQ at ${RMQ_HOST}:${RMQ_PORT}`);

    connection = await amqp.connect(connectionString);
    console.log("Connected to RabbitMQ");

    // Handle connection errors and closed events
    connection.on("error", handleConnectionError);
    connection.on("close", handleConnectionClose);

    // Create channel
    channel = await connection.createChannel();
    console.log("Channel created");

    // Start consumer
    await startMessageConsumer();
  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error.message);
    // Retry connection after delay
    setTimeout(createQueueConnection, 5000);
  }
}

// Start consuming messages
async function startMessageConsumer() {
  try {
    // Ensure queue exists
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`Listening for messages on queue: ${QUEUE_NAME}`);

    // Set up consumer
    channel.consume(QUEUE_NAME, async (message) => {
      try {
        if (message) {
          // Parse message content
          const questionData = JSON.parse(message.content.toString());
          console.log(
            "Received new question:",
            JSON.stringify(questionData, null, 2)
          );

          // Extract data
          const { question, category, answers } = questionData;

          // Get next ID for the question
          const id = await db.getNextId();

          // Create new question document
          const newQuestion = new db.Question({
            id,
            question,
            category,
            answers,
          });

          // Save to database
          await newQuestion.save();
          console.log(`Question saved to database with ID: ${id}`);

          // Acknowledge message
          channel.ack(message);
        }
      } catch (error) {
        console.error("Error processing message:", error);
        // Reject and requeue message
        channel.nack(message, false, true);
      }
    });
  } catch (error) {
    console.error("Error setting up message consumer:", error);
    // Try to reconnect
    setTimeout(createQueueConnection, 5000);
  }
}

// Handle connection errors
function handleConnectionError(error) {
  console.error("RabbitMQ connection error:", error.message);
  setTimeout(createQueueConnection, 5000);
}

// Handle connection close
function handleConnectionClose() {
  console.log("RabbitMQ connection closed");
  setTimeout(createQueueConnection, 5000);
}

// Graceful shutdown
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

async function gracefulShutdown() {
  console.log("Shutting down ETL container...");

  if (channel) {
    try {
      await channel.close();
    } catch (error) {
      console.error("Error closing channel:", error);
    }
  }

  if (connection) {
    try {
      await connection.close();
    } catch (error) {
      console.error("Error closing connection:", error);
    }
  }

  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
}
