// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

// 初始化 Admin SDK（供 Firestore 读写）
admin.initializeApp();

/* -----------------------------------------------------------
 * ① HTTP 云函数：统计 books 集合内文档数量
 *    GET https://australia-southeast2-<project>.cloudfunctions.net/countBooks
 * ----------------------------------------------------------- */
exports.countBooks = onRequest(
  { region: "australia-southeast2" },
  (req, res) => {
    cors(req, res, async () => {
      try {
        const snapshot = await admin.firestore().collection("books").get();
        res.status(200).json({ count: snapshot.size });
      } catch (error) {
        console.error("Error counting books:", error);
        res.status(500).json({ error: "Error counting books" });
      }
    });
  }
);

/* -----------------------------------------------------------
 * ② Firestore 触发器：当 books 新增文档时，把所有字符串字段转为大写
 *    - 使用 onCreate → update 写回；不会形成死循环
 *    - 递归处理：字符串、数组、嵌套对象里的字符串都会被大写化
 *    - 非字符串（数字、布尔、时间戳等）保持不变
 * ----------------------------------------------------------- */

// 递归将任意值中的字符串转为大写
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
    const snap = event.data; // DocumentSnapshot
    if (!snap) return;

    const data = snap.data();
    if (!data) return;

    const transformed = upperize(data);

    // 若没有任何变化则跳过写回
    const changed =
      JSON.stringify(transformed) !== JSON.stringify(data);

    if (changed) {
      await snap.ref.update(transformed);
      console.log(`books/${snap.id} uppercased successfully.`);
    } else {
      console.log(`books/${snap.id} already uppercased. Skipped.`);
    }
  }
);
