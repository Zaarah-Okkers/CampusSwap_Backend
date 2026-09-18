function mapProduct(row) {
  const product = {
    id: row.id,
    listingType: row.listing_type,
    name: row.name,
    price: row.price !== null ? Number(row.price) : undefined,
    condition: row.condition_label,
    conditionClass: row.condition_class || '',
    rating: Number(row.rating),
    sales: row.sales,
    sellerRating: row.seller_rating !== null ? Number(row.seller_rating) : 0,
    image: row.image_url,
    university: row.university_name || '',
    sellerName: row.seller_name,
    description: row.description
  }

  if (row.listing_type === 'rent') {
    product.rentPeriod = row.rent_period
  }

  if (row.listing_type === 'swap') {
    product.swapFor = row.swap_for
  }

  return product
}

function mapReview(row) {
  return {
    reviewerName: row.reviewer_name,
    productRating: row.product_rating,
    sellerRating: row.seller_rating,
    comment: row.comment
  }
}

module.exports = { mapProduct, mapReview }