/**
 * Generate store URL with query parameters
 */
export function getStoreUrl(category = null, types = [], prices = [], sort = null) {
  const params = new URLSearchParams();
  if (category && category !== "All") params.set("category", category);
  if (types.length > 0) params.set("types", types.join(","));
  if (prices.length > 0) params.set("prices", prices.join(","));
  if (sort && sort !== "featured") params.set("sort", sort);
  const query = params.toString();
  return `/store${query ? "?" + query : ""}`;
}

/**
 * Generate store URL filtered by a specific tag
 */
export function getTagUrl(tag) {
  const params = new URLSearchParams();
  params.set("tags", tag);
  return `/store?${params.toString()}`;
}

/**
 * Generate store URL filtered by category
 */
export function getCategoryUrl(category) {
  const params = new URLSearchParams();
  if (category !== "All") params.set("category", category);
  const query = params.toString();
  return `/store${query ? "?" + query : ""}`;
}
