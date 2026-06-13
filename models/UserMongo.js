const { User } = require('../database/mongodb');

class UserModel {
    async create(userData) {
        const user = await User.create(userData);
        return {
            id: user._id,
            account_number: user.account_number,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
        };
    }

    async findByEmail(email) {
        return await User.findOne({ email });
    }

    async findById(id) {
        return await User.findById(id);
    }

    async getAll() {
        return await User.find({}).select('-password_hash');
    }

    async update(id, data) {
        return await User.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { new: true });
    }
}

module.exports = UserModel;
