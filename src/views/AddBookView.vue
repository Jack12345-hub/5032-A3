<template>
  <div class="container py-3">
    <h1>Add Book</h1>

    <!-- prevent page reload and call addBook() -->
    <form @submit.prevent="addBook">
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
  </div>
</template>

<script setup>
// Vue reactivity
import { ref } from "vue";

// Firestore instance
import { db } from "../firebase/init";
// Firestore helpers
import { collection, addDoc } from "firebase/firestore";

// local state
const isbn = ref("");
const name = ref("");

// add a new document to "books" collection
const addBook = async () => {
  try {
    // ensure isbn is saved as a number
    const isbnNumber = Number(isbn.value);
    if (isNaN(isbnNumber)) {
      alert("ISBN must be a valid number");
      return;
    }

    await addDoc(collection(db, "books"), {
      isbn: isbnNumber, // saved as number
      name: name.value
    });

    // reset form and notify
    isbn.value = "";
    name.value = "";
    alert("Book added successfully!");
  } catch (err) {
    console.error("Error adding book:", err);
    alert("Failed to add. Check console for details.");
  }
};
</script>