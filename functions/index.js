// CommonJS (require/exports)

// ---- imports (declare only once) ----
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const functionsConfig = require("firebase-functions/params");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const sgMail = require("@sendgrid/mail");

// ---- Firebase Admin initialization (only once) ----
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ---- SendGrid configuration (read from functions params / .env.*) ----
const SENDGRID_KEY = functionsConfig.defineString("SENDGRID_KEY");
const SEND_FROM    = functionsConfig.defineString("SEND_FROM");    // verified domain email
const ADMIN_INBOX  = functionsConfig.defineString("ADMIN_INBOX");

// ------------------ ① /countBooks ------------------
exports.countBooks = onRequest({ region: "australia-southeast2" }, async (req, res) => {
  cors(req, res, async () => {
    try {
      const snap = await db.collection("books").get();
      res.status(200).json({ count: snap.size });
    } catch (err) {
      console.error("Error counting books:", err);
      res.status(500).json({ error: "Error counting books" });
    }
  });
});

// ------------------ ② /getAllBooks ------------------
exports.getAllBooks = onRequest({ region: "australia-southeast2" }, async (req, res) => {
  cors(req, res, async () => {
    try {
      const snap = await db.collection("books").get();
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.status(200).json(items);
    } catch (err) {
      console.error("Failed to fetch books:", err);
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });
});

// ------------------ ③ /sendFeedbackEmail ------------------
// Utility functions for validation and attachment handling
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function sanitizeFilename(name = "file") {
  return String(name).replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";
}
function base64Bytes(b64 = "") {
  const clean = (b64 || "").split(",").pop().replace(/\s+/g, "");
  const len = clean.length;
  if (!len) return 0;
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}
function parseAttachments(input = [], limits) {
  const arr = Array.isArray(input) ? input.slice(0, limits.maxCount) : [];
  const out = [];
  let total = 0;
  for (const a of arr) {
    const content = (a?.contentBase64 || "").replace(/^data:.*?;base64,/, "");
    const size = base64Bytes(content);
    if (!content) continue;
    if (size > limits.maxEachBytes) {
      throw new Error(
        `Attachment too large: ${a?.filename || "file"} > ${Math.round(
          limits.maxEachBytes / (1024 * 1024)
        )}MB`
      );
    }
    if (total + size > limits.maxTotalBytes) {
      throw new Error(
        `Total attachments too large (> ${Math.round(
          limits.maxTotalBytes / (1024 * 1024)
        )}MB)`
      );
    }
    total += size;
    out.push({
      content,
      filename: sanitizeFilename(a?.filename),
      type: a?.mimeType || "application/octet-stream",
      disposition: "attachment",
    });
  }
  return { list: out, totalBytes: total };
}

exports.sendFeedbackEmail = onRequest({ region: "australia-southeast2" }, async (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Only POST is allowed" });
      }

      const sgKey = SENDGRID_KEY.value();
      if (!sgKey) return res.status(500).json({ ok: false, error: "SendGrid key not configured" });
      sgMail.setApiKey(sgKey);

      const { name, email, message = "", attachments = [] } = req.body || {};
      if (!name || name.trim().length < 2) return res.status(400).json({ ok: false, error: "Invalid name" });
      if (!email || !emailRegex.test(email)) return res.status(400).json({ ok: false, error: "Invalid email" });

      const limits = { maxCount: 2, maxEachBytes: 5 * 1024 * 1024, maxTotalBytes: 10 * 1024 * 1024 };
      const parsed = parseAttachments(attachments, limits);

      // Save feedback to Firestore
      await db.collection("feedback").add({
        name: name.trim(),
        email: email.trim(),
        message: message || "",
        at: admin.firestore.FieldValue.serverTimestamp(),
        ua: req.get("user-agent") || null,
        ip: (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0],
        hasAttachments: parsed.list.length > 0,
        attachmentsMeta: parsed.list.map(a => ({ filename: a.filename, type: a.type })),
      });

      const from = SEND_FROM.value();
      const adminTo = ADMIN_INBOX.value();

      // Notification email to admin
      const adminMsg = adminTo
        ? {
            to: adminTo,
            from,
            subject: `[Gym] New feedback from ${name}`,
            text: `From: ${name} <${email}>\n\nMessage:\n${(message || "").trim() || "(no message)"}\n`,
            attachments: parsed.list,
          }
        : null;

      // Acknowledgement email to user
      const userMsg = {
        to: email,
        from,
        subject: "Thanks! We received your feedback",
        text:
          `Hi ${name},\n\n` +
          `Thanks for contacting us. We've received your message:\n\n` +
          `${(message || "").trim() || "(no message)"}\n\n— Your Gym Team`,
        html: `
          <p>Hi ${name},</p>
          <p>Thanks for contacting us. We've received your message:</p>
          <pre style="white-space:pre-wrap">${(message || "").trim() || "(no message)"}</pre>
          <p>— Your Gym Team</p>
        `,
        attachments: parsed.list,
      };

      const tasks = [];
      if (adminMsg) tasks.push(sgMail.send(adminMsg));
      tasks.push(sgMail.send(userMsg));
      await Promise.all(tasks);

      return res.status(200).json({
        ok: true,
        sent: {
          toUser: email,
          toAdmin: adminTo || null,
          attachments: parsed.list.map(a => ({ filename: a.filename, type: a.type })),
          totalBytes: parsed.totalBytes,
        },
      });
    } catch (err) {
      console.error("sendFeedbackEmail failed:", err);
      const detail = err?.response?.body || err.message || String(err);
      return res.status(500).json({ ok: false, error: "Email sending failed", detail });
    }
  });
});

