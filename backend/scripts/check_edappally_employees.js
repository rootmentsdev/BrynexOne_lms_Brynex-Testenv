import dotenv from 'dotenv';
dotenv.config();
import { request } from '../services/greythrService.js';

async function main() {
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

    const allEmps = empRes.data.map(e => {
      const cats = catMap.get(e.employeeId) || {};
      const storeName = cats['Store Name'] || cats['Location'] || cats['Department'] || '';
      return {
        empNo: e.employeeNo,
        name: e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim(),
        leftorg: e.leftorg || false,
        leavingDate: e.leavingDate || null,
        designation: cats['Designation'] || e.designation || 'N/A',
        storeName,
      };
    });

    const sgEdappallyActive = allEmps.filter(e => 
      !e.leftorg && !e.leavingDate && e.storeName.toUpperCase().includes('SUITOR GUY EDAP')
    );

    const zorucciEdappallyActive = allEmps.filter(e => 
      !e.leftorg && !e.leavingDate && e.storeName.toUpperCase().includes('ZORUCCI EDAP')
    );

    console.log(`\n=== SUITOR GUY EDAPPALLY (ACTIVE ONLY) ===`);
    console.log(`Count: ${sgEdappallyActive.length}`);
    sgEdappallyActive.forEach((e, idx) => console.log(`${idx + 1}. [${e.empNo}] ${e.name} - ${e.designation}`));

    console.log(`\n=== ZORUCCI EDAPPALLY (ACTIVE ONLY) ===`);
    console.log(`Count: ${zorucciEdappallyActive.length}`);
    zorucciEdappallyActive.forEach((e, idx) => console.log(`${idx + 1}. [${e.empNo}] ${e.name} - ${e.designation}`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
