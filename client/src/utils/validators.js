export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  const minLength = 6;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);

  return {
    isValid: password.length >= minLength && hasNumber && hasLetter,
    errors: {
      length: password.length < minLength,
      number: !hasNumber,
      letter: !hasLetter,
    },
  };
};

export const validateMathExpression = (expression) => {
  try {
    // Basic validation - checks if expression can be evaluated
    // eslint-disable-next-line no-new-func
    new Function(`return ${expression}`)();
    return true;
  } catch (e) {
    return false;
  }
};

export const validateImageUrl = (url) => {
  const pattern = /\.(jpg|jpeg|png|gif|webp)$/i;
  return pattern.test(url);
};
