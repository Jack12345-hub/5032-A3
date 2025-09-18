<template>
  <div class="container py-3">
    <h1 class="mb-4">Add Book</h1>

    <!-- Form to add new book -->
    <form @submit.prevent="addBook" class="mb-4">
      <div class="mb-3">
        <label for="isbn" class="form-label">ISBN (number)</label>
        <input
          id="isbn"
          type="text"
          class="form-control"
          v-model="isbn"
          required
          placeholder="e.g. 9780134685991"
        />
      </div>

      <div class="mb-3">
        <label for="name" class="form-label">Name</label>
        <input
          id="name"
          type="text"
          class="form-control"
          v-model="name"
          required
          placeholder="Clean Code"
        />
      </div>

      <button type="submit" class="btn btn-primary">Add Book</button>
    </form>

    <!-- Display the BookList component (query + update + delete) -->
    <BookList />
  </div>
</template>

<script setup>
import { ref } from "vue";
import { db } from "../firebase/init"; 
import { collection, addDoc } from "firebase/firestore";

// Import BookList component
import BookList from "../components/BookList.vue";

// Local reactive state for the form
const isbn = ref("");
const name = ref("");

// Add a new book document to the "books" collection
const addBook = async () => {
  try {
    // Ensure ISBN is a number
    const isbnNumber = Number(isbn.value);
    if (isNaN(isbnNumber)) {
      alert("ISBN must be a valid number");
      return;
    }

    // Add document to Firestore
    await addDoc(collection(db, "books"), {
      isbn: isbnNumber,
      name: name.value,
    });

    // Reset form and notify
    isbn.value = "";
    name.value = "";
    alert("Book added successfully!");
  } catch (err) {
    console.error("Error adding book:", err);
    alert("Failed to add. Check console for details.");
  }
};
</script>
