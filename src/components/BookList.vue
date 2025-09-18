<template>
  <div class="container py-3">
    <h2 class="mb-3">Books (query + update + delete)</h2>

    <!-- Controls for where / orderBy / limit -->
    <form class="row g-2 align-items-end mb-3" @submit.prevent="fetchBooks">
      <div class="col-auto">
        <label class="form-label">Min ISBN (where &gt;)</label>
        <input type="number" class="form-control" v-model.number="minIsbn" placeholder="1000" />
      </div>

      <div class="col-auto">
        <label class="form-label">Order by ISBN</label>
        <select class="form-select" v-model="sortDir">
          <option value="asc">asc</option>
          <option value="desc">desc</option>
        </select>
      </div>

      <div class="col-auto">
        <label class="form-label">Limit</label>
        <input type="number" class="form-control" v-model.number="limitN" placeholder="5" min="1" />
      </div>

      <div class="col-auto">
        <button type="submit" class="btn btn-primary">Run query</button>
      </div>
      <div class="col-auto">
        <button type="button" class="btn btn-outline-secondary" @click="resetControls">Reset</button>
      </div>
    </form>

    <!-- Result list -->
    <ul class="list-group">
      <li
        v-for="book in books"
        :key="book.id"
        class="list-group-item d-flex align-items-center justify-content-between"
      >
        <div>
          <strong>{{ book.name }}</strong>
          <span class="text-muted"> — ISBN: {{ book.isbn }}</span>
        </div>

        <!-- Inline edit controls -->
        <div class="d-flex gap-2 align-items-center">
          <input
            class="form-control form-control-sm"
            style="width: 220px"
            v-model="book.editName"
            :placeholder="`Rename '${book.name}'`"
          />
          <button class="btn btn-sm btn-success" @click="updateBook(book)">Update</button>
          <button class="btn btn-sm btn-danger" @click="deleteBook(book)">Delete</button>
        </div>
      </li>
    </ul>

    <!-- Empty state -->
    <p v-if="books.length === 0" class="text-muted mt-3">No results. Try adjusting the query above.</p>
  </div>
</template>

<script setup>
// Vue reactivity + lifecycle
import { ref, onMounted } from "vue";

// Firestore: shared instance (named export)
import { db } from "../firebase/init";

// Firestore helpers
import {
  collection,
  query,
  where,
  orderBy,
  limit as limitFn,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

// Reactive state for query controls
const minIsbn = ref(1000);   // where isbn > 1000
const sortDir = ref("asc");  // orderBy direction: "asc" | "desc"
const limitN = ref(5);       // limit N results

// Query results
const books = ref([]);

// Build a Firestore query using the current controls
function buildQuery() {
  const parts = [collection(db, "books")];

  // where (optional)
  if (Number.isFinite(minIsbn.value)) {
    parts.push(where("isbn", ">", Number(minIsbn.value)));
  }

  // orderBy isbn
  parts.push(orderBy("isbn", sortDir.value));

  // limit (optional)
  if (Number.isFinite(limitN.value) && limitN.value > 0) {
    parts.push(limitFn(Number(limitN.value)));
  }

  return query(...parts);
}

// Fetch documents from Firestore using the built query
async function fetchBooks() {
  try {
    const q = buildQuery();
    const snap = await getDocs(q);

    const rows = [];
    snap.forEach((d) => {
      const data = d.data();
      rows.push({
        id: d.id,
        name: data.name,
        isbn: data.isbn,
        // local editable copy for inline rename
        editName: data.name,
      });
    });

    books.value = rows;
  } catch (e) {
    console.error("fetchBooks failed:", e);
    alert("Failed to load books. Check console for details.");
  }
}

// Update a book name (uses document id)
async function updateBook(book) {
  try {
    const newName = (book.editName || "").trim();
    if (!newName) {
      alert("Name cannot be empty.");
      return;
    }
    await updateDoc(doc(db, "books", book.id), { name: newName });
    // update local copy
    book.name = newName;
    alert("Updated!");
  } catch (e) {
    console.error("updateBook failed:", e);
    alert("Failed to update. Check console for details.");
  }
}

// Delete a book document
async function deleteBook(book) {
  try {
    if (!confirm(`Delete "${book.name}"?`)) return;
    await deleteDoc(doc(db, "books", book.id));
    // remove locally
    books.value = books.value.filter((b) => b.id !== book.id);
    alert("Deleted!");
  } catch (e) {
    console.error("deleteBook failed:", e);
    alert("Failed to delete. Check console for details.");
  }
}

// Reset query controls to defaults
function resetControls() {
  minIsbn.value = 1000;
  sortDir.value = "asc";
  limitN.value = 5;
  fetchBooks();
}

// Initial load
onMounted(fetchBooks);
</script>
