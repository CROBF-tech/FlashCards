import db from '../database.js';

const User = {
    findOne: async ({ email }) => {
        const user = await db.getUserByEmail(email);
        return user;
    },
};

export default User;
