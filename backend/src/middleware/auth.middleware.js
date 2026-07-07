const jwt = require('jsonwebtoken');
const prisma = require('../../../database/db');
const config = require('../../../config');

const JWT_SECRET = config.JWT_SECRET;

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'User session invalid' });
    }

    req.user = {
      id: user.id,
      username: user.username
    };

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token is invalid or expired' });
    }
    next(err);
  }
};

module.exports = {
  authenticate
};
