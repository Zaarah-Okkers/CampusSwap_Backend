// The DB returns snake_case; ProductCard / ProductModal read camelCase.
// We return both so every component gets the shape it expects.
const CONDITION_LABELS = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  used: "Used",
};

export const mapProductRow = (row) => {
  if (!row) return row;
  const label = CONDITION_LABELS[row.condition_status] || row.condition_status;
  const listingType =
    row.listing_type === "sale_and_swap" ? "swap" : row.listing_type;

  return {
    ...row,
    image: row.image_url,
    condition: label,
    conditionClass: row.condition_status === "fair" ? "fair" : undefined,
    listingType,
    rentPeriod: row.rent_period,
    swapFor: row.swap_for,
    sellerName: row.seller_name,
    sellerRating:
      row.seller_rating != null ? Number(row.seller_rating) : null,
    rating: row.rating != null ? Number(row.rating) : 0,
    category: row.category_name,
    university: row.university_name,
    condition_label: label,
  };
};