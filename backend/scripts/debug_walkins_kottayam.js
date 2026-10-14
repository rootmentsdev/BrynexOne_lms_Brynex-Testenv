import dotenv from 'dotenv';
dotenv.config();
import connectMongoDB from '../db/database.js';
import mongoose from 'mongoose';

async function run() {
  await connectMongoDB();
  try {
    const Walkin = mongoose.model('Walkin', new mongoose.Schema({}, { strict: false }));
    const walkins = await Walkin.find({ 
      $or: [{ store: /kottayam/i }, { storeId: /kottayam/i }] 
    }).lean();

    console.log(`Found ${walkins.length} walkins for Kottayam:`);
    walkins.forEach(w => {
      console.log(`[Walkin] _id: ${w._id}, staff: "${w.staff}", staffName: "${w.staffName}", empCode: "${w.empCode}", empID: "${w.empID}", createdBy:`, w.createdBy);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
