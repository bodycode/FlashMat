export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatScore = (correct, total) => {
  if (total === 0) return '0%';
  return `${Math.round((correct / total) * 100)}%`;
};

export const formatMathExpression = (expression) => {
  // Remove extra whitespace and normalize math operators
  return expression
    .replace(/\s+/g, ' ')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .trim();
};
