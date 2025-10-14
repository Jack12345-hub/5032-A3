// CommonJS version (using require / exports)

const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

/* ------------------------------------------
 * ① Count the number of documents in "books" (return JSON)
 *    GET https://<region>-<project>.cloudfunctions.net/countBooks
 * ------------------------------------------ */
exports.countBooks = onRequest(
  { region: "australia-southeast2" },
  async (req, res) => {
    // Manual CORS handling (v2 also supports { cors: true }, but we keep it consistent with your setup)
    cors(req, res, async () => {
      try {
        const snap = await db.collection("books").get();
        res.status(200).json({ count: snap.size });
      } catch (err) {
        console.error("Error counting books:", err);
        res.status(500).json({ error: "Error counting books" });
      }
    });
  }
);

/* ------------------------------------------
 * ② Return all books as an array (JSON)
 *    GET https://<region>-<project>.cloudfunctions.net/getAllBooks
 * ------------------------------------------ */
exports.getAllBooks = onRequest(
  { region: "australia-southeast2" },
  async (req, res) => {
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
  }
);

// ---- SendGrid 邮件发送（POST /sendFeedbackEmail） -----------------
const sgMail = require("@sendgrid/mail");
// 推荐把 key / 发件人 / 管理员收件人都放到 functions config 里
// 下面会给出设置命令
const functionsConfig = require("firebase-functions/params");
const SENDGRID_KEY  = functionsConfig.defineString("SENDGRID_KEY");
const SEND_FROM     = functionsConfig.defineString("SEND_FROM");     // e.g. no-reply@yourdomain.com (需在 SendGrid 验证)
const ADMIN_INBOX   = functionsConfig.defineString("ADMIN_INBOX");   // e.g. you@yourdomain.com

exports.sendFeedbackEmail = onRequest(
  { region: "australia-southeast2" },
  async (req, res) => {
    cors(req, res, async () => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Only POST is allowed" });
        }

        // 初始化 SendGrid
        if (!SENDGRID_KEY.value()) {
          return res.status(500).json({ error: "SendGrid key not configured" });
        }
        sgMail.setApiKey(SENDGRID_KEY.value());

        const { name, email, message } = req.body || {};
        if (!name || name.length < 2) {
          return res.status(400).json({ error: "Invalid name" });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).json({ error: "Invalid email" });
        }

        // 1) 存入 Firestore（admin 可在表格页查看）
        await db.collection("feedback").add({
          name,
          email,
          message: message || "",
          at: admin.firestore.FieldValue.serverTimestamp(),
          ua: req.get("user-agent") || null,
          ip: (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0]
        });

        // 2) 发两封邮件：管理员通知 + 用户确认
        const from = SEND_FROM.value();
        const adminTo = ADMIN_INBOX.value();

        const tasks = [];

        if (adminTo) {
          tasks.push(
            sgMail.send({
              to: adminTo,
              from,
              subject: `[Gym] New feedback from ${name}`,
              text:
                `From: ${name} <${email}>\n\n` +
                `Message:\n${(message || "").trim() || "(no message)"}\n`,
            })
          );
        }

        tasks.push(
          sgMail.send({
            to: email,
            from,
            subject: "Thanks! We received your feedback",
            text:
              `Hi ${name},\n\n` +
              `Thanks for contacting us. We’ve received your message:\n\n` +
              `${(message || "").trim() || "(no message)"}\n\n` +
              `— Your Gym Team`,
          })
        );

        await Promise.all(tasks);
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error("sendFeedbackEmail failed:", err);
        return res.status(500).json({ error: "Email sending failed" });
      }
    });
  }
);


/* ------------------------------------------
 * ③ Firestore trigger: when a new document is created,
 *    convert all string fields to uppercase
 * ------------------------------------------ */
function upperize(value) {
  if (typeof value === "string") return value.toUpperCase();
  if (Array.isArray(value)) return value.map(upperize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, upperize(v)])
    );
  }
  return value;
}

exports.capitalizeBook = onDocumentCreated(
  {
    region: "australia-southeast2",
    document: "books/{bookId}",
  },
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
