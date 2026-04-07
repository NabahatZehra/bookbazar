import dotenv from 'dotenv';
import mongoose from 'mongoose';

import User from '../models/User.js';

dotenv.config();

const ADMIN_EMAIL = 'admin@bookbazaar.com';
const ADMIN_PASSWORD = 'Admin@123456';

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit(0);
    }

    await User.create({
      name: 'Admin',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
    });

    console.log('Admin created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();

