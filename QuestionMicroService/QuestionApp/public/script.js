// DOM Elements
const categorySelect = document.getElementById("categorySelect");
const getQuestionBtn = document.getElementById("getQuestionBtn");
const questionContainer = document.getElementById("questionContainer");
const questionText = document.getElementById("questionText");
const answersContainer = document.getElementById("answersContainer");
const resultMessage = document.getElementById("resultMessage");

// Current question data
let currentQuestion = null;

// Add event listeners
document.addEventListener("DOMContentLoaded", loadCategories);
categorySelect.addEventListener("click", loadCategories); // Refresh categories on click
getQuestionBtn.addEventListener("click", getQuestion);

// Load categories from the server
async function loadCategories() {
  try {
    const response = await fetch("/question/categories");
    if (!response.ok) {
      throw new Error("Failed to load categories");
    }

    const categories = await response.json();

    // Clear existing options except "All Categories"
    while (categorySelect.options.length > 1) {
      categorySelect.remove(1);
    }

    // Add categories to the select element
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading categories:", error);
  }
}

// Get a question from the server
async function getQuestion() {
  const category = categorySelect.value;

  try {
    const response = await fetch(`/question/question/${category}`);
    if (!response.ok) {
      throw new Error("Failed to load question");
    }

    const questions = await response.json();

    if (questions.length === 0) {
      showError("No questions available for this category.");
      return;
    }

    // Display the first question
    displayQuestion(questions[0]);
  } catch (error) {
    console.error("Error loading question:", error);
    showError("Failed to load question. Please try again.");
  }
}

function displayQuestion(question) {
  currentQuestion = question;

  // Display the question
  questionText.textContent = question.question;

  // Clear previous answers
  answersContainer.innerHTML = "";

  // Display the answers
  question.answers.forEach((answer, index) => {
    const answerDiv = document.createElement("div");
    answerDiv.className = "answer-option";
    answerDiv.textContent = answer.text;
    answerDiv.dataset.index = index;
    answerDiv.addEventListener("click", selectAnswer);
    answersContainer.appendChild(answerDiv);
  });

  // Show the question container
  questionContainer.classList.remove("hidden");

  // Explicitly hide the result message
  resultMessage.classList.add("hidden");
  resultMessage.textContent = ""; // Clear content too
}

// Handle answer selection
function selectAnswer(event) {
  // Prevent multiple selections
  if (document.querySelector(".answer-option.selected")) {
    return;
  }

  const selectedIndex = event.target.dataset.index;
  const selectedAnswer = currentQuestion.answers[selectedIndex];

  // Mark as selected
  event.target.classList.add("selected");

  // Check if answer is correct
  setTimeout(() => {
    // Show all correct answers
    document.querySelectorAll(".answer-option").forEach((element, index) => {
      const answer = currentQuestion.answers[index];
      if (answer.isCorrect) {
        element.classList.add("correct");
      } else if (element.classList.contains("selected")) {
        element.classList.add("incorrect");
      }
    });

    // Show result message
    resultMessage.textContent = selectedAnswer.isCorrect
      ? "Correct! Well done."
      : "Incorrect. Try another question.";
    resultMessage.className = selectedAnswer.isCorrect
      ? "correct"
      : "incorrect";
    resultMessage.classList.remove("hidden");
  }, 500);
}

// Show error message
function showError(message) {
  questionContainer.classList.add("hidden");
  resultMessage.textContent = message;
  resultMessage.className = "incorrect";
  resultMessage.classList.remove("hidden");
}
