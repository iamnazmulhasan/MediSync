// src/data/durations.js
export const commonDurations = [
  "১ দিন", "২ দিন", "৩ দিন", "৪ দিন", "৫ দিন", "৬ দিন", "৭ দিন", "০৭ দিন",
  "৮ দিন", "৯ দিন", "০৯ দিন", "১০ দিন", "১২ দিন", "১৪ দিন", "১৫ দিন", "১৬ দিন",
  "১৮ দিন", "২০ দিন", "২১ দিন", "২৪ দিন", "২৮ দিন", "৩০ দিন", "৪৫ দিন", "৬০ দিন",
  "৯০ দিন"
];

export const fetchDurations = async () => {
  await new Promise(r => setTimeout(r, 20));
  return commonDurations;
};

export const searchDurations = (query = "") => {
  if (!query) return commonDurations;
  const q = query.toLowerCase().trim();
  return commonDurations.filter(item => item.toLowerCase().includes(q));
};