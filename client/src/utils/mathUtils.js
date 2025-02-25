export const evaluateMathExpression = (expression) => {
  try {
    // Safely evaluate mathematical expressions
    // eslint-disable-next-line no-new-func
    return new Function(`return ${expression}`)();
  } catch (e) {
    console.error('Math evaluation error:', e);
    return null;
  }
};

export const compareMathAnswers = (userAnswer, correctAnswer, tolerance = 0.01) => {
  const userValue = parseFloat(userAnswer);
  const correctValue = parseFloat(correctAnswer);

  if (isNaN(userValue) || isNaN(correctValue)) {
    return false;
  }

  return Math.abs(userValue - correctValue) <= tolerance;
};

export const simplifyFraction = (numerator, denominator) => {
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const divisor = gcd(numerator, denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
};

export const formatMathDisplay = (expression) => {
  // Replace basic operators with LaTeX notation
  return expression
    .replace(/\*/g, '\\times ')
    .replace(/\//g, '\\div ')
    .replace(/\^/g, '^{')
    .replace(/\((\d+)\)\^/g, '($1)}');
};
