import mongoose from 'mongoose';

/**
 * Connects to MongoDB with retry logic
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  const MAX_RETRIES = 5;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`Error connecting to MongoDB: ${error.message}`);
      retries += 1;
      console.log(`Retrying connection (${retries}/${MAX_RETRIES})...`);
      // Wait 5 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.error('Failed to connect to MongoDB after maximum retries. Exiting...');
  process.exit(1);
};

export default connectDB;