// ------------------ ④ Firestore trigger: capitalizeBook ------------------
function upperize(value) {
  if (typeof value === "string") return value.toUpperCase();
  if (Array.isArray(value)) return value.map(upperize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, upperize(v)]));
  }
  return value;
}

exports.capitalizeBook = onDocumentCreated(
  { region: "australia-southeast2", document: "books/{bookId}" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    if (!data) return;
    const transformed = upperize(data);
    const changed = JSON.stringify(transformed) !== JSON.stringify(data);
    if (changed) {
      await snap.ref.update(transformed);
      console.log(`books/${snap.id} uppercased successfully.`);
    } else {
      console.log(`books/${snap.id} already uppercased. Skipped.`);
    }
  }
);

// A user can book the same class only once (using deterministic document ID + tx.create)
// Includes: OPTIONS handling, capacity check, optional idToken verification
exports.bookClass = onRequest({ region: "australia-southeast2" }, async (req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    try {
      let { userId, classId, idToken } = req.body || {};

      // If idToken provided, decode it and override userId (for higher security)
      if (idToken) {
        const decoded = await admin.auth().verifyIdToken(idToken);
        userId = decoded.uid;
      }

      if (!userId || !classId) {
        return res.status(400).json({ ok: false, error: "Missing userId or classId" });
      }

      // Generate deterministic document ID: <classId>_<userId>
      const bookingId = `${classId}_${userId}`;

      const result = await db.runTransaction(async (tx) => {
        // Read class document
        const classRef = db.collection("classes").doc(classId);
        const classSnap = await tx.get(classRef);
        if (!classSnap.exists) throw new Error("Class not found");

        const cls = classSnap.data() || {};
        const enrolled = Number(cls.enrolled || 0);
        const capacity = Number(cls.capacity || 0);
        if (capacity > 0 && enrolled >= capacity) throw new Error("Class is full");

        // Use deterministic ID + create() to ensure uniqueness
        const bookingRef = db.collection("bookings").doc(bookingId);

        // Optional: pre-read for better user-friendly error message
        const existing = await tx.get(bookingRef);
        if (existing.exists) throw new Error("Already booked");

        // Fetch user email (prefer users collection, fallback to Auth)
        let userEmail = null;
        try {
          const uDoc = await db.collection("users").doc(userId).get();
          if (uDoc.exists) userEmail = uDoc.data()?.email || null;
          if (!userEmail) {
            const authUser = await admin.auth().getUser(userId);
            userEmail = authUser?.email || null;
          }
        } catch (_) {}

        // Create booking (no overwrite allowed)
        tx.create(bookingRef, {
          userId,
          userEmail: userEmail || null,
          classId,
          className: cls.name || null,
          classTime: cls.time || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Increment enrolled count
        tx.update(classRef, { enrolled: admin.firestore.FieldValue.increment(1) });

        return {
          bookingId,
          class: { id: classId, name: cls.name || null, time: cls.time || null },
          user: { id: userId, email: userEmail || null },
        };
      });

      return res.json({ ok: true, ...result });
    } catch (e) {
      const msg = (e && e.message) || String(e);
      return res.status(400).json({ ok: false, error: msg.includes("Already booked") ? "Already booked" : msg });
    }
  });
});

