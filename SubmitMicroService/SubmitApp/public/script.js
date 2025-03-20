document.addEventListener("DOMContentLoaded", () => {
  const submitForm = document.getElementById("submit-form");
  const categorySelect = document.getElementById("category-select");
  const newCategoryInput = document.getElementById("new-category");
  const messageDiv = document.getElementById("message");

  // Fetch categories when the page loads
  fetchCategories();

  // Event listener for form submission
  submitForm.addEventListener("submit", handleFormSubmit);

  // Function to fetch categories from the server
  async function fetchCategories() {
    try {
      const response = await fetch("/submit/categories");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const categories = await response.json();

      // Clear existing options
      categorySelect.innerHTML = '<option value="">Select a category</option>';

      // Add categories to the select element
      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
      });
    } catch (error) {
      showMessage(`Error fetching categories: ${error.message}`, "error");
    }
  }

  // Function to handle form submission
  async function handleFormSubmit(event) {
    event.preventDefault();

    // Get form values
    const questionText = document.getElementById("question").value.trim();
    const selectedCategory = categorySelect.value.trim();
    const newCategory = newCategoryInput.value.trim();
    const category = newCategory || selectedCategory;

    // Make sure a category is selected or entered
    if (!category) {
      showMessage("Please select a category or enter a new one.", "error");
      return;
    }

    // Get the selected correct answer
    const selectedCorrectAnswer = document.querySelector(
      'input[name="correct-answer"]:checked'
    );

    if (!selectedCorrectAnswer) {
      showMessage("Please select which answer is correct.", "error");
      return;
    }

    const correctIndex = parseInt(selectedCorrectAnswer.value);

    // Create answers array
    const answers = [];
    for (let i = 0; i < 4; i++) {
      const answerText = document.getElementById(`answer-${i}`).value.trim();

      if (!answerText) {
        showMessage(`Please fill in answer ${i + 1}.`, "error");
        return;
      }

      answers.push({
        text: answerText,
        isCorrect: i === correctIndex,
      });
    }

    // Prepare the data to submit
    const questionData = {
      question: questionText,
      category: category,
      answers: answers,
    };

    // Submit the question
    await submitQuestion(questionData);
  }

  // Function to submit a question to the server
  async function submitQuestion(questionData) {
    try {
      const response = await fetch("/submit/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(questionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit question");
      }

      const responseData = await response.json();

      // Show success message
      showMessage("Question submitted successfully!", "success");

      // Reset form
      submitForm.reset();

      // Refetch categories to include any new ones
      fetchCategories();
    } catch (error) {
      showMessage(`Error submitting question: ${error.message}`, "error");
    }
  }

  // Function to show a message to the user
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = ""; // Clear existing classes
    messageDiv.classList.add(type);
    messageDiv.style.display = "block";

    // Hide message after 5 seconds
    setTimeout(() => {
      messageDiv.style.display = "none";
    }, 5000);
  }
});
