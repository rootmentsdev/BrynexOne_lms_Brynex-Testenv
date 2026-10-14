// Triggering nodemon restart for MONGODB_URI update
import dotenv from 'dotenv';
dotenv.config();

import cron from "node-cron";
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import axios from 'axios';                           // ✅ needed
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import connectMongoDB from './db/database.js';
import ModuleRouter from './routes/ModuleRoute.js';
import userrouter from './routes/AssessmentAndModule.js';
import UserCreating from './routes/UserRoute.js';
import UserRouters from './routes/UserConRoute.js';
import AdminData from './routes/AdminRoute.js'
import FutterAssessment from './routes/FutterAssessment.js'
import Whatsapprouter from './routes/WhatsappRouteZoho.js'
import EmployeeRouter from './routes/EmployeeRoute.js'
import TrainingRouter from './routes/TrainingRoute.js'
import WalkinRouter from './routes/WalkinRoute.js'
import TaskRouter from './routes/TaskRoute.js'
import AutoTaskRouter from './routes/AutoTaskRoute.js'
import CategoryRouter from './routes/CategoryRoute.js'
import DapprAttributionRouter from './routes/DapprAttributionRoute.js'
import { seedDefaultCategories } from './model/Category.js'
import PerformanceRouter from './routes/PerformanceRoute.js'

import { AlertNotification } from './lib/CornJob.js';
import { startEmployeeAutoSync } from './lib/EmployeeAutoSync.js';
import { startWalkinStatusSyncCron } from './cron/walkinStatusSyncCron.js';
import { startAutoTaskCron } from './cron/autoTaskCron.js';
import { refreshExternalEmployees } from './lib/employeeCache.js';
import setupSwagger from './swagger.js';
import { MiddilWare } from './lib/middilWare.js';
import Admin from './model/Admin.js';
import User from './model/User.js';
import bcrypt from 'bcrypt';

const app = express();
setupSwagger(app);
const port = process.env.PORT || 7000;

// ✅ Hardcode the upstream token EXACTLY as provided
const ROOTMENTS_API_TOKEN = 'RootX-production-9d17d9485eb772e79df8564004d4a4d4';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Enhanced CORS configuration for better preflight handling
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
          'https://brynexone.brynex.com',
        'https://lms-tau-six-52.vercel.app',
        'http://localhost:3000'
       
      ];
      
      // Allow Vercel domains
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('🚫 CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma'
    ],
    exposedHeaders: ['Content-Length', 'X-Requested-With'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 200
  })
);

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [System]
 *     summary: Health check endpoint
 *     description: Returns server status. Used to keep Render instance awake and monitor service health.
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 database:
 *                   type: string
 *                   enum: [connected, disconnected]
 */