// Cancel booking (each bookingId = <classId>_<userId>)
// - Supports OPTIONS, CORS, and idToken (uid preferred)
// - Within transaction: confirm booking exists -> delete booking -> safely decrement enrolled count
exports.cancelClass = onRequest({ region: "australia-southeast2" }, async (req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    try {
      let { userId, classId, idToken } = req.body || {};

      // If idToken provided, decode it for verified uid
      if (idToken) {
        const decoded = await admin.auth().verifyIdToken(idToken);
        userId = decoded.uid;
      }
      if (!userId || !classId) {
        return res.status(400).json({ ok: false, error: "Missing userId or classId" });
      }

      const bookingId = `${classId}_${userId}`;

      const result = await db.runTransaction(async (tx) => {
        const classRef = db.collection("classes").doc(classId);
        const bookingRef = db.collection("bookings").doc(bookingId);

        // Read booking: must exist before cancel
        const [classSnap, bookingSnap] = await Promise.all([tx.get(classRef), tx.get(bookingRef)]);
        if (!classSnap.exists) throw new Error("Class not found");
        if (!bookingSnap.exists) throw new Error("Not booked");

        // Delete booking
        tx.delete(bookingRef);

        // Safely decrement enrolled count (not below 0)
        const cls = classSnap.data() || {};
        const enrolled = Number(cls.enrolled || 0);
        const next = Math.max(0, enrolled - 1);
        tx.update(classRef, { enrolled: next });

        return {
          bookingId,
          class: { id: classId, name: cls.name || null, time: cls.time || null },
          user: { id: userId },
        };
      });

      return res.json({ ok: true, ...result });
    } catch (e) {
      const msg = (e && e.message) || String(e);
      let reason = msg;
      if (msg.includes("Not booked")) reason = "Not booked";
      if (msg.includes("Class not found")) reason = "Class not found";
      return res.status(400).json({ ok: false, error: reason });
    }
  });
});

