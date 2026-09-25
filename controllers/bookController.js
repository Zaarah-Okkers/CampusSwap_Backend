import { asyncRoute } from "../utils/asyncRoute.js";
import { getBooks } from "../models/bookModel.js";

// The DB stores format as an ENUM ('ebook','audiobook','guide').
// The frontend wants a label + a CSS class name.
const FORMAT_LABELS = {
  ebook: "eBook",
  audiobook: "Audiobook",
  guide: "Study Guide",
};

/**
 * GET /api/books?format=ebook|audiobook|guide
 */
export const listBooks = asyncRoute(async (req, res) => {
  const { format = "" } = req.query;
  const rows = await getBooks({ format });

  const data = rows.map((r) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    description: r.description,
    price: Number(r.price),
    size: r.size,
    module: r.module,
    formatKey: r.format,
    formatLabel: FORMAT_LABELS[r.format] || r.format,
    formatClass: r.format,
    cover: r.cover_url,
    sellerName: r.seller_name,
    university: r.university_name,
  }));

  res.json({ success: true, count: data.length, data });
});