app.get('/api/health', (req, res) => {
  const mongooseConnected = mongoose.connection.readyState === 1;
  
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongooseConnected ? 'connected' : 'disconnected',
    port: port,
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get('/', (req, res) => {
  console.log('🌐 Root endpoint accessed from:', req.headers.origin);
  res.send('✅ API is working');
});



// Handle preflight OPTIONS requests for all routes
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

/* =================================================
   ✅ INLINE PROXY: POST /api/employee_range
   -> Forwards to https://rootments.in/api/employee_range
   -> Adds Authorization: Bearer <your token>
   Body: { startEmpId, endEmpId }
================================================== */
/**
 * @swagger
 * /api/employee_range:
 *   post:
 *     tags: [Employee]
 *     summary: Proxy employee range to external API
 *     description: Intercepts and proxies requests to `https://rootments.in/api/employee_range` using the hardcoded authentication token.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startEmpId:
 *                 type: string
 *                 default: EMP1
 *               endEmpId:
 *                 type: string
 *                 default: EMP9999
 *     responses:
 *       200:
 *         description: Successfully fetched employees from external API.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Proxy failed or external server error.
 */
app.post('/api/employee_range', async (req, res) => {
  try {
    const { startEmpId = 'EMP1', endEmpId = 'EMP9999' } = req.body || {};
    console.log('↗️  /api/employee_range', { startEmpId, endEmpId });

    const upstream = 'https://rootments.in/api/employee_range';
    const { data } = await axios.post(
      upstream,
      { startEmpId, endEmpId },
      {
        timeout: 30000, // Increased timeout to 30 seconds
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${ROOTMENTS_API_TOKEN}`,
        },
      }
    );

    console.log('↘️  /employee_range upstream items:',
      Array.isArray(data?.data) ? data.data.length : 0
    );
    return res.status(200).json(data); // { status: "success", data: [...] }
  } catch (err) {
    const status = err?.response?.status || 500;
    const payload = err?.response?.data || { message: err.message || 'Proxy failed' };
    console.error('❌ /api/employee_range error:', status, payload);
    return res.status(status).json(payload);
  }
});

// New filtered employee_range endpoint with authentication and branch filtering
/**
 * @swagger
 * /api/employee_range/filtered:
 *   post:
 *     tags: [Employee]
 *     summary: Fetch employee range filtered by admin store bounds
 *     description: Fetches employees from the external range API and filters them to only include those matching stores/branches accessible to the logged-in admin. Excludes employees assigned to 'No Store'.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startEmpId:
 *                 type: string
 *                 default: EMP1
 *               endEmpId:
 *                 type: string
 *                 default: EMP9999
 *     responses:
 *       200:
 *         description: Successfully fetched filtered employees list.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Proxy failed or internal server error.
 */
app.post('/api/employee_range/filtered', MiddilWare, async (req, res) => {
  try {
    const { startEmpId = 'EMP1', endEmpId = 'EMP9999' } = req.body || {};
    console.log('↗️  /api/employee_range/filtered', { startEmpId, endEmpId });

    // Get admin's allowed branches
    const AdminId = req.admin.userId;
    const AdminBranch = await Admin.findById(AdminId).populate('branches');
    const allowedLocCodes = AdminBranch.branches.map(branch => branch.locCode);
    const isGlobalAdmin = ['super_admin', 'admin'].includes(AdminBranch.role) || allowedLocCodes.length === 0;

    console.log(`👤 Admin: ${AdminBranch.name} (Role: ${AdminBranch.role})`);
    console.log(`🔐 Allowed location codes: ${isGlobalAdmin ? 'ALL (Super Admin)' : allowedLocCodes.join(', ')}`);

    const upstream = 'https://rootments.in/api/employee_range';
    const { data } = await axios.post(
      upstream,
      { startEmpId, endEmpId },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${ROOTMENTS_API_TOKEN}`,
        },
      }
    );

    let filteredData = data?.data || [];
    
    // Always exclude "No Store" employees for all admins
    filteredData = filteredData.filter(emp => {
        const storeName = emp?.store_name?.toUpperCase();
        return !(storeName === 'NO STORE' || !storeName || storeName === '');
    });
    
    // Filter by allowed branches if not global admin
    if (!isGlobalAdmin && allowedLocCodes.length > 0) {
      filteredData = filteredData.filter(emp => {
        const storeName = emp?.store_name?.toUpperCase();
        
        // Store name to locCode mapping
        const storeNameToLocCode = {
          'SUITOR GUY TRIVANDRUM': '5',
          'SUITOR GUY KOCHI': '2',
          'SUITOR GUY EDAPPALLY': '3',
          'SUITOR GUY CALICUT': '4',
          'SUITOR GUY KANNUR': '5',
          'SUITOR GUY THALASSERY': '6',
          'SUITOR GUY KOTTAYAM': '9',
          'SUITOR GUY PERUMBAVOOR': '10',
          'SUITOR GUY THRISSUR': '11',
          'SUITOR GUY CHAVAKKAD': '12',
          'SUITOR GUY EDAPPAL': '15',
          'SUITOR GUY VATAKARA': '14',
          'SUITOR GUY PERINTHALMANNA': '16',
          'SUITOR GUY MANJERY': '18',
          'SUITOR GUY KOTTAKKAL': '17',
          'SUITOR GUY KOZHIKODE': '13',
          'SUITOR GUY CALICUT': '13',
          'SUITOR GUY KANNUR': '21',
          'SUITOR GUY KALPETTA': '20',
          'ZORUCCI EDAPPAL': '6',
          'ZORUCCI KOTTAKKAL': '8',
          'ZORUCCI PERINTHALMANNA': '7',
          'ZORUCCI EDAPPALLY': '1',
          'SUITOR GUY TRIVANDRUM': '5',
          'SUITOR GUY PALAKKAD': '19',
          'SUITOR GUY EDAPPALLY': '3',
          'SUITOR GUY KOTTAYAM': '9',
          'SUITOR GUY PERUMBAVOOR': '10',
          'SUITOR GUY THRISSUR': '11',
          'SUITOR GUY CHAVAKKAD': '12',
          'SUITOR GUY EDAPPAL': '15',
          'SUITOR GUY VATAKARA': '14',
          'SUITOR GUY PERINTHALMANNA': '16',
          'SUITOR GUY MANJERI': '18',
          'SUITOR GUY KOTTAKKAL': '17',
          'SUITOR GUY CALICUT': '13',
          'SUITOR GUY KALPETTA': '20',
          'SUITOR GUY KANNUR': '21'
        };
        
        const mappedLocCode = storeNameToLocCode[storeName];
        
        if (mappedLocCode && allowedLocCodes.includes(mappedLocCode)) {
          return true;
        }
        
        const empLocCode = emp?.store_code || emp?.locCode;
        return allowedLocCodes.includes(empLocCode);
      });
    }

    console.log('↘️  /employee_range/filtered items:',
      `${filteredData.length} (from ${data?.data?.length || 0} total)`
    );
    
    return res.status(200).json({
      status: "success",
      data: filteredData
    });
  } catch (err) {
    const status = err?.response?.status || 500;
    const payload = err?.response?.data || { message: err.message || 'Proxy failed' };
    console.error('❌ /api/employee_range/filtered error:', status, payload);
    return res.status(status).json(payload);
  }
});

/* =================================================
   ✅ SINGLE EMPLOYEE DETAIL PROXY
   POST /api/employee_detail
   Body: { empId: "EMP123" }
   -> Uses upstream range API with start=end=empId
================================================== */
/**
 * @swagger
 * /api/employee_detail:
 *   post:
 *     tags: [Employee]
 *     summary: Fetch single employee detail proxy
 *     description: Proxies to the external employee range API with the start and end employee ID set to the requested `empId`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               empId:
 *                 type: string
 *                 description: Employee ID to fetch details for
 *             required:
 *               - empId
 *     responses:
 *       200:
 *         description: Successfully fetched employee details.
 *       400:
 *         description: empId is required.
 *       500:
 *         description: Proxy failed.
 */
app.post('/api/employee_detail', async (req, res) => {
  try {
    const { empId } = req.body || {};
    if (!empId) {
      return res.status(400).json({ status: 'fail', message: 'empId is required' });
    }
    console.log('↗️  /api/employee_detail', { empId });

    const upstream = 'https://rootments.in/api/employee_range';
    const { data } = await axios.post(
      upstream,
      { startEmpId: empId, endEmpId: empId },
      {
        timeout: 30000, // Increased timeout to 30 seconds
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${ROOTMENTS_API_TOKEN}`,
        },
      }
    );

    // Expect { status: 'success', data: [singleOrEmpty] }
    console.log('↘️  /employee_detail upstream items:',
      Array.isArray(data?.data) ? data.data.length : 0
    );
    return res.status(200).json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const payload = err?.response?.data || { message: err.message || 'Proxy failed' };
    console.error('❌ /api/employee_detail error:', status, payload);
    return res.status(status).json(payload);
  }
});

/* =================================================
   ✅ EMPLOYEE VERIFICATION PROXY
   POST /api/verify_employee
   Body: { employeeId: "emp257", password: "userpassword" }
   -> Forwards to https://rootments.in/api/verify_employee
   -> Adds Authorization: Bearer <your token>
================================================== */
/**
 * @swagger
 * /api/verify_employee:
 *   post:
 *     tags: [Employee]
 *     summary: Proxy credential verification to external API
 *     description: Proxies login credentials (employeeId, password) to `https://rootments.in/api/verify_employee` to authenticate the user externally.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeId:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - employeeId
 *               - password
 *     responses:
 *       200:
 *         description: Credentials verified successfully by external server.
 *       400:
 *         description: employeeId and password are required.
 *       500:
 *         description: Proxy failed.
 */
app.post('/api/verify_employee', async (req, res) => {
  try {
    console.log('🌐 /api/verify_employee accessed from:', req.headers.origin);
    console.log('📝 Request headers:', req.headers);
    
    const { employeeId, password } = req.body || {};
    if (!employeeId || !password) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'employeeId and password are required' 
      });
    }
    console.log('↗️  /api/verify_employee', { employeeId });

    const upstream = 'https://rootments.in/api/verify_employee';
    const { data } = await axios.post(
      upstream,
      { employeeId, password },
      {
        timeout: 30000, // Increased timeout to 30 seconds
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${ROOTMENTS_API_TOKEN}`,
        },
      }
    );

    console.log('↘️  /verify_employee upstream response:', data?.status || 'unknown');
    return res.status(200).json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const payload = err?.response?.data || { message: err.message || 'Proxy failed' };
    console.error('❌ /api/verify_employee error:', status, payload);
    return res.status(status).json(payload);
  }
});

/* =================================================
   ✅ VIDEO WATCH PROGRESS TRACKING
   POST /api/video_progress
   Body: { userId, trainingId, moduleId, videoId, watchTime, totalDuration, watchPercentage }
   -> Updates video watch progress in TrainingProgress collection
================================================== */
/**
 * @swagger
 * /api/video_progress:
 *   post:
 *     tags: [Training]
 *     summary: Track video watch progress
 *     description: Updates the watch progress for a training video in the user's TrainingProgress collection. Automatically marks the video as completed if watch progress is 90% or higher.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ObjectId
 *               trainingId:
 *                 type: string
 *                 description: Training ObjectId
 *               moduleId:
 *                 type: string
 *                 description: Module ObjectId
 *               videoId:
 *                 type: string
 *                 description: Video ObjectId
 *               watchTime:
 *                 type: number
 *                 description: Time watched in seconds
 *               totalDuration:
 *                 type: number
 *                 description: Total video duration in seconds
 *               watchPercentage:
 *                 type: number
 *                 description: Watch percentage (optional, calculated if not sent)
 *             required:
 *               - userId
 *               - trainingId
 *               - moduleId
 *               - videoId
 *     responses:
 *       200:
 *         description: Video progress updated successfully.
 *       400:
 *         description: Missing required fields in body.
 *       404:
 *         description: Training progress, module, or video not found.
 *       500:
 *         description: Internal server error.
 */
app.post('/api/video_progress', async (req, res) => {
  try {
    const { userId, trainingId, moduleId, videoId, watchTime, totalDuration, watchPercentage } = req.body || {};
    
    if (!userId || !trainingId || !moduleId || !videoId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId, trainingId, moduleId, and videoId are required' 
      });
    }

    console.log('↗️  /api/video_progress', { userId, trainingId, moduleId, videoId, watchTime, watchPercentage });

    // Import TrainingProgress model
    const { default: TrainingProgress } = await import('./model/Trainingprocessschema.js');

    // Find the training progress
    const trainingProgress = await TrainingProgress.findOne({ 
      userId, 
      trainingId 
    });

    if (!trainingProgress) {
      return res.status(404).json({ 
        success: false,
        message: "Training progress not found for this user and training" 
      });
    }

    // Find the module in the training progress
    const module = trainingProgress.modules.find(mod => 
      mod.moduleId.toString() === moduleId
    );

    if (!module) {
      return res.status(404).json({ 
        success: false,
        message: "Module not found in this training progress" 
      });
    }

    // Find the video in the module
    const video = module.videos.find(v => 
      v.videoId.toString() === videoId
    );

    if (!video) {
      return res.status(404).json({ 
        success: false,
        message: "Video not found in this module" 
      });
    }

    // Update video progress
    video.watchTime = Math.max(video.watchTime || 0, watchTime || 0); // Keep the highest watch time
    video.totalDuration = totalDuration || video.totalDuration || 0;
    video.watchPercentage = watchPercentage || (totalDuration > 0 ? (video.watchTime / totalDuration) * 100 : 0);
    video.lastWatchedAt = new Date();

    // Auto-mark as completed if 90% watched
    if (video.watchPercentage >= 90 && !video.pass) {
      video.pass = true;
      console.log('✅ Video auto-marked as completed (90% watched)');
    }

    // Save updated training progress
    await trainingProgress.save();

    console.log('↘️  /video_progress updated successfully');
    return res.status(200).json({
      success: true,
      message: 'Video progress updated successfully',
      data: {
        watchTime: video.watchTime,
        totalDuration: video.totalDuration,
        watchPercentage: video.watchPercentage,
        completed: video.pass
      }
    });

  } catch (err) {
    console.error('❌ /api/video_progress error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to update video progress',
      error: err.message 
    });
  }
});

// === your existing routes (unchanged) ===
app.use('/api', ModuleRouter)
app.use('/api/user', userrouter)
app.use('/api/usercreate', UserCreating)
app.use('/api/auth', UserRouters)
app.use('/api/admin', AdminData)
app.use('/api/user/assessment', FutterAssessment)
app.use('/zoho', Whatsapprouter)
app.use('/api/employee', EmployeeRouter)
app.use('/api/training', TrainingRouter)
app.use('/api/walkin', WalkinRouter)
app.use('/api/task', TaskRouter)
app.use('/api/auto-task', AutoTaskRouter)
app.use('/api/task-category', CategoryRouter)

import CustomizationAttributionRouter from './routes/CustomizationAttributionRoute.js'
import StoreTargetRouter from './routes/StoreTargetRoute.js'
import GreythrRouter from './routes/greythrRoute.js'
import { syncGreytHREmployeesToDB } from './services/greythrService.js'
app.use('/api/store-targets', StoreTargetRouter)
app.use('/api/dappr-attributions', DapprAttributionRouter)
app.use('/api/customization-attributions', CustomizationAttributionRouter)
app.use('/api/performance', PerformanceRouter)
app.use('/api/greythr', GreythrRouter)


/* =================================================
   ✅ PROXY: GET /api/brynex/shoe-sales/summary
   -> Forwards to https://backend.brynex.com/api/external/shoe-sales/summary
   -> Returns pre-aggregated shoe/shirt data per store — no bookings/returns needed
================================================== */
app.get('/api/brynex/shoe-sales/summary', async (req, res) => {
  try {
    const { fromDate, toDate, locCode } = req.query;
    let url = `https://backend.brynex.com/api/external/shoe-sales/summary?fromDate=${fromDate}&toDate=${toDate}`;
    if (locCode) url += `&locCode=${locCode}`;
    const { data } = await axios.get(url, { timeout: 15000 });
    return res.status(200).json(data);
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return res.status(200).json({ stores: [], grandTotal: {} });
    }
    const status = err?.response?.status || 500;
    const payload = err?.response?.data || { message: err.message || 'Brynex summary proxy failed' };
    console.error('❌ /api/brynex/shoe-sales/summary error:', status, payload);
    return res.status(status).json(payload);
  }
});

/* =================================================
   ✅ PROXY: GET /api/brynex/shoe-sales/:type  (kept for backwards compat — bookings/returns)
================================================== */
app.get('/api/brynex/shoe-sales/:type', async (req, res) => {
  try {
    const { type } = req.params; // "bookings", "returns", or "by-salesperson"
    const { fromDate, toDate, locCode } = req.query;

    if (!['bookings', 'returns', 'by-salesperson'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Use bookings, returns, or by-salesperson.' });
    }

    let url = `https://backend.brynex.com/api/external/shoe-sales/${type}?fromDate=${fromDate}&toDate=${toDate}`;
    if (locCode && locCode !== 'undefined') {
      url += `&locCode=${locCode}`;
    }

    const { data } = await axios.get(url, { timeout: 15000 });
    return res.status(200).json(data);
  } catch (err) {
    const { type } = req.params;
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      if (type === 'by-salesperson') {
        return res.status(200).json({ salespersons: [], grandTotal: {} });
      }
      return res.status(200).json([]); // timeout → return empty, don't crash the page
    }
    const status = err?.response?.status || 500;
    const payload = err?.response?.data || { message: err.message || 'Brynex proxy failed' };
    console.error(`❌ /api/brynex/shoe-sales/${req.params.type} error:`, status, payload);
    return res.status(status).json(payload);
  }
});

// User Login Tracking Routes
import UserLoginRouter from './routes/UserLoginRoute.js';
app.use('/api/user-login', UserLoginRouter)

// LMS Website Login Tracking Routes
import LMSLoginRouter from './routes/LMSLoginRoute.js';
app.use('/api/lms-login', LMSLoginRouter)

// Google Form Management Routes
import GoogleFormRouter from './routes/GoogleFormRoute.js';
app.use('/api/google-form', GoogleFormRouter)

// Google Review Routes
import GoogleReviewRouter from './routes/GoogleReviewRoute.js';
app.use('/api/google-reviews', GoogleReviewRouter)

console.log(new Date());

cron.schedule("30 18 * * *", async () => {
  console.log("Running AlertNotification at 18:30 IST...");
  try {
    await AlertNotification();
    console.log("AlertNotification executed successfully.");
  } catch (error) {
    console.error("Error executing AlertNotification:", error);
  }
}, { timezone: "Asia/Kolkata" });

async function seedTestEmployee() {
  try {
    const { default: Branch } = await import('./model/Branch.js');

    // Find the Z-Edapally1 branch or fall back
    const targetBranch = await Branch.findOne({ workingBranch: { $regex: '^z-edapally1$', $options: 'i' } })
      || await Branch.findOne({ locCode: '144' })
      || await Branch.findOne()
      || { workingBranch: 'Office', locCode: '102' };

    const locCodeVal = targetBranch.locCode || '102';
    const workingBranchVal = targetBranch.workingBranch || 'Office';
    const branchIdVal = targetBranch._id;

    // Check if test employee user already exists in User collection
    let existingUser = await User.findOne({ empID: 'emp8899' });
    let existingAdmin = await Admin.findOne({ EmpId: 'Emp8899' });

    const hashedPassword = await bcrypt.hash('password123', 10);
    const sharedId = existingUser?._id || existingAdmin?._id || new mongoose.Types.ObjectId();

    if (!existingUser) {
      console.log('🌱 Seeding test employee Emp8899...');
      const newUser = new User({
        _id: sharedId,
        username: 'Test Employee 8899',
        email: 'emp8899@company.com',
        password: hashedPassword,
        empID: 'emp8899',
        locCode: locCodeVal,
        designation: 'Employee',
        workingBranch: workingBranchVal,
        source: 'app',
      });
      await newUser.save();
      console.log('✅ Test employee Emp8899 seeded in User collection.');
    } else {
      // Update existing user branch/locCode
      existingUser.locCode = locCodeVal;
      existingUser.workingBranch = workingBranchVal;
      await existingUser.save();
      console.log('🔄 Updated existing test employee branch to ' + workingBranchVal + ' in User collection.');
    }

    if (!existingAdmin) {
      const newAdmin = new Admin({
        _id: sharedId,
        name: 'Test Employee 8899',
        email: 'emp8899@company.com',
        EmpId: 'Emp8899',
        role: 'employee',
        subRole: 'NR',
        password: hashedPassword,
        isActive: true,
        branches: branchIdVal ? [branchIdVal] : [],
      });
      await newAdmin.save();
      console.log('✅ Test employee Emp8899 seeded in Admin collection.');
    } else {
      // Update existing admin branches
      existingAdmin.branches = branchIdVal ? [branchIdVal] : [];
      await existingAdmin.save();
      console.log('🔄 Updated existing test employee branch to ' + workingBranchVal + ' in Admin collection.');
    }
  } catch (error) {
    console.error('❌ Error seeding test employee:', error);
  }
}

connectMongoDB().then(async () => {
  // Seed categories
  await seedDefaultCategories();

  // Seed test employee Emp8899
  await seedTestEmployee();

  app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${port}`);
    
    // Keep the legacy employee sync opt-in so old external API data does not
    // overwrite app-created users or appear on the Employee page by default.
    if (process.env.ENABLE_EMPLOYEE_AUTO_SYNC === 'true') {
      startEmployeeAutoSync();
    } else {
      console.log('Employee auto-sync disabled. Set ENABLE_EMPLOYEE_AUTO_SYNC=true to enable it.');
    }

    // Warm external employee cache in background (non-blocking)
    refreshExternalEmployees().catch(() => {});

    // Start walk-in status auto-sync cron (every 15 minutes)
    startWalkinStatusSyncCron();
    
    // Start auto task generation cron (every hour at :05, staggered)
    startAutoTaskCron();
    
    // Start existing notification cron job
    AlertNotification();

    // Initial greytHR employee sync on startup & every 30 minutes
    syncGreytHREmployeesToDB().catch(err => console.error("Initial greytHR sync failed:", err.message));
    setInterval(() => {
      syncGreytHREmployeesToDB().catch(err => console.error("Periodic greytHR sync failed:", err.message));
    }, 30 * 60 * 1000);
    
    // 📊 Job Health Monitor - runs every hour at :30 to check all jobs
    cron.schedule('30 * * * *', () => {
      const timestamp = new Date().toISOString();
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 CRON JOB HEALTH CHECK - ${timestamp}`);
      console.log(`${'='.repeat(60)}`);
      console.log('✅ All cron jobs are running');
      console.log('  • Walkin Status Sync: Every 15 minutes');
      console.log('  • Auto Task Generation: Every hour at :05 (staggered)');
      console.log('  • greytHR Employee Sync: Every 30 minutes');
      console.log('  • Walkin Loss Expiry: Daily at 11:00 PM IST');
      console.log('  • AlertNotification: Daily at 6:30 PM IST');
      console.log(`${'='.repeat(60)}\n`);
    });
    
    console.log('\n🕐 Cron Schedule:');
    console.log('  • Every 15 min - Walkin Status Sync');
    console.log('  • Every 30 min - greytHR Employee Sync');
    console.log('  • :05 min - Auto Task Generation (staggered)');
    console.log('  • :30 min - Health Check');
    console.log('  • 11:00 PM - Walkin Loss Expiry\n');
  });
}).catch(err => {
  console.error('❌ MongoDB connection failed:', err);





  
});