// ------------------ ⑤ /sendClassReminder (bulk class reminder) ------------------
exports.sendClassReminder = onRequest({ region: "australia-southeast2" }, async (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Only POST is allowed" });
      }

      // ✅ Load SendGrid config
      const sgKey = SENDGRID_KEY.value();
      const from = SEND_FROM.value();
      const adminBcc = ADMIN_INBOX.value() || undefined;
      if (!sgKey || !from) {
        return res.status(500).json({ ok: false, error: "SendGrid not configured" });
      }
      sgMail.setApiKey(sgKey);

      // ✅ Request parameters
      const {
        classId,
        subject,
        text,
        html,
        dryRun,
        max = 200
      } = req.body || {};

      if (!classId) return res.status(400).json({ ok: false, error: "classId is required" });

      // ✅ Fetch class info
      const classSnap = await db.collection("classes").doc(classId).get();
      if (!classSnap.exists) return res.status(404).json({ ok: false, error: "Class not found" });
      const cls = classSnap.data();

      const base = { ok: true, class: { id: classId, name: cls.name, time: cls.time } };

      // ✅ Find all bookings
      const bookSnap = await db.collection("bookings").where("classId", "==", classId).get();
      const uids = Array.from(new Set(bookSnap.docs.map(d => d.data().userId).filter(Boolean)));

      if (uids.length === 0) {
        return res.status(200).json({ ...base, sent: 0, recipients: [] });
      }

      // ✅ Fetch user emails from users collection or Auth
      const emails = [];
      for (const uid of uids) {
        try {
          const uDoc = await db.collection("users").doc(uid).get();
          const emailFromUsers = uDoc.exists && uDoc.data()?.email;
          if (emailFromUsers) {
            emails.push(String(emailFromUsers));
            continue;
          }
          const authUser = await admin.auth().getUser(uid);
          if (authUser?.email) emails.push(String(authUser.email));
        } catch (_) {}
      }

      // ✅ Remove duplicates and limit count
      const unique = Array.from(new Set(emails)).slice(0, Math.max(0, Math.min(Number(max) || 0, 2000)) || 200);

      if (unique.length === 0) {
        return res.status(200).json({ ...base, sent: 0, recipients: [] });
      }

      // ✅ dryRun mode
      if (dryRun) {
        return res.status(200).json({ ...base, dryRun: true, count: unique.length, recipients: unique });
      }

      // ✅ Default message template
      const defaultSubject = `Reminder: ${cls.name} at ${cls.time}`;
      const defaultText =
        `This is a reminder for your class booking:\n\n` +
        `Class: ${cls.name}\n` +
        `Time: ${cls.time}\n\n` +
        `See you soon!`;
      const defaultHtml =
        `<p>This is a reminder for your class booking:</p>` +
        `<p><b>Class:</b> ${cls.name}<br/><b>Time:</b> ${cls.time}</p>` +
        `<p>See you soon!</p>`;

      // ✅ Send batch email
      const msg = {
        to: unique,
        from,
        subject: subject || defaultSubject,
        text: text || defaultText,
        html: html || defaultHtml,
        bcc: adminBcc,
      };

      await sgMail.sendMultiple(msg);

      return res.status(200).json({
        ...base,
        ok: true,
        sent: unique.length,
        recipients: unique,
        bcc: adminBcc || null,
      });
    } catch (err) {
      console.error("sendClassReminder failed:", err);
      const detail = err?.response?.body || err.message || String(err);
      return res.status(500).json({ ok: false, error: "sendClassReminder failed", detail });
    }
  });
});

// ✅ Public read-only API: returns class data (safe field whitelist)
//    Supports: CORS, OPTIONS preflight, GET method; optional limit/orderBy; adds cache headers
exports.publicClasses = onRequest(
  { region: "australia-southeast2" },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method === "OPTIONS") return res.status(204).send("");
      if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

      try {
        // Optional query params: ?limit=50&orderBy=time
        const { limit, orderBy } = req.query || {};
        let q = db.collection("classes");
        if (orderBy) q = q.orderBy(String(orderBy));
        if (limit)   q = q.limit(Number(limit));

        const snap = await q.get();

        // Safe field whitelist (avoid exposing sensitive data)
        const SAFE_FIELDS = ["name", "time", "capacity", "enrolled"];

        const data = snap.docs.map(d => {
          const raw = d.data() || {};
          const safe = {};
          SAFE_FIELDS.forEach(k => (safe[k] = raw[k] ?? null));
          return { id: d.id, ...safe };
        });

        // Add cache headers for public API
        res.set("Cache-Control", "public, max-age=60, s-maxage=300");
        return res.status(200).json({ ok: true, count: data.length, data });
      } catch (e) {
        console.error("publicClasses error:", e);
        return res.status(500).json({ ok: false, error: e.message || String(e) });
      }
    });
  }
);
