import greythrService from '../services/greythrService.js';
import User from '../model/User.js';
import Admin from '../model/Admin.js';

/**
 * Normalizes raw employee items from GreytHR into standard Employee Page schema using GreytHR category metadata.
 */
function normalizeGreytHREmployee(item, categoriesMap = new Map()) {
  const empID = item.employeeNo || item.empNo || item.employeeId || item.empID || item.id || '';
  const firstName = item.firstName || item.first_name || '';
  const lastName = item.lastName || item.last_name || '';
  const fullName = item.employeeName || item.name || item.fullName || item.username || `${firstName} ${lastName}`.trim() || 'Employee';
  
  const cat = categoriesMap.get(item.employeeId) || {};

  const designation = cat['Designation']
    || (typeof item.designation === 'object' ? item.designation?.name : item.designation) 
    || item.role || item.jobTitle || 'Employee';

  const workingBranch = cat['Store Name']
    || cat['Department']
    || cat['Location']
    || (typeof item.location === 'object' ? item.location?.name : item.location) 
    || (typeof item.department === 'object' ? item.department?.name : item.department) 
    || item.workingBranch || item.branch || item.store || 'Main Store';

  const email = item.email || item.personalEmail || item.officialEmail || item.userEmail || '';
  const phoneNumber = item.mobile || item.phone || item.phoneNumber || item.phoneNo || '';
  const status = item.leftorg ? 'INACTIVE' : (item.status === 2 || item.status === 1 ? 'ACTIVE' : (item.status || 'ACTIVE'));

  return {
    _id: item._id || item.id || item.employeeId || empID,
    empID,
    username: fullName,
    email,
    phoneNumber,
    designation,
    workingBranch,
    status,
    trainingCount: Number(item.trainingCount) || 0,
    passCountTraining: Number(item.passCountTraining) || 0,
    trainingDue: Number(item.trainingDue || item.Trainingdue) || 0,
    trainingPending: Number(item.trainingPending) || 0,
    trainingCompletionPercentage: Number(item.trainingCompletionPercentage) || 0,
    assignedAssessmentsCount: Number(item.assignedAssessmentsCount) || 0,
    passCountAssessment: Number(item.passCountAssessment) || 0,
    assessmentDue: Number(item.assessmentDue || item.AssessmentDue) || 0,
    assessmentCompletionPercentage: Number(item.assessmentCompletionPercentage) || 0,
    taskCount: Number(item.taskCount) || 0,
    passCountTask: Number(item.passCountTask) || 0,
    taskDue: Number(item.taskDue) || 0,
    taskPending: Number(item.taskPending) !== undefined ? Number(item.taskPending) : 0,
    leftorg: Boolean(item.leftorg),
    leavingDate: item.leavingDate || null,
    rawSource: 'greytHR',
  };
}

/**
 * GET /api/greythr/employees
 * Controller to fetch Employee list exclusively from GreytHR API.
 */
