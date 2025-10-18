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

// 同一用户同一课程只能报名一次（使用确定性文档ID + tx.create）
// 还包含：OPTIONS 放行、容量健壮性、可选 idToken 校验
exports.bookClass = onRequest({ region: "australia-southeast2" }, async (req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    try {
      let { userId, classId, idToken } = req.body || {};

      // 如果前端传了 idToken，则以后端解出的 uid 为准（更安全）
      if (idToken) {
        const decoded = await admin.auth().verifyIdToken(idToken);
        userId = decoded.uid;
      }

      if (!userId || !classId) {
        return res.status(400).json({ ok: false, error: "Missing userId or classId" });
      }

      // 生成“唯一键”作为文档ID：<classId>_<userId>
      const bookingId = `${classId}_${userId}`;

      const result = await db.runTransaction(async (tx) => {
        // 读课程
        const classRef = db.collection("classes").doc(classId);
        const classSnap = await tx.get(classRef);
        if (!classSnap.exists) throw new Error("Class not found");

        const cls = classSnap.data() || {};
        const enrolled = Number(cls.enrolled || 0);
        const capacity = Number(cls.capacity || 0);
        if (capacity > 0 && enrolled >= capacity) throw new Error("Class is full");

        // 【关键】用固定ID + create，若已存在则抛错 -> 达到唯一性
        const bookingRef = db.collection("bookings").doc(bookingId);

        // 可选：提前读一下，给出更友好的错误信息
        const existing = await tx.get(bookingRef);
        if (existing.exists) throw new Error("Already booked");

        // 查邮箱（users 集合优先，其次 Auth）
        let userEmail = null;
        try {
          const uDoc = await db.collection("users").doc(userId).get();
          if (uDoc.exists) userEmail = uDoc.data()?.email || null;
          if (!userEmail) {
            const authUser = await admin.auth().getUser(userId);
            userEmail = authUser?.email || null;
          }
        } catch (_) {}

        // 只允许“创建”，避免被覆盖
        tx.create(bookingRef, {
          userId,
          userEmail: userEmail || null,
          classId,
          className: cls.name || null,
          classTime: cls.time || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 报名数 +1
        tx.update(classRef, { enrolled: admin.firestore.FieldValue.increment(1) });

        return {
          bookingId,
          class: { id: classId, name: cls.name || null, time: cls.time || null },
          user: { id: userId, email: userEmail || null },
        };
      });

      return res.json({ ok: true, ...result });
    } catch (e) {
      // Firestore 已存在时 tx.create 会抛错 -> 转成 Already booked
      const msg = (e && e.message) || String(e);
      return res.status(400).json({ ok: false, error: msg.includes("Already booked") ? "Already booked" : msg });
    }
  });
});

// 取消报名（同一用户对同一课程的 bookingId = <classId>_<userId>）
// - 支持 OPTIONS、CORS、idToken（优先用后端解出的 uid）
// - 事务里：确认 booking 存在 -> 删除 booking -> 安全地将 enrolled -1（不小于 0）
exports.cancelClass = onRequest({ region: "australia-southeast2" }, async (req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    try {
      let { userId, classId, idToken } = req.body || {};

      // 若前端提供 idToken，则以校验后的 uid 为准
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

        // 读报名文档：必须存在才能取消
        const [classSnap, bookingSnap] = await Promise.all([tx.get(classRef), tx.get(bookingRef)]);
        if (!classSnap.exists) throw new Error("Class not found");
        if (!bookingSnap.exists) throw new Error("Not booked");

        // 删除报名
        tx.delete(bookingRef);

        // 安全递减 enrolled（不小于 0）
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
      // 输出更友好的错误消息
      let reason = msg;
      if (msg.includes("Not booked")) reason = "Not booked";
      if (msg.includes("Class not found")) reason = "Class not found";
      return res.status(400).json({ ok: false, error: reason });
    }
  });
});


// ------------------ ⑤ /sendClassReminder （群发课程提醒）------------------
exports.sendClassReminder = onRequest({ region: "australia-southeast2" }, async (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Only POST is allowed" });
      }

      // ✅ 读取 SendGrid 配置
      const sgKey = SENDGRID_KEY.value();
      const from = SEND_FROM.value();
      const adminBcc = ADMIN_INBOX.value() || undefined;
      if (!sgKey || !from) {
        return res.status(500).json({ ok: false, error: "SendGrid not configured" });
      }
      sgMail.setApiKey(sgKey);

      // ✅ 请求体参数
      const {
        classId,
        subject,   // 可自定义标题
        text,      // 可自定义文本正文
        html,      // 可自定义 HTML 正文
        dryRun,    // true 时只返回收件人清单，不发送
        max = 200  // 群发上限（默认 200）
      } = req.body || {};

      if (!classId) return res.status(400).json({ ok: false, error: "classId is required" });

      // ✅ 读取课程信息
      const classSnap = await db.collection("classes").doc(classId).get();
      if (!classSnap.exists) return res.status(404).json({ ok: false, error: "Class not found" });
      const cls = classSnap.data();

      // ✅ 构建基础返回信息（即使无人发送也有）
      const base = { ok: true, class: { id: classId, name: cls.name, time: cls.time } };

      // ✅ 查找报名记录
      const bookSnap = await db.collection("bookings").where("classId", "==", classId).get();
      const uids = Array.from(new Set(bookSnap.docs.map(d => d.data().userId).filter(Boolean)));

      if (uids.length === 0) {
        return res.status(200).json({ ...base, sent: 0, recipients: [] });
      }

      // ✅ 获取所有用户邮箱（从 users 集合或 Auth）
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
        } catch (_) {
          // 单个用户错误不影响整体
        }
      }

      // ✅ 去重 + 限制数量
      const unique = Array.from(new Set(emails)).slice(0, Math.max(0, Math.min(Number(max) || 0, 2000)) || 200);

      if (unique.length === 0) {
        return res.status(200).json({ ...base, sent: 0, recipients: [] });
      }

      // ✅ dryRun 模式
      if (dryRun) {
        return res.status(200).json({ ...base, dryRun: true, count: unique.length, recipients: unique });
      }

      // ✅ 默认邮件模板（若前端未传自定义内容）
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

      // ✅ 发送群发邮件
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

// ✅ 公开只读接口：返回 classes 集合数据（安全字段白名单）
//    支持：CORS、OPTIONS 预检、GET 方法；可选 limit/orderBy；带缓存头
exports.publicClasses = onRequest(
  { region: "australia-southeast2" },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method === "OPTIONS") return res.status(204).send("");
      if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

      try {
        // 可选查询参数：?limit=50&orderBy=time
        const { limit, orderBy } = req.query || {};
        let q = db.collection("classes");
        if (orderBy) q = q.orderBy(String(orderBy));
        if (limit)   q = q.limit(Number(limit));

        const snap = await q.get();

        // 安全字段白名单（不要把敏感字段暴露出去）
        const SAFE_FIELDS = ["name", "time", "capacity", "enrolled"];

        const data = snap.docs.map(d => {
          const raw = d.data() || {};
          const safe = {};
          SAFE_FIELDS.forEach(k => (safe[k] = raw[k] ?? null));
          return { id: d.id, ...safe };
        });

        // 给公开接口加缓存（视情况可调）
        res.set("Cache-Control", "public, max-age=60, s-maxage=300");
        return res.status(200).json({ ok: true, count: data.length, data });
      } catch (e) {
        console.error("publicClasses error:", e);
        return res.status(500).json({ ok: false, error: e.message || String(e) });
      }
    });
  }
);



