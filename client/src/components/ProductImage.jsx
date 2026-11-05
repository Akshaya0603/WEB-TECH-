import { useEffect, useState } from 'react';
import { emojiFor } from '../api.js';

// Tries, in order: product.imageUrl (if set), /images/<productId>.jpg|png|webp|svg, then an emoji.
const EXTS = ['jpg', 'png', 'webp', 'svg'];

export default function ProductImage({ productId, imageUrl, category, alt, small = false }) {
  const sources = [...(imageUrl ? [imageUrl] : []), ...EXTS.map((e) => `/images/${productId}.${e}`)];
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [productId, imageUrl]);

  if (i >= sources.length)
    return small ? <span className="cart-img emoji">{emojiFor(category)}</span> : <div className="thumb">{emojiFor(category)}</div>;

  return (
    <img
      className={small ? 'cart-img' : 'pimg'}
      src={sources[i]}
      alt={alt}
      loading="lazy"
      onError={() => setI(i + 1)}
    />
  );
}
