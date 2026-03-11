import jwt from 'jsonwebtoken';

/**
 * Generates an access token and a refresh token.
 * 
 * @param {string} id - The MongoDB Object ID of the user.
 * @returns {{ accessToken: string, refreshToken: string }} Tokens
 */
const generateTokens = (id) => {
  const accessToken = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d', // As requested: access token 7d
  });

  const refreshToken = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // As requested: refresh token 30d
  });

  return { accessToken, refreshToken };
};

export default generateTokens;