export async function getEmployees(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = req.query.limit === 'All' || req.query.limit === '500' ? 500 : (parseInt(req.query.limit, 10) || 50);
    const search = (req.query.search || '').trim().toLowerCase();
    const storeFilter = req.query.store || 'All';
    const roleFilter = req.query.role || 'All';

    // 1. Fetch complete employee list from GreytHR API using size=2000
    const empRes = await greythrService.request('/employee/v2/employees?page=0&size=2000');
    const rawList = empRes?.data || (Array.isArray(empRes) ? empRes : []);

    // 2. Fetch complete category metadata from GreytHR using size=2000
    const categoriesMap = new Map();
    try {
      const catRes = await greythrService.request('/employee/v2/employees/categories?descRequired=true&page=0&size=2000');
      const catItems = catRes?.data || [];

      catItems.forEach(item => {
        const catObj = {};
        (item.categoryList || []).forEach(c => {
          if (c.categoryDesc && c.valueDesc) {
            catObj[c.categoryDesc] = c.valueDesc;
          }
        });
        categoriesMap.set(item.employeeId, catObj);
      });
    } catch (catErr) {
      console.warn('⚠️ Could not fetch GreytHR employee categories:', catErr.message);
    }

    // 3. Map & Normalize GreytHR Employee data
    let employees = rawList.map(item => normalizeGreytHREmployee(item, categoriesMap));

    // Deduplicate by empID
    const uniqueMap = new Map();
    employees.forEach(emp => {
      if (emp.empID && !uniqueMap.has(emp.empID)) {
        uniqueMap.set(emp.empID, emp);
      }
    });
    employees = Array.from(uniqueMap.values());

    // Extract available store and role filter options
    const storesSet = new Set();
    const rolesSet = new Set();
    employees.forEach(emp => {
      if (emp.workingBranch) storesSet.add(emp.workingBranch);
      if (emp.designation) rolesSet.add(emp.designation);
    });

    // Apply search filter
    if (search) {
      employees = employees.filter(e =>
        e.username.toLowerCase().includes(search) ||
        e.empID.toLowerCase().includes(search) ||
        e.designation.toLowerCase().includes(search) ||
        e.workingBranch.toLowerCase().includes(search)
      );
    }

    // Apply store filter
    if (storeFilter && storeFilter !== 'All') {
      employees = employees.filter(e => e.workingBranch.toLowerCase().includes(storeFilter.toLowerCase()));
    }

    // Apply role filter
    if (roleFilter && roleFilter !== 'All') {
      employees = employees.filter(e => e.designation.toLowerCase().includes(roleFilter.toLowerCase()));
    }

    // Sort employees by natural numeric order (Emp1, Emp2, Emp3 ... Emp10 ... Emp140)
    employees.sort((a, b) => {
      const numA = parseInt((a.empID || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt((b.empID || '').replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return (a.empID || '').localeCompare(b.empID || '');
    });

    // Pagination
    const totalEmployees = employees.length;
    const totalPages = Math.ceil(totalEmployees / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedEmployees = employees.slice(startIndex, startIndex + limit);

    return res.status(200).json({
      success: true,
      source: 'greytHR',
      data: paginatedEmployees,
      totalEmployees,
      totalPages,
      currentPage: page,
      filters: {
        stores: Array.from(storesSet),
        roles: Array.from(rolesSet),
      },
    });
  } catch (error) {
    console.error('❌ Error in getEmployees controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch employees from GreytHR',
      error: error.message,
    });
  }
}

/**
 * GET /api/greythr/categories
 * Controller to fetch Employee Categories from greytHR.
 */
export async function getEmployeeCategories(req, res) {
  try {
    const descRequired = req.query.descRequired !== 'false';
    const categories = await greythrService.getEmployeeCategories({ descRequired });

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: 'Failed to fetch employee categories from greytHR',
      error: error.message,
      details: error.details || null,
    });
  }
}

/**
 * GET /api/greythr/example
 * Controller to run the greytHR usage example and log results to console.
 */
export async function runExample(req, res) {
  try {
    const categories = await greythrService.logEmployeeCategoriesExample();
    return res.status(200).json({
      success: true,
      message: 'GreytHR usage example executed successfully. Check server console logs for details.',
      data: categories,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: 'GreytHR usage example failed',
      error: error.message,
    });
  }
}

/**
 * GET /api/greythr/token
 * Controller to trigger and inspect greytHR token status (without exposing secrets).
 */
export async function getTokenStatus(req, res) {
  try {
    const token = await greythrService.getAccessToken();
    return res.status(200).json({
      success: true,
      message: 'GreytHR access token retrieved and active',
      tokenPreview: `${token.substring(0, 10)}...`,
      domain: greythrService.getGreytHRDomain(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve GreytHR access token',
      error: error.message,
    });
  }
}

export default {
  getEmployees,
  getEmployeeCategories,
  runExample,
  getTokenStatus,
};
