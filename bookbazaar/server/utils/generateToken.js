import jwt from 'jsonwebtoken';

const generateTokens = (user) => {
  const payload = {
    id: user._id?.toString?.() || user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d', // As requested: access token 7d
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '30d', // As requested: refresh token 30d
  });

  return { accessToken, refreshToken };
};

export default generateTokens;
