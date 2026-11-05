// Small fetch wrapper: adds the JWT, parses JSON, throws Error(message) on failures
export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch('/api' + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && auth) window.dispatchEvent(new Event('auth-expired'));
    throw new Error(data.message || 'Something went wrong.');
  }
  return data;
}

export const money = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const CATEGORY_EMOJI = {
  Footwear: '👟',
  Clothing: '👕',
  Accessories: '🕶️',
  Bags: '🎒',
  Watches: '⌚',
};
export const emojiFor = (c) => CATEGORY_EMOJI[c] || '🛍️';
