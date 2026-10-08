function isSafeImageUrl(value) {
  return typeof value === 'string' &&
    (/^https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_./-]+(?:\?[A-Za-z0-9_./=&%-]*)?$/i.test(value) ||
      /^\/(?!\/)(?!.*\.\.)[A-Za-z0-9_./-]+\.(?:jpe?g|png|webp|avif|gif)$/i.test(value));
}

module.exports = { isSafeImageUrl };
