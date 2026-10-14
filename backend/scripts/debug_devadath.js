import dotenv from 'dotenv';
dotenv.config();
import { request } from '../services/greythrService.js';
import connectMongoDB from '../db/database.js';
import Employee from '../model/Employee.js';
import User from '../model/User.js';
import Admin from '../model/Admin.js';

async function run() {
  await connectMongoDB();
  try {
    const empRes = await request('/employee/v2/employees?page=0&size=2000');
    console.log('\n--- greytHR Employees ---');
    const greyMatches = empRes.data.filter(e => 
      JSON.stringify(e).toLowerCase().includes('devad') || 
      JSON.stringify(e).toLowerCase().includes('aswin')
    );
    greyMatches.forEach(e => {
      console.log(`[greytHR] employeeNo: "${e.employeeNo}", name: "${e.name}", employeeId: ${e.employeeId}`);
    });

    const dbEmps = await Employee.find({ 
      $or: [{ username: /devad|aswin/i }, { firstName: /devad|aswin/i }, { empID: /devad|aswin|515|604|104/i }] 
    }).lean();
    console.log('\n--- DB Employee Collection ---');
    dbEmps.forEach(e => {
      console.log(`[Employee Coll] empID: "${e.empID}", username: "${e.username}", workingBranch: "${e.workingBranch}"`);
    });

    const dbUsers = await User.find({ 
      $or: [{ username: /devad|aswin/i }, { empID: /devad|aswin/i }] 
    }).lean();
    console.log('\n--- DB User Collection ---');
    dbUsers.forEach(u => {
      console.log(`[User Coll] empID: "${u.empID}", username: "${u.username}", workingBranch: "${u.workingBranch}"`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
