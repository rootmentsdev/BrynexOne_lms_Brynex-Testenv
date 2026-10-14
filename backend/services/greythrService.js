import axios from 'axios';

/**
 * GreytHR API Integration Service
 * All credentials are read from environment variables on the server-side.
 */

// In-memory token cache
let tokenCache = {
  token: null,
  expiresAt: null,
};

/**
 * Helper to get configured GreytHR domain.
 */
export function getGreytHRDomain() {
  const domain = process.env.GREYTHR_DOMAIN || 'api.greythr.com';
  // Strip protocol if user included it in .env
  return domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

/**
 * Clear the in-memory access token cache.
 */
export function clearTokenCache() {
  tokenCache = { token: null, expiresAt: null };
}

/**
 * Step 1: Obtain Access Token
 * Performs HTTP Basic Auth to fetch OAuth2 token and caches it in memory.
 * 
 * Endpoint: POST https://${GREYTHR_DOMAIN}/uas/v1/oauth2/client-token
 */
export async function getAccessToken(options = {}) {
  const { forceRefresh = false } = options;
  const now = Date.now();

  // Return cached token if valid and not forcing refresh (with 60-second safety buffer)
  if (!forceRefresh && tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now + 60000) {
    return tokenCache.token;
  }

  const domain = getGreytHRDomain();
  const username = process.env.GREYTHR_API_USERNAME;
  const password = process.env.GREYTHR_API_PASSWORD;

  if (!username || !password) {
    throw new Error('GreytHR API credentials missing. Please set GREYTHR_API_USERNAME and GREYTHR_API_PASSWORD in backend/.env');
  }

  const authUrl = `https://${domain}/uas/v1/oauth2/client-token`;
  const basicAuthHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

  try {
    console.log(`🔐 Fetching greytHR access token from https://${domain}...`);
    const response = await axios.post(
      authUrl,
      {},
      {
        headers: {
          'Authorization': basicAuthHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const data = response.data || {};
    // Extract access_token with fallbacks
    const token = data.access_token || data.accessToken || data.token;

    if (!token) {
      throw new Error(`Invalid token response from greytHR: ${JSON.stringify(data)}`);
    }

    // Determine expiration in seconds (default 3600 seconds / 1 hour if not specified)
    const expiresIn = Number(data.expires_in || data.expiresIn) || 3600;
    tokenCache = {
      token: token,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    console.log('✅ GreytHR access token obtained successfully.');
    return tokenCache.token;
  } catch (error) {
    clearTokenCache();
    const status = error.response?.status;
    const errorData = error.response?.data || error.message;
    console.error('❌ Failed to obtain greytHR access token:', status, errorData);
    throw new Error(`GreytHR Authentication Failed (${status || 'Network Error'}): ${JSON.stringify(errorData)}`);
  }
}

/**
 * Step 2: Generic Request Helper
 * Sends HTTP requests to greytHR with ACCESS-TOKEN and x-greythr-domain headers.
 * Handles automatic 401 retry by refreshing the token once.
 */
export async function request(endpointOrUrl, options = {}) {
  const domain = getGreytHRDomain();
  
  // Build full URL if relative path provided (GreytHR REST API is hosted on api.greythr.com)
  let fullUrl = endpointOrUrl;
  if (!/^https?:\/\//i.test(endpointOrUrl)) {
    const cleanPath = endpointOrUrl.startsWith('/') ? endpointOrUrl : `/${endpointOrUrl}`;
    fullUrl = `https://api.greythr.com${cleanPath}`;
  }

  const token = await getAccessToken({ forceRefresh: options._isRetry });

  const headers = {
    'ACCESS-TOKEN': token,
    'x-greythr-domain': domain,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  const method = (options.method || 'GET').toUpperCase();

  try {
    const response = await axios({
      url: fullUrl,
      method: method,
      headers: headers,
      data: options.body || options.data,
      params: options.params,
      timeout: options.timeout || 20000,
    });

    return response.data;
  } catch (error) {
    const status = error.response?.status;

    // Handle expired token (401 Unauthorized) retry once
    if (status === 401 && !options._isRetry) {
      console.warn('⚠️ GreytHR returned 401 Unauthorized. Retrying request with refreshed token...');
      clearTokenCache();
      return request(endpointOrUrl, { ...options, _isRetry: true });
    }

    const errorPayload = error.response?.data || { message: error.message || 'Network error' };
    console.error(`❌ GreytHR API Request Error [${method} ${fullUrl}] Status: ${status || 'N/A'}`, errorPayload);
    
    const err = new Error(`GreytHR API Error (${status || 'Network Error'}): ${errorPayload.message || JSON.stringify(errorPayload)}`);
    err.status = status;
    err.details = errorPayload;
    throw err;
  }
}

/**
 * Example Data Endpoint Helper: Get Employee Categories
 * GET https://api.greythr.com/employee/v2/employees/categories?descRequired=true
 */
export async function getEmployeeCategories(params = {}) {
  const descRequired = params.descRequired !== undefined ? params.descRequired : true;
  const endpoint = `/employee/v2/employees/categories?descRequired=${Boolean(descRequired)}`;
  return request(endpoint, { method: 'GET' });
}

/**
 * GreytHR Data Endpoint Helper: Get Employees List / Details
 * GET https://${GREYTHR_DOMAIN}/employee/v2/employees
 */
export async function getEmployees(params = {}) {
  let endpoint = '/employee/v2/employees';
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  if (params.status) queryParams.append('status', params.status);

  const queryString = queryParams.toString();
  if (queryString) {
    endpoint += `?${queryString}`;
  }

  try {
    return await request(endpoint, { method: 'GET' });
  } catch (err) {
    // If /employee/v2/employees gives 404, fallback to /employee/v2/employees/details
    if (err.status === 404) {
      console.warn('⚠️ /employee/v2/employees returned 404. Retrying with /employee/v2/employees/details...');
      return await request(`/employee/v2/employees/details${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
    }
    throw err;
  }
}

/**
 * Step 3 Usage Example
 * Fetches employee categories and logs the result to console.
 */
export async function logEmployeeCategoriesExample() {
  console.log('\n========================================');
  console.log('🚀 Running GreytHR API Integration Example');
  console.log('========================================');
  try {
    const categories = await getEmployeeCategories({ descRequired: true });
    console.log('✅ Successfully fetched Employee Categories from greytHR:');
    console.log(JSON.stringify(categories, null, 2));
    console.log('========================================\n');
    return categories;
  } catch (error) {
    console.error('❌ GreytHR Usage Example Failed:', error.message);
    console.log('========================================\n');
    throw error;
  }
}

import Employee from '../model/Employee.js';
import User from '../model/User.js';
import Branch from '../model/Branch.js';

/**
 * Sync all GreytHR employees into MongoDB (Employee & User collections)
 */
export async function syncGreytHREmployeesToDB() {
  try {
    console.log('🔄 Starting greytHR Employee Sync to MongoDB...');
    
    // 1. Fetch raw employees from greytHR
    const empRes = await request('/employee/v2/employees?page=0&size=2000');
    const rawList = empRes?.data || (Array.isArray(empRes) ? empRes : []);

    if (!rawList || rawList.length === 0) {
      console.warn('⚠️ No employees returned from greytHR.');
      return { success: false, message: 'No employees found in greytHR' };
    }

    // 2. Fetch category metadata
    const categoriesMap = new Map();
    try {
      const catRes = await request('/employee/v2/employees/categories?descRequired=true&page=0&size=2000');
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
      console.warn('⚠️ Could not fetch GreytHR categories during sync:', catErr.message);
    }

    // 3. Fetch all branches to map locCode & storeId
    const branches = await Branch.find({}).lean();
    const branchMap = new Map();
    branches.forEach(b => {
      if (b.workingBranch) branchMap.set(b.workingBranch.toLowerCase(), b);
      if (b.locCode) branchMap.set(String(b.locCode), b);
    });

    let syncedCount = 0;

    for (const item of rawList) {
      const empID = item.employeeNo || item.empNo || item.employeeId || item.empID || item.id || '';
      if (!empID) continue;

      const firstName = item.firstName || item.first_name || '';
      const lastName = item.lastName || item.last_name || '';
      const fullName = item.employeeName || item.name || item.fullName || `${firstName} ${lastName}`.trim() || 'Employee';

      const cat = categoriesMap.get(item.employeeId) || {};
      const designation = cat['Designation']
        || (typeof item.designation === 'object' ? item.designation?.name : item.designation)
        || item.role || item.jobTitle || 'Employee';

      const branchNameRaw = cat['Store Name']
        || cat['Department']
        || cat['Location']
        || (typeof item.location === 'object' ? item.location?.name : item.location)
        || (typeof item.department === 'object' ? item.department?.name : item.department)
        || item.workingBranch || item.branch || item.store || 'Main Store';

      const email = item.email || item.personalEmail || item.officialEmail || `${empID.toLowerCase()}@brynex.local`;
      const phoneNumber = item.mobile || item.phone || item.phoneNumber || '';
      const status = item.leftorg ? 'Inactive' : 'Active';

      // Match branch
      let matchedBranch = branchMap.get(branchNameRaw.toLowerCase());
      if (!matchedBranch) {
        matchedBranch = branches.find(b =>
          b.workingBranch && (
            b.workingBranch.toLowerCase().includes(branchNameRaw.toLowerCase()) ||
            branchNameRaw.toLowerCase().includes(b.workingBranch.toLowerCase())
          )
        );
      }
      const locCode = matchedBranch ? matchedBranch.locCode : '700';
      const workingBranch = matchedBranch ? matchedBranch.workingBranch : branchNameRaw;
      const storeId = matchedBranch ? matchedBranch._id : null;

      try {
        const safeFirstName = (firstName || fullName.split(' ')[0] || 'Employee').trim();
        const safeLastName = (lastName || fullName.split(' ').slice(1).join(' ') || '.').trim();
        const safePhone = (phoneNumber || '0000000000').trim();
        const safeDept = (branchNameRaw || 'Sales').trim();
        const safeDesignation = (designation || 'Staff').trim();

        // Upsert into Employee collection
        let existingEmp = await Employee.findOne({ $or: [{ employeeId: empID }, { email: email }] });
        if (existingEmp) {
          existingEmp.employeeId = empID;
          existingEmp.firstName = safeFirstName;
          existingEmp.lastName = safeLastName;
          if (email && (!existingEmp.email || existingEmp.email === email)) existingEmp.email = email;
          existingEmp.phoneNumber = safePhone;
          existingEmp.department = safeDept;
          existingEmp.designation = safeDesignation;
          existingEmp.status = status;
          existingEmp.workingBranch = workingBranch;
          if (storeId) existingEmp.storeId = storeId;
          existingEmp.updatedAt = new Date();
          await existingEmp.save();
        } else {
          await Employee.create({
            employeeId: empID,
            firstName: safeFirstName,
            lastName: safeLastName,
            email: email,
            phoneNumber: safePhone,
            department: safeDept,
            designation: safeDesignation,
            status: status,
            workingBranch: workingBranch,
            storeId: storeId,
            dateOfJoining: item.doj ? new Date(item.doj) : new Date(),
            salary: 0,
            address: { country: 'India' }
          });
        }

        // Upsert into User collection safely handling email unique constraint
        let existingUser = await User.findOne({ $or: [{ empID: empID }, { email: email }] });
        if (existingUser) {
          existingUser.empID = empID;
          existingUser.username = fullName;
          if (email && existingUser.email !== email) {
            const emailOwner = await User.findOne({ email: email, _id: { $ne: existingUser._id } });
            if (!emailOwner) existingUser.email = email;
          }
          if (phoneNumber) existingUser.phoneNumber = phoneNumber;
          existingUser.designation = designation;
          existingUser.workingBranch = workingBranch;
          existingUser.locCode = locCode;
          existingUser.source = 'external-sync';
          existingUser.updatedAt = new Date();
          await existingUser.save();
        } else {
          // Check if email belongs to another user
          let finalEmail = email;
          const emailOwner = await User.findOne({ email: email });
          if (emailOwner) {
            finalEmail = `${empID.toLowerCase()}@brynex.local`;
          }
          await User.create({
            empID: empID,
            username: fullName,
            email: finalEmail,
            phoneNumber: phoneNumber || '',
            designation: designation,
            workingBranch: workingBranch,
            locCode: locCode,
            source: 'external-sync',
            registrationStatus: 'approved'
          });
        }

        syncedCount++;
      } catch (itemErr) {
        console.warn(`⚠️ Warning syncing employee ${empID} (${fullName}):`, itemErr.message);
      }
    }

    console.log(`✅ Successfully synced ${syncedCount} employees from greytHR to MongoDB.`);
    return { success: true, count: syncedCount };
  } catch (err) {
    console.error('❌ Error during greytHR employee sync:', err.message);
    return { success: false, error: err.message };
  }
}

export default {
  getGreytHRDomain,
  clearTokenCache,
  getAccessToken,
  request,
  getEmployeeCategories,
  getEmployees,
  logEmployeeCategoriesExample,
  syncGreytHREmployeesToDB,
};

