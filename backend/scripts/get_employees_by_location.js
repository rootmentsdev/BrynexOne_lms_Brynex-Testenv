import dotenv from 'dotenv';
dotenv.config();
import { request } from '../services/greythrService.js';

async function getEmployeesByLocation(locationQuery) {
  if (!locationQuery) {
    console.log('Usage: node scripts/get_employees_by_location.js "<LocationName>"');
    console.log('Example: node scripts/get_employees_by_location.js "Kannur"');
    process.exit(1);
  }

  try {
    const empRes = await request('/employee/v2/employees?page=0&size=2000');
    const catRes = await request('/employee/v2/employees/categories?descRequired=true&page=0&size=2000');

    const catMap = new Map();
    (catRes.data || []).forEach(item => {
      const catObj = {};
      (item.categoryList || []).forEach(c => {
        if (c.categoryDesc && c.valueDesc) catObj[c.categoryDesc] = c.valueDesc;
      });
      catMap.set(item.employeeId, catObj);
    });

    const queryLower = locationQuery.trim().toLowerCase();

    const matchedEmployees = empRes.data.map(e => {
      const cats = catMap.get(e.employeeId) || {};
      const storeName = cats['Store Name'] || cats['Location'] || cats['Department'] || '';
      return {
        employeeNo: e.employeeNo,
        name: e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim(),
        email: e.email || e.personalEmail || e.officialEmail || 'N/A',
        mobile: e.mobile || e.phoneNumber || 'N/A',
        designation: cats['Designation'] || e.designation || 'N/A',
        storeName: storeName || 'Main Store',
        dateOfJoin: e.dateOfJoin || 'N/A',
        leftorg: Boolean(e.leftorg),
        leavingDate: e.leavingDate || null,
        status: e.leftorg ? 'INACTIVE (Resigned)' : 'ACTIVE'
      };
    }).filter(e => e.storeName.toLowerCase().includes(queryLower));

    console.log(`\n======================================================`);
    console.log(`📍 EMPLOYEES FOR LOCATION QUERY: "${locationQuery}"`);
    console.log(`======================================================`);
    console.log(`Total Found: ${matchedEmployees.length}`);
    console.log(`Active Count: ${matchedEmployees.filter(e => !e.leftorg).length}`);
    console.log(`Resigned Count: ${matchedEmployees.filter(e => e.leftorg).length}\n`);

    console.table(matchedEmployees.map(e => ({
      'Emp ID': e.employeeNo,
      'Name': e.name,
      'Designation': e.designation,
      'Store': e.storeName,
      'Status': e.status,
      'Joined': e.dateOfJoin,
      'Left': e.leavingDate || '-'
    })));

  } catch (err) {
    console.error('Error fetching employees:', err.message);
  } finally {
    process.exit(0);
  }
}

const locationArg = process.argv[2] || 'Edappally';
getEmployeesByLocation(locationArg);
