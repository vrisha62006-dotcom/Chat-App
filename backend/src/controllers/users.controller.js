const prisma = require('../../../database/db');

const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        NOT: {
          id: req.user.id
        }
      },
      select: {
        id: true,
        username: true,
        isOnline: true,
        lastSeenAt: true
      },
      orderBy: {
        username: 'asc'
      }
    });

    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers
};
