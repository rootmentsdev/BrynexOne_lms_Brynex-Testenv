import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import mongoose from 'mongoose';
import Branch from '../model/Branch.js';

const greytHRStores = [
  'Office', 'SUITOR GUY EDAPPALLY', 'SUITOR GUY EDAPPAL', 'SUITOR GUY PALAKKAD',
  'ZORUCCI EDAPPALLY', 'SUITOR GUY PERINTHALMANNA', 'SUITOR GUY THRISSUR',
  'SUITOR GUY MG ROAD', 'SUITOR GUY KOTTAKKAL', 'SUITOR GUY KANNUR',
  'ZORUCCI PERINTHALMANNA', 'SUITOR GUY TRIVANDRUM', 'SUITOR GUY MANJERI',
  'ZORUCCI EDAPPAL', 'SUITOR GUY CHAVAKKAD', 'SUITOR GUY VATAKARA',
  'SUITOR GUY CALICUT', 'SUITOR GUY KOTTAYAM', 'ZORUCCI KOTTAKKAL',
  'SUITOR GUY KALPETTA'
];

function findMatchingBranch(rawStoreName, branchesList) {
  if (!rawStoreName) return null;
  const str = String(rawStoreName).trim().toLowerCase();

  const direct = branchesList.find(
    b => (b.workingBranch && b.workingBranch.toLowerCase() === str) || String(b.locCode) === str
  );
  if (direct) return direct;

  const isZorucci = str.includes('zorucci') || str.startsWith('z');
  const cleanLoc = str.replace(/^(suitor guy|grooms|zorucci|sg|g|z)[\.\-\s]*/i, "").trim();

  const matched = branchesList.find(b => {
    const bName = (b.workingBranch || '').toLowerCase();
    const bIsZorucci = bName.includes('zorucci') || bName.startsWith('z');
    if (isZorucci !== bIsZorucci && !str.includes('office')) return false;

    const bClean = bName.replace(/^(suitor guy|grooms|zorucci|sg|g|z)[\.\-\s]*/i, "").trim();
    return bClean === cleanLoc || (cleanLoc && bClean.includes(cleanLoc)) || (bClean && cleanLoc.includes(bClean));
  });

  return matched || null;
}

async function main() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not found in .env');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI);
    const branches = await Branch.find({}).lean();
    console.log(`Found ${branches.length} branches in database.\n`);

    console.log('--- Matching Results ---');
    greytHRStores.forEach(store => {
      const matched = findMatchingBranch(store, branches);
      if (matched) {
        console.log(`✅ '${store}' -> '${matched.workingBranch}' (Code: ${matched.locCode})`);
      } else {
        console.log(`❌ '${store}' -> NO MATCH`);
      }
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.connection.close();
  }
}

main();
