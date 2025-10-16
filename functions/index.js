// CommonJS (require/exports)

// ---- imports (只声明一次) ----
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const functionsConfig = require("firebase-functions/params");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const sgMail = require("@sendgrid/mail");

// ---- Firebase Admin 初始化（只初始化一次）----
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ---- SendGrid 配置（从 functions params / .env.* 读取）----
const SENDGRID_KEY = functionsConfig.defineString("SENDGRID_KEY");
const SEND_FROM    = functionsConfig.defineString("SEND_FROM");    // 已验证域名邮箱
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

      // 写入反馈
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

      // 管理员通知
      const adminMsg = adminTo
        ? {
            to: adminTo,
            from,
            subject: `[Gym] New feedback from ${name}`,
            text: `From: ${name} <${email}>\n\nMessage:\n${(message || "").trim() || "(no message)"}\n`,
            attachments: parsed.list,
          }
        : null;

      // 用户回执（若不想带附件就删掉 attachments）
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
