const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../../database/db');
const config = require('../../../config');
const { validateUsername, validatePassword } = require('../../../shared');

const JWT_SECRET = config.JWT_SECRET;

const register = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const usernameError = validateUsername(username);
    if (usernameError) {
      return res.status(400).json({ error: usernameError });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: username.trim() }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        passwordHash
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username: username.trim() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        createdAt: true
      }
    });

    res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile
};
