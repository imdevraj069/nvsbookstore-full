// Slug Helper Utilities

/**
 * Generate a URL-friendly slug from a string
 */
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Ensure a slug is unique within a model by appending a counter if needed
 * @param {Model} Model - Mongoose model
 * @param {string} baseSlug - The base slug to check
 * @param {string|null} excludeId - Optional ID to exclude (for updates)
 * @returns {string} A unique slug
 */
const getUniqueSlug = async (Model, baseSlug, excludeId = null) => {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = await Model.findOne(query).lean();
    if (!existing) return slug;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

module.exports = { generateSlug, getUniqueSlug };
