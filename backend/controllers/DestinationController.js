import Admin from "../model/Admin.js";
import Permission from "../model/AdminPermission.js";
import Branch from "../model/Branch.js";
import Designation from "../model/designation.js"; // Import the destination model
import User from "../model/User.js";
import Notification from "../model/Notification.js";
import TrainingProgress from "../model/Trainingprocessschema.js";
import mongoose from "mongoose";
import bcrypt from 'bcrypt'
import axios from 'axios'; // Added axios import

const normalizeBranchKey = (value) => {
    if (Array.isArray(value)) {
        return value.map((v) => String(v).trim()).filter(Boolean).join(',');
    }
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

export const createDesignation = async (req, res) => {
    try {
        // Validate input
        const { designation } = req.body;

        if (!designation || designation.trim() === "") {
            return res.status(400).json({ message: "Designation is required" });
        }


        // Check for duplicates explicitly
        const existingDesignation = await Designation.findOne({ designation });
        if (existingDesignation) {
            return res.status(400).json({ message: "Designation already exists" });
        }

        // Create and save the new designation
        const newDesignation = new Designation({ designation });
        const savedDesignation = await newDesignation.save();
        return res.status(201).json({
            message: "Designation created successfully",
            data: savedDesignation,
        });
    } catch (error) {
        console.error("Error creating designation:", error);
        return res.status(500).json({
            message: "Error creating designation",
            error: error.message,
        });
    }
};
export const getAllDesignation = async (req, res) => {
    try {
        // Fetch all destinations from the database
        const designation = await Designation.find();

        // Check if there are any destinations
        if (designation.length === 0) {
            return res.status(404).json({ message: "No destinations found" });
        }

        // Return the list of destinations
        return res.status(200).json({
            message: "Destinations fetched successfully",
            data: designation,
        });
    } catch (error) {
        console.error("Error fetching destinations:", error);
        return res.status(500).json({
            message: "Error fetching destinations",
            error: error.message,
        });
    }
};


//Homebar

export const HomeBar = async (req, res) => {
    try {
        const Admin1 = req.admin.userId;

        const AdminData = await Admin.findById(Admin1);
        if (!AdminData) return res.status(404).json({ message: "Admin not found" });

        // Step 1: Use RBAC to get accessible stores
        const accessibleStoreIds = await getAccessibleStoreIds(Admin1);
        const useAllBranches = isFullAccessAdmin(AdminData.role) || accessibleStoreIds.length === 0;
        const branches = useAllBranches
          ? await Branch.find({})
          : await Branch.find({ _id: { $in: accessibleStoreIds } });
        
        const allowedLocCodes = branches.map(b => b.locCode);
        
        // Step 2: Find all users based on RBAC
        let users = [];
        if (isFullAccessAdmin(AdminData.role)) {
            users = await User.find({});
        } else {
            users = await User.find({ locCode: { $in: allowedLocCodes } });
        }
        
        // Fetch training progress data for all users. This is the source of truth for dashboard completion.
        const userIds = users.map(user => user._id);
        const trainingProgressRecords = await TrainingProgress.find({
            userId: { $in: userIds } 
        });

        // Build lookup maps
        const userMap = new Map();
        for (const user of users) {
            const keys = [
                normalizeBranchKey(user.locCode),
                normalizeBranchKey(user.workingBranch),
            ].filter(Boolean);

            for (const key of keys) {
                if (!userMap.has(key)) userMap.set(key, []);
                userMap.get(key).push(user);
            }
        }
        
        const trainingProgressMap = new Map();
        for (const training of trainingProgressRecords) {
            const key = training.userId.toString();
            if (!trainingProgressMap.has(key)) trainingProgressMap.set(key, []);
            trainingProgressMap.get(key).push(training);
        }

        const allData = branches.map((branch) => {
            const branchUsers = userMap.get(normalizeBranchKey(branch.locCode)) || [];
            
            let trainingCount = 0;
            let trainingCountPending = 0;
            let employeesInTraining = 0;
            let assessmentCount = 0;
            let assessmentCountPending = 0;
            let overdueEmployeesCount = 0;
            const currentDate = new Date();

            branchUsers.forEach((user) => {
                const assignedTrainings = Array.isArray(user.training) ? user.training : [];
                const mandatoryTrainings = trainingProgressMap.get(user._id.toString()) || [];
                const userTrainingCount = assignedTrainings.length + mandatoryTrainings.length;

                trainingCount += userTrainingCount;
                trainingCountPending += assignedTrainings.filter((item) => item.pass !== true).length;
                trainingCountPending += mandatoryTrainings.filter((item) => {
                    const status = String(item.status || '').toLowerCase();
                    return item.pass !== true && status !== 'completed';
                }).length;
                if (userTrainingCount > 0) employeesInTraining++;
                
                // Assessment data
                assessmentCount += user.assignedAssessments.length;
                assessmentCountPending += user.assignedAssessments.filter((item) => item.pass === false).length;

                // Overdue trainings
                const hasOverdueAssigned = assignedTrainings.some(
                    (item) => item.pass === false && item.deadline && new Date(item.deadline) < currentDate
                );
                const hasOverdueMandatory = mandatoryTrainings.some(
                    (item) => item.pass === false && item.deadline && new Date(item.deadline) < currentDate
                );

                if (hasOverdueAssigned || hasOverdueMandatory) {
                    overdueEmployeesCount++;
                }
            });

            return {
                totalTraining: trainingCount,
                totalAssessment: assessmentCount,
                pendingTraining: (trainingCountPending / trainingCount) * 100 || 0,
                completeTraining: ((trainingCount - trainingCountPending) / trainingCount) * 100 || 0,
                pendingAssessment: (assessmentCountPending / assessmentCount) * 100 || 0,
                completeAssessment: ((assessmentCount - assessmentCountPending) / assessmentCount) * 100 || 0,
                pendingAssessmentCount: assessmentCountPending,
                completeAssessmentCount: assessmentCount - assessmentCountPending,
                locCode: branch.locCode,
                branchName: branch.workingBranch,
                totalEmployees: branchUsers.length,
                employeesInTraining,
                overdueEmployeesCount,
            };
        });

        // Calculate weighted average training progress across all branches
        // Exclude legacy/internal branches (same list as frontend dashboardUtils.js)
        const hiddenBranches = new Set([
            "office", "production", "warehouse",
            "suitor guy kochi", "grooms kochi", "sg kochi",
            "suitor guy calicut", "grooms calicut", "sg calicut",
            "dappr squad",
        ]);
        let weightedCompleted = 0;
        let weightedTotal = 0;
        allData.forEach((branch) => {
            const name = String(branch.branchName || "").toLowerCase().trim();
            if (hiddenBranches.has(name)) return; // skip hidden branches
            const total = branch.totalTraining || 0;
            const completePct = branch.completeTraining || 0;
            if (total > 0) {
                weightedCompleted += (completePct / 100) * total;
                weightedTotal += total;
            }
        });
        const avgTrainingProgress = weightedTotal > 0
            ? Math.round((weightedCompleted / weightedTotal) * 100)
            : 0;

        const payload = {
            message: "Data fetched for progress",
            avgTrainingProgress,
            totalEmployees: users.length,
            data: allData,
        };

        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        return res.status(200).json(payload);
    } catch (error) {
        console.error("Error fetching data:", error);
        return res.status(500).json({
            message: "Error fetching data",
            error: error.message,
        });
    }
};

export const HomeProgressSummary = async (req, res) => {
    try {
        const Admin1 = req.admin.userId;

        const AdminData = await Admin.findById(Admin1);
        if (!AdminData) return res.status(404).json({ message: "Admin not found" });

        const accessibleStoreIds = await getAccessibleStoreIds(Admin1);
        const useAllBranches = isFullAccessAdmin(AdminData.role) || accessibleStoreIds.length === 0;
        const branches = useAllBranches
          ? await Branch.find({})
          : await Branch.find({ _id: { $in: accessibleStoreIds } });
        const allowedLocCodes = branches.map((b) => b.locCode);

        const users = isFullAccessAdmin(AdminData.role)
          ? await User.find({})
          : await User.find({ locCode: { $in: allowedLocCodes } });

        const userIds = users.map((user) => user._id);
        const trainingProgressRecords = await TrainingProgress.find({ userId: { $in: userIds } });

        let totalEmployees = 0;
        let employeesInTraining = 0;
        let completedAssessments = 0;
        let overdueAssessments = 0;

        for (const user of users) {
            const assignedTrainings = Array.isArray(user.training) ? user.training : [];
            const mandatoryTrainings = trainingProgressRecords.filter((p) => p.userId.toString() === user._id.toString());
            if (assignedTrainings.length + mandatoryTrainings.length > 0) employeesInTraining++;
            totalEmployees++;
            completedAssessments += Array.isArray(user.assignedAssessments)
              ? user.assignedAssessments.filter((a) => a.pass === true).length
              : 0;
            overdueAssessments += Array.isArray(user.assignedAssessments)
              ? user.assignedAssessments.filter((a) => a.pass === false).length
              : 0;
        }

        const payload = {
            message: "Summary fetched for progress",
            data: {
                totalBranches: branches.length,
                totalEmployees,
                employeesInTraining,
                completedAssessments,
                overdueAssessments,
            },
        };

        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        return res.status(200).json(payload);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching summary", error: error.message });
    }
};


// Adjust the import path as needed

export const getTopUsers = async (req, res) => {
    try {
        const AdminId = req.admin.userId
        const AdminBranch = await Admin.findById(AdminId).populate('branches')
        // Fetch users with populated training, assessments, and modules

        console.log(AdminBranch);
        const allowedLocCodes = AdminBranch.branches.map(branch => branch.locCode);

        const users = await User.find({ locCode: { $in: allowedLocCodes } })

            .populate({
                path: 'training.trainingId',
            })
            .populate({
                path: 'assignedAssessments.assessmentId',
            })
            .populate({
                path: 'assignedModules.moduleId',
            });

        // Fetch mandatory training data for all users
        const userIds = users.map(user => user._id);
        const mandatoryTrainings = await TrainingProgress.find({ 
            userId: { $in: userIds } 
        }).populate('trainingId');
        
        // Create a map of userId to mandatory trainings for quick lookup
        const mandatoryTrainingMap = new Map();
        for (const training of mandatoryTrainings) {
            if (!mandatoryTrainingMap.has(training.userId.toString())) {
                mandatoryTrainingMap.set(training.userId.toString(), []);
            }
            mandatoryTrainingMap.get(training.userId.toString()).push(training);
        }

        // Fetch external employee data
        let externalEmployees = [];
        try {
            const response = await axios.post(`${process.env.BASE_URL || 'http://localhost:7000'}/api/employee_range`, {
                startEmpId: 'EMP1',
                endEmpId: 'EMP9999'
            }, { timeout: 15000 });
            
            externalEmployees = response.data?.data || [];
            console.log(`Fetched ${externalEmployees.length} external employees for getTopUsers`);
            
            // Always exclude "No Store" employees for all admins
            externalEmployees = externalEmployees.filter(emp => {
                const storeName = emp?.store_name?.toUpperCase();
                return !(storeName === 'NO STORE' || !storeName || storeName === '');
            });
            
            // Filter external employees by allowed location codes
            const filteredExternalEmployees = externalEmployees.filter(emp => {
                const storeName = emp?.store_name?.toUpperCase();
                
                // Exclude employees with "No Store" - they should not be visible to anyone
                if (storeName === 'NO STORE' || !storeName || storeName === '') {
                    return false;
                }
                
                const empLocCode = emp?.store_code || emp?.locCode;
                return allowedLocCodes.includes(empLocCode);
            });
            
            console.log(`Filtered external employees for allowed locations: ${filteredExternalEmployees.length}`);
        } catch (error) {
            console.error('Error fetching external employee data for getTopUsers:', error.message);
        }

        // Branch name mapping - map user workingBranch to actual branch names
        const branchNameMapping = {
            // Suitor Guy branches → display names
            "SUITOR GUY KOTTAYAM": "Suitor Guy Kottayam",
            "SUITOR GUY THRISSUR": "Suitor Guy Thrissur", 
            "SUITOR GUY EDAPPALLY": "Suitor Guy Edappally",
            "SUITOR GUY PERUMBAVOOR": "Suitor Guy Perumbavoor",
            "SUITOR GUY CHAVAKKAD": "Suitor Guy Chavakkad",
            "SUITOR GUY PALAKKAD": "Suitor Guy Palakkad",
            "SUITOR GUY KOTTAKKAL": "Suitor Guy Kottakkal",
            "SUITOR GUY EDAPPAL": "Suitor Guy Edappal",
            "SUITOR GUY MANJERI": "Suitor Guy Manjery",
            "SUITOR GUY VATAKARA": "Suitor Guy Vatakara",
            "SUITOR GUY KALPETTA": "Suitor Guy Kalpetta",
            "SUITOR GUY CALICUT": "Suitor Guy Kozhikode",
            "SUITOR GUY KANNUR": "Suitor Guy Kannur",
            "SUITOR GUY PERINTHALMANNA": "Suitor Guy Perinthalmanna",
            "SUITOR GUY TRIVANDRUM": "Suitor Guy Trivandrum",
            
            // ZORUCCI branches
            "ZORUCCI EDAPPALLY": "Zorucci Edappally",
            "ZORUCCI EDAPPAL": "Zorucci Edappal", 
            "ZORUCCI PERINTHALMANNA": "Zorucci Perinthalmanna",
            "ZORUCCI KOTTAKKAL": "Zorucci Kottakkal",
        };

        // Calculate progress for each user
        const scores = users.map((user) => {
            // Assigned training progress calculation
            const assignedTrainings = user.training || [];
            const completedAssignedTrainings = assignedTrainings.filter(t => t.pass).length;
            const totalAssignedTrainings = assignedTrainings.length;
            
            // Mandatory training progress calculation
            const userMandatoryTrainings = mandatoryTrainingMap.get(user._id.toString()) || [];
            const completedMandatoryTrainings = userMandatoryTrainings.filter(t => t.pass).length;
            const totalMandatoryTrainings = userMandatoryTrainings.length;
            
            // Combined training progress
            const completedTrainings = completedAssignedTrainings + completedMandatoryTrainings;
            const totalTrainings = totalAssignedTrainings + totalMandatoryTrainings;
            const trainingProgress = totalTrainings > 0 ? (completedTrainings / totalTrainings) * 100 : 0;

            // Assessment progress calculation (using `pass` and `complete`)
            const completedAssessments = user.assignedAssessments.filter(a => a.pass).length;
            const totalAssessments = user.assignedAssessments.length;
            const assessmentCompletion = user.assignedAssessments.reduce((sum, a) => sum + (a.complete || 0), 0);
            const assessmentProgress = totalAssessments > 0 ? (assessmentCompletion / totalAssessments) : 0;

            // Module progress calculation (optional if you want to include modules)
            const completedModules = user.assignedModules.filter(m => m.pass).length;
            const totalModules = user.assignedModules.length;
            const moduleProgress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

            // Total score based on training, assessments, and modules
            const totalScore = completedTrainings + completedAssessments + completedModules;

            // Map workingBranch to correct branch name
            const mappedBranchName = branchNameMapping[user.workingBranch] || user.workingBranch;
            
            return {
                username: user.username,
                email: user.email,
                branch: mappedBranchName,
                role: user.designation,
                completedTrainings,
                totalTrainings,
                trainingProgress,
                completedAssignedTrainings,
                totalAssignedTrainings,
                completedMandatoryTrainings,
                totalMandatoryTrainings,
                completedAssessments,
                totalAssessments,
                assessmentProgress,
                completedModules,
                totalModules,
                moduleProgress,
                totalScore,
                isExternal: false, // Mark as local user
            };
        });

        // Add external employees with 0 progress (since they don't have training/assessment data yet)
        const externalEmployeeScores = externalEmployees
            .filter(emp => {
                const empLocCode = emp?.store_code || emp?.locCode;
                return allowedLocCodes.includes(empLocCode);
            })
            .map(emp => {
                // Map external employee store_name to correct branch name
                const mappedBranchName = branchNameMapping[emp?.store_name] || emp?.store_name || 'Unknown Branch';
                
                return {
                    username: emp?.name || 'Unknown',
                    email: emp?.email || '',
                    branch: mappedBranchName,
                    role: emp?.role_name || 'Unknown Role',
                    completedTrainings: 0,
                    totalTrainings: 0,
                    trainingProgress: 0,
                    completedAssessments: 0,
                    totalAssessments: 0,
                    assessmentProgress: 0,
                    completedModules: 0,
                    totalModules: 0,
                    moduleProgress: 0,
                    totalScore: 0,
                    isExternal: true, // Mark as external user
                };
            });

        // Combine local and external users
        const allScores = [...scores, ...externalEmployeeScores];

        // Sort users by total score
        const sortedScores = allScores.sort((a, b) => b.totalScore - a.totalScore);

        // Get top 3 users
        const topUsers = sortedScores.slice(0, 3);

        // Get last 3 users (sorted by ascending score)
        const lastUsers = sortedScores.slice(-3);

        // Use the same calculation logic as HomeBar for consistency
        const branches = await Branch.find({ _id: { $in: AdminBranch.branches } });
        
        // Create a map of locCode to users for quick lookup
        const userMap = new Map();
        for (const user of users) {
            if (!userMap.has(user.locCode)) {
                userMap.set(user.locCode, []);
            }
            userMap.get(user.locCode).push(user);
        }

        // Create a map of locCode to external employees
        const externalEmployeeMap = new Map();
        for (const emp of externalEmployees) {
            const empLocCode = emp?.store_code || emp?.locCode;
            if (allowedLocCodes.includes(empLocCode)) {
                if (!externalEmployeeMap.has(empLocCode)) {
                    externalEmployeeMap.set(empLocCode, []);
                }
                externalEmployeeMap.get(empLocCode).push(emp);
            }
        }

        // Calculate branch scores using the exact same logic as HomeBar
        const branchScores = {};
        
        for (const branch of branches) {
            const branchUsers = userMap.get(normalizeBranchKey(branch.locCode)) || userMap.get(normalizeBranchKey(branch.workingBranch)) || [];
            const branchExternalUsers = externalEmployeeMap.get(branch.locCode) || [];
            
            let trainingCount = 0;
            let trainingCountPending = 0;
            let assessmentCount = 0;
            let assessmentCountPending = 0;

            // Calculate counts for the branch (local users only for now) - EXACT same as HomeBar
            branchUsers.forEach((user) => {
                // Assigned training data
                const assignedTrainings = user.training || [];
                trainingCount += assignedTrainings.length;
                trainingCountPending += assignedTrainings.filter((item) => item.pass === false).length;
                
                // Mandatory training data - use the same map as HomeBar
                const userMandatoryTrainings = mandatoryTrainingMap.get(user._id.toString()) || [];
                trainingCount += userMandatoryTrainings.length;
                trainingCountPending += userMandatoryTrainings.filter((item) => item.pass === false).length;
                
                // Assessment data
                assessmentCount += user.assignedAssessments.length;
                assessmentCountPending += user.assignedAssessments.filter((item) => item.pass === false).length;
            });

            // Calculate percentages (EXACT same as HomeBar)
            const averageTrainingProgress = trainingCount > 0 ? ((trainingCount - trainingCountPending) / trainingCount) * 100 : 0;
            const averageAssessmentProgress = assessmentCount > 0 ? ((assessmentCount - assessmentCountPending) / assessmentCount) * 100 : 0;
            
            // Map branch name using the same mapping
            const mappedBranchName = branchNameMapping[branch.workingBranch] || branch.workingBranch;
            
            branchScores[mappedBranchName] = {
                branch: mappedBranchName,
                totalScore: (trainingCount - trainingCountPending) + (assessmentCount - assessmentCountPending),
                userCount: branchUsers.length + branchExternalUsers.length,
                externalUserCount: branchExternalUsers.length,
                localUserCount: branchUsers.length,
                averageTrainingProgress: averageTrainingProgress,
                averageAssessmentProgress: averageAssessmentProgress,
                averageModuleProgress: 0, // Not used in HomeBar
            };
        }

        // Convert branchScores to array and sort by training completion percentage
        const sortedBranches = Object.values(branchScores)
            .sort((a, b) => b.averageTrainingProgress - a.averageTrainingProgress);

        // Get top 3 branches
        const suitorBranches = sortedBranches.filter((branch) =>
            String(branch?.branch || "").toLowerCase().includes("suitor guy")
        );

        const topBranches = suitorBranches.slice(0, 3);

        // Get last 3 branches (sorted by ascending training completion percentage)
        const lastBranches = suitorBranches.slice(-3);

        console.log('All branches:', sortedBranches);
        console.log('Top branches:', topBranches);
        console.log('Last branches:', lastBranches);

        // Return response with top and last users and branches
        return res.status(200).json({
            data: {
                topUsers,
                lastUsers,
                topBranches,
                lastBranches,
                summary: {
                    totalLocalUsers: users.length,
                    totalExternalUsers: externalEmployees.filter(emp => {
                        const empLocCode = emp?.store_code || emp?.locCode;
                        return allowedLocCodes.includes(empLocCode);
                    }).length,
                    totalUsers: allScores.length,
                    allowedLocCodes: allowedLocCodes
                }
            },
        });

    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ error: 'Error fetching users' });
    }
};



; // Adjust path to the branch model


export const CreatingAdminUsers = async (req, res) => {
    try {
        const name = req.body.name || req.body.userName || req.body.username;
        const email = req.body.email;
        const role = req.body.role || req.body.userRole;
        const branches = req.body.branches || req.body.Branch;
        const password = req.body.password;
        const phoneNumber = req.body.phoneNumber;
        let { subRole } = req.body;

        let EmpId = req.body.EmpId || req.body.empID || req.body.userId;
        if (!EmpId || String(EmpId).trim() === "") {
            const adminCount = await Admin.countDocuments();
            const userCount = await User.countDocuments();
            let unique = false;
            let currentCount = adminCount + userCount;
            while (!unique) {
                EmpId = `EMP${String(currentCount + 1).padStart(3, '0')}`;
                const existingAdmin = await Admin.findOne({ EmpId });
                const existingUser = await User.findOne({ empID: EmpId });
                if (!existingAdmin && !existingUser) {
                    unique = true;
                } else {
                    currentCount++;
                }
            }
        }

        console.log(name, email, EmpId, role, branches, subRole, phoneNumber);
        if (role !== 'super_admin' && role !== 'admin') {
            subRole = "NR";
        }

        // Validate required fields
        if (!name || !email || !role) {
            return res.status(400).json({
                message: "All required fields (name, email, role) must be provided.",
            });
        }

        // Check if role is valid
        const validRoles = ['super_admin', 'admin', 'hr_admin', 'cluster_admin', 'store_admin', 'warehouse_admin', 'telecaller', 'employee'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                message: "Invalid role provided. Valid roles are: super_admin, admin, hr_admin, cluster_admin, store_admin, warehouse_admin, telecaller, employee.",
            });
        }

        // Cluster admin check: can only assign store_admin or employee
        if (req.admin?.role === 'cluster_admin' && role !== 'store_admin' && role !== 'employee') {
            return res.status(403).json({
                message: "Cluster admins are only allowed to assign store_admin or employee roles.",
            });
        }

        // Support direct employee user creation
        if (role === 'employee') {
            let workingBranch = "No Store";
            let locCode = [];
            if (branches && branches.length > 0) {
                const branchDocs = await Branch.find({ _id: { $in: branches } });
                if (branchDocs && branchDocs.length > 0) {
                    workingBranch = branchDocs.map(b => b.workingBranch).join(", ");
                    locCode = branchDocs.map(b => b.locCode);
                }
            }

            const escapedEmp = EmpId ? EmpId.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
            const escapedEmail = email ? email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
            const existingUser = await User.findOne({
                $or: [
                    { empID: { $regex: `^${escapedEmp}$`, $options: 'i' } },
                    { email: { $regex: `^${escapedEmail}$`, $options: 'i' } }
                ]
            });
            if (existingUser) {
                // Update existing employee
                existingUser.username = name;
                existingUser.email = email;
                existingUser.phoneNumber = phoneNumber || existingUser.phoneNumber;
                if (password && password.trim() !== "") {
                    existingUser.password = await bcrypt.hash(String(password).trim(), 10);
                }
                existingUser.workingBranch = workingBranch;
                existingUser.locCode = locCode;
                const savedUser = await existingUser.save();
                return res.status(200).json({
                    message: "Employee user updated successfully.",
                    data: {
                        id: savedUser._id,
                        name: savedUser.username,
                        email: savedUser.email,
                        EmpId: savedUser.empID,
                        role: "employee",
                    }
                });
            }

            const isPublicSignup = !req.admin;
            const newUser = new User({
                username: name,
                email,
                phoneNumber: phoneNumber || "",
                password: password ? await bcrypt.hash(String(password).trim(), 10) : "",
                empID: EmpId,
                designation: "Employee",
                workingBranch,
                locCode,
                source: isPublicSignup ? "app" : "admin",
                registrationStatus: isPublicSignup ? "pending" : "approved"
            });
            const savedUser = await newUser.save();

            if (isPublicSignup) {
                try {
                    const notify = new Notification({
                        title: 'New Web Employee Registration Request',
                        body: `${name} (${EmpId}) has requested employee registration via webpage. Please accept or decline.`,
                        Role: ['super_admin', 'admin', 'hr_admin'],
                        category: 'Registration'
                    });
                    await notify.save();
                } catch (e) {}

                return res.status(201).json({
                    message: "Registration request submitted successfully! Your account is pending admin approval.",
                    data: {
                        id: savedUser._id,
                        name: savedUser.username,
                        email: savedUser.email,
                        EmpId: savedUser.empID,
                        role: "employee",
                        registrationStatus: savedUser.registrationStatus
                    }
                });
            }

            return res.status(201).json({
                message: "Employee user created successfully.",
                data: {
                    id: savedUser._id,
                    name: savedUser.username,
                    email: savedUser.email,
                    EmpId: savedUser.empID,
                    role: "employee",
                    registrationStatus: savedUser.registrationStatus
                }
            });
        }

        // Fetch permissions for the role from the Permission collection
        let rolePermissions = await Permission.findOne({ role });
        if (!rolePermissions) {
            console.log(`Permissions not found for role ${role}. Auto-creating default permissions...`);
            const isSuper = (role === 'super_admin' || role === 'admin' || role === 'hr_admin');
            rolePermissions = new Permission({
                role: role,
                permissions: {
                    canCreateTraining: isSuper,
                    canCreateAssessment: isSuper,
                    canReassignTraining: isSuper,
                    canReassignAssessment: isSuper,
                    canDeleteTraining: isSuper,
                    canDeleteAssessment: isSuper
                }
            });
            await rolePermissions.save();
        }
        console.log('Role permissions:', rolePermissions._id);

        // Determine branches/clusters for the admin
        let finalBranches = [];
        let finalClusters = [];
        if (role === 'super_admin' || role === 'admin' || role === 'hr_admin') {
            const allBranches = await Branch.find();
            finalBranches = allBranches.map((branch) => branch._id);
        } else if (role === 'warehouse_admin') {
            const warehouseBranch = await Branch.findOne({
                $or: [
                    { workingBranch: { $regex: /^warehouse$/i } },
                    { locCode: '103' }
                ]
            });
            if (warehouseBranch) {
                finalBranches = [warehouseBranch._id];
            } else if (branches && branches.length > 0) {
                finalBranches = branches;
            }
        } else {
            // For store_admin, cluster_admin and telecaller
            if (role === 'store_admin' || role === 'cluster_admin' || role === 'telecaller') {
                if (!branches || branches.length === 0) {
                    return res.status(400).json({
                        message: `Branches must be provided for the role: ${role}.`,
                    });
                }
                finalBranches = branches;
            }
        }

        let hashedPassword = "";
        if (password && password.trim() !== "") {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        // Check if Admin already exists by EmpId or email
        const escapedAdminEmp = EmpId ? EmpId.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
        const escapedAdminEmail = email ? email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
        let existingAdmin = await Admin.findOne({
            $or: [
                { EmpId: { $regex: `^${escapedAdminEmp}$`, $options: 'i' } },
                { email: { $regex: `^${escapedAdminEmail}$`, $options: 'i' } }
            ]
        });
        if (existingAdmin) {
            // Update existing Admin
            existingAdmin.name = name;
            existingAdmin.email = email;
            existingAdmin.phoneNumber = phoneNumber || existingAdmin.phoneNumber;
            if (hashedPassword) {
                existingAdmin.password = hashedPassword;
            }
            existingAdmin.role = role;
            existingAdmin.subRole = subRole;
            existingAdmin.branches = finalBranches;
            existingAdmin.assignedClusters = finalClusters;
            existingAdmin.permissions = rolePermissions._id;
            
            const savedAdmin = await existingAdmin.save();

            // Also check and update the corresponding User record if it exists
            const userRecord = await User.findOne({ $or: [{ empID: EmpId }, { email }] });
            if (userRecord) {
                userRecord.username = name;
                userRecord.email = email;
                userRecord.phoneNumber = phoneNumber || userRecord.phoneNumber;
                if (password && password.trim() !== "") {
                    userRecord.password = await bcrypt.hash(String(password).trim(), 10);
                }
                await userRecord.save();
            }

            return res.status(200).json({
                message: "Admin user updated successfully.",
                data: {
                    id: savedAdmin._id,
                    name: savedAdmin.name,
                    email: savedAdmin.email,
                    EmpId: savedAdmin.EmpId,
                    role: savedAdmin.role,
                    branches: savedAdmin.branches,
                }
            });
        }

        // Create the admin user with the fetched permissions
        const isPublicAdminSignup = !req.admin;
        const newAdmin = new Admin({
            name,
            email,
            phoneNumber: phoneNumber || "",
            EmpId,
            subRole,
            password: hashedPassword,
            role,
            permissions: rolePermissions._id,
            branches: finalBranches,
            assignedClusters: finalClusters,
            isActive: !isPublicAdminSignup,
            registrationStatus: isPublicAdminSignup ? "pending" : "approved"
        });

        // Save the admin user
        const savedAdmin = await newAdmin.save();

        if (isPublicAdminSignup) {
            try {
                const notify = new Notification({
                    title: 'New Web Admin Registration Request',
                    body: `${name} (${EmpId}) has requested registration for role "${role}". Please accept or decline.`,
                    Role: ['super_admin', 'admin', 'hr_admin'],
                    category: 'Registration'
                });
                await notify.save();
            } catch (e) {}
        }

        // Also check and update the corresponding User record if it exists
        const userRecord = await User.findOne({ $or: [{ empID: EmpId }, { email }] });
        if (userRecord) {
            userRecord.username = name;
            userRecord.email = email;
            userRecord.phoneNumber = phoneNumber || userRecord.phoneNumber;
            if (password && password.trim() !== "") {
                userRecord.password = await bcrypt.hash(String(password).trim(), 10);
            }
            await userRecord.save();
        }

        // Respond with success
        res.status(201).json({
            message: "Admin user created successfully.",
            data: {
                id: savedAdmin._id,
                name: savedAdmin.name,
                email: savedAdmin.email,
                EmpId: savedAdmin.EmpId,
                role: savedAdmin.role,
                permissions: savedAdmin.permissions,
                branches: savedAdmin.branches,
            },
        });
    } catch (error) {
        console.error('Error creating admin user:', error);
        res.status(500).json({
            message: "An error occurred while creating the admin user.",
            error: error.message,
        });
    }
};


const upsertPermissions = async (role, permissions) => {
    try {
        // Check if the role already exists
        const existingRole = await Permission.findOne({ role });

        if (existingRole) {
            // If the role exists, update the permissions
            existingRole.permissions = { ...existingRole.permissions, ...permissions };
            await existingRole.save();
            console.log(`${role} permissions updated successfully.`);
        } else {
            // If the role doesn't exist, create a new permission document for the role
            const newPermission = new Permission({
                role,
                permissions,
            });
            await newPermission.save();
            console.log(`${role} permissions added successfully.`);
        }
    } catch (error) {
        console.error('Error adding or updating permissions:', error);
    }
};
import { getAccessibleStoreIds, getAccessibleEmployeeIds, isFullAccessAdmin } from '../lib/permissions.js';
import Employee from '../model/Employee.js';

export const getAccessibleStores = async (req, res) => {
    try {
        if (!req.admin) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        const storeIds = await getAccessibleStoreIds(req.admin.userId);
        const stores = await Branch.find({ _id: { $in: storeIds }, isActive: true });
        
        res.status(200).json({ stores });
    } catch (error) {
        console.error("Error fetching accessible stores:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getAccessibleEmployees = async (req, res) => {
    try {
        if (!req.admin) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        // Support any of storeId, store, or locCode query parameters from clients (like Flutter)
        const storeParam = req.query.storeId || req.query.store || req.query.locCode;
        let resolvedStore = null;
        
        if (storeParam) {
            if (mongoose.Types.ObjectId.isValid(storeParam)) {
                resolvedStore = await Branch.findById(storeParam);
            }
            if (!resolvedStore) {
                resolvedStore = await Branch.findOne({
                    $or: [
                        { locCode: storeParam },
                        { workingBranch: storeParam },
                        { branchName: storeParam }
                    ]
                });
            }
        }

        let employeeIds = await getAccessibleEmployeeIds(req.admin.userId);
        
        let query = { _id: { $in: employeeIds }, status: 'Active' };
        
        if (resolvedStore) {
            const accessibleStoreIds = await getAccessibleStoreIds(req.admin.userId);
            if (!accessibleStoreIds.includes(resolvedStore._id.toString())) {
                return res.status(403).json({ message: "Access denied to this store's employees" });
            }
            query.storeId = resolvedStore._id;
        }

        let employees = await Employee.find(query).lean();
        employees = employees.map(emp => ({
            ...emp,
            username: emp.username || `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
        }));

        // Fallback: If no employees are found in employeedata, query User collection and map them
        if (employees.length === 0) {
            const accessibleStoreIds = await getAccessibleStoreIds(req.admin.userId);
            const branches = await Branch.find({ _id: { $in: accessibleStoreIds } });
            
            let userQuery = {};
            if (resolvedStore) {
                // Ensure the resolved store is within accessible stores
                const isAccessible = branches.some(b => b._id.toString() === resolvedStore._id.toString());
                if (isAccessible) {
                    userQuery.locCode = resolvedStore.locCode;
                } else {
                    userQuery.locCode = "NON_EXISTENT";
                }
            } else {
                const locCodes = branches.map(b => b.locCode);
                userQuery.locCode = { $in: locCodes };
            }
            
            const users = await User.find(userQuery).lean();
            employees = users.map(u => ({
                _id: u._id,
                employeeId: u.empID,
                username: u.username,
                firstName: u.username.split(' ')[0] || '',
                lastName: u.username.split(' ').slice(1).join(' ') || '',
                email: u.email,
                phoneNumber: u.phoneNumber,
                designation: u.designation,
                workingBranch: u.workingBranch,
                locCode: u.locCode,
                status: 'Active'
            }));
        }

        // Determine allowed admin roles to return as employees based on logged-in admin's role
        let allowedAdminRoles = ['store_admin', 'cluster_admin', 'telecaller'];
        let excludedAdminRoles = ['super_admin', 'admin', 'hr_admin'];
        
        const excludeOffice = req.query.excludeOffice === 'true';

        const isOfficeStaff = (emp) => {
            if (!emp) return false;
            const branchStr = (emp.workingBranch || emp.store || '').toLowerCase();
            const deptStr = (emp.department || '').toLowerCase();
            const desigStr = (emp.designation || emp.role || '').toLowerCase();
            const locStr = String(emp.locCode || '').trim();

            const nonSalesKeywords = ['office', 'production', 'warehouse', 'dappr squad', 'no store', 'telecaller'];
            if (['101', '102', '103', '555'].includes(locStr)) return true;
            if (nonSalesKeywords.some(k => branchStr.includes(k) || deptStr.includes(k) || desigStr.includes(k))) return true;

            return false;
        };

        if (excludeOffice) {
            excludedAdminRoles.push('telecaller');
            allowedAdminRoles = allowedAdminRoles.filter(role => role !== 'telecaller');
        }

        if (req.admin.role === 'store_admin' || req.admin.role === 'telecaller') {
            allowedAdminRoles = ['store_admin', 'telecaller'];
            excludedAdminRoles = ['super_admin', 'admin', 'hr_admin', 'cluster_admin'];
        }

        // Fetch store/cluster admins for the selected/accessible stores to include them as employees
        let storeAdminQuery = { isActive: { $ne: false } };
        if (resolvedStore) {
            storeAdminQuery.branches = resolvedStore._id;
        } else if (['super_admin', 'admin', 'hr_admin'].includes(req.admin.role)) {
            // High-level roles access all system admins/employees when no store parameter is specified
        } else {
            const accessibleStoreIds = await getAccessibleStoreIds(req.admin.userId);
            storeAdminQuery.branches = { $in: accessibleStoreIds };
        }
        
        const storeAdmins = await Admin.find(storeAdminQuery).lean();
        const mappedStoreAdmins = storeAdmins.map(sa => {
            let branchName = "";
            if (resolvedStore) {
                branchName = resolvedStore.workingBranch;
            }
            return {
                _id: sa._id,
                employeeId: sa.EmpId || sa.employeeId || '',
                username: sa.name,
                firstName: sa.name.split(' ')[0] || '',
                lastName: sa.name.split(' ').slice(1).join(' ') || '',
                email: sa.email,
                phoneNumber: sa.phoneNumber,
                designation: sa.role === 'cluster_admin' ? 'Cluster Admin' : 'Store Admin',
                workingBranch: branchName || (sa.branches && sa.branches.length > 0 ? '' : 'No Store'),
                status: 'Active'
            };
        });

        // Merge mapped store admins with employees
        const combinedEmployees = [...employees, ...mappedStoreAdmins];

        // Deduplicate the combined list by id, email, or employeeId
        const seenIds = new Set();
        const seenEmails = new Set();
        const seenEmpIds = new Set();
        
        const uniqueEmployees = [];
        for (const emp of combinedEmployees) {
            const empIdStr = emp._id.toString();
            const emailKey = emp.email?.toLowerCase().trim();
            const empCodeKey = (emp.employeeId || emp.empID || '').toString().toLowerCase().trim();
            
            if (seenIds.has(empIdStr)) continue;
            if (emailKey && seenEmails.has(emailKey)) continue;
            if (empCodeKey && seenEmpIds.has(empCodeKey)) continue;
            
            seenIds.add(empIdStr);
            if (emailKey) seenEmails.add(emailKey);
            if (empCodeKey) seenEmpIds.add(empCodeKey);
            
            uniqueEmployees.push(emp);
        }

        // --- FILTER OUT NON-STORE/CLUSTER ADMINS (from showing up in the Employee dropdown) ---
        // Exclude anyone who is a non-store/cluster admin (e.g. super_admin, admin, hr_admin)
        const adminsList = await Admin.find({ role: { $in: excludedAdminRoles } }).select('email EmpId employeeId').lean();
        const adminEmails = new Set(adminsList.map(a => a.email?.toLowerCase().trim()).filter(Boolean));
        const adminEmpIds = new Set([
            ...adminsList.map(a => a.EmpId?.toLowerCase().trim()).filter(Boolean),
            ...adminsList.map(a => (a.employeeId || '')?.toLowerCase().trim()).filter(Boolean)
        ]);

        const filteredEmployees = uniqueEmployees.filter(emp => {
            const empEmail = emp.email?.toLowerCase().trim();
            const empId = (emp.employeeId || emp.empID)?.toLowerCase().trim();
            
            // Exclude if the email or employee ID matches any non-store admin record
            const isMatch = adminEmails.has(empEmail) || adminEmpIds.has(empId);
            if (isMatch) return false;

            if (excludeOffice && isOfficeStaff(emp)) {
                return false;
            }

            return true;
        });

        // Natural numeric sort by Employee ID (Emp1, Emp2, Emp3 ... Emp10 ... Emp140)
        filteredEmployees.sort((a, b) => {
            const idA = a.employeeId || a.empID || a.EmpId || '';
            const idB = b.employeeId || b.empID || b.EmpId || '';
            const numA = parseInt(String(idA).replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(String(idB).replace(/\D/g, ''), 10) || 0;
            if (numA !== numB) return numA - numB;
            return String(idA).localeCompare(String(idB));
        });

        res.status(200).json({ employees: filteredEmployees });
    } catch (error) {
        console.error("Error fetching accessible employees:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Express route or function
export const handlePermissions = async (req, res) => {
    try {
        const { permissionsArray } = req.body; // Make sure to send the array in the body of the request
        if (!permissionsArray || !Array.isArray(permissionsArray)) {
            return res.status(400).json({ message: 'Permissions array is required' });
        }

        for (const item of permissionsArray) {
            await upsertPermissions(item.role, item.permissions);
        }

        return res.status(200).json({ message: 'Permissions processed successfully' });
    } catch (error) {
        console.error('Error processing permissions:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getAdminUsers = async (req, res) => {
    try {
        const loggedInAdminId = req.admin.userId;
        const loggedInAdmin = await Admin.findById(loggedInAdminId).populate('branches').lean();

        let admins = await Admin.find({}).populate('branches').populate('assignedClusters').lean();
        let users = await User.find({}).lean();
        const allBranches = await Branch.find({}).lean();

        if (loggedInAdmin && loggedInAdmin.role === 'cluster_admin') {
            const clusterBranchIds = (loggedInAdmin.branches || []).map(b => b._id.toString());
            const clusterLocCodes = (loggedInAdmin.branches || []).map(b => String(b.locCode));

            // Filter admins: only keep store_admins that belong to cluster branches
            admins = admins.filter(a => {
                if (a.role !== 'store_admin') return false;
                const adminBranchIds = (a.branches || []).map(b => (b._id || b).toString());
                return adminBranchIds.some(id => clusterBranchIds.includes(id));
            });

            // Filter users: only keep employees whose locCode matches cluster branch locCodes
            users = users.filter(u => {
                let userLocCodes = [];
                if (Array.isArray(u.locCode)) {
                    userLocCodes = u.locCode.map(String);
                } else if (typeof u.locCode === 'string') {
                    userLocCodes = u.locCode.split(',').map(s => s.trim());
                }
                return userLocCodes.some(code => clusterLocCodes.includes(code));
            });
        }

        const adminEmpIds = new Set(admins.map(a => String(a.EmpId || '').toLowerCase().trim()));
        const adminEmails = new Set(admins.map(a => String(a.email || '').toLowerCase().trim()));

        // Filter out employees who are already registered as administrators
        const ordinaryUsers = users.filter(u => 
            !adminEmpIds.has(String(u.empID || '').toLowerCase().trim()) && 
            !adminEmails.has(String(u.email || '').toLowerCase().trim())
        );

        // Map users to match the admin schema structure
        const mappedUsers = ordinaryUsers.map(u => {
            let userLocCodes = [];
            if (Array.isArray(u.locCode)) {
                userLocCodes = u.locCode.map(String);
            } else if (typeof u.locCode === 'string') {
                userLocCodes = u.locCode.split(',').map(s => s.trim());
            }

            let matchedBranches = [];
            if (u.locCode === 'All' || userLocCodes.includes('All')) {
                matchedBranches = allBranches;
            } else {
                matchedBranches = allBranches.filter(b => 
                    userLocCodes.includes(String(b.locCode))
                );
            }

            return {
                _id: u._id,
                EmpId: u.empID,
                name: u.username,
                email: u.email,
                phoneNumber: u.phoneNumber || "",
                role: "employee",
                subRole: "NR",
                branches: matchedBranches.map(b => ({
                    _id: b._id,
                    workingBranch: b.workingBranch,
                    locCode: b.locCode
                })),
                isEmployee: true
            };
        });

        const combined = [...admins, ...mappedUsers];
        res.status(200).json({ success: true, data: combined });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateAdminUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phoneNumber, role, Branch: branches, password } = req.body;

        // Cluster admin check: can only assign store_admin or employee
        if (req.admin?.role === 'cluster_admin' && role !== 'store_admin' && role !== 'employee') {
            return res.status(403).json({
                success: false,
                message: "Cluster admins are only allowed to assign store_admin or employee roles.",
            });
        }

        const existingAdmin = await Admin.findById(id);
        const isEmployee = await User.findById(id);

        if (!existingAdmin && !isEmployee) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // 1. DEMOTION PATH: Changing role to 'employee'
        if (role === 'employee') {
            const hashedPassword = existingAdmin?.password || isEmployee?.password || "";
            const empId = existingAdmin?.EmpId || isEmployee?.empID || "";

            let workingBranch = "No Store";
            let locCode = [];
            if (branches && branches.length > 0) {
                const branchDocs = await Branch.find({ _id: { $in: branches } });
                if (branchDocs && branchDocs.length > 0) {
                    workingBranch = branchDocs.map(b => b.workingBranch).join(", ");
                    locCode = branchDocs.map(b => b.locCode);
                }
            }

            if (existingAdmin) {
                await Admin.findByIdAndDelete(id);
            }
            if (isEmployee) {
                await User.findByIdAndDelete(id);
            }
            await User.deleteOne({ $or: [{ empID: empId }, { email }], _id: { $ne: id } });

            const userFields = {
                _id: id,
                username: name,
                email,
                phoneNumber: phoneNumber || existingAdmin?.phoneNumber || isEmployee?.phoneNumber || "",
                empID: empId,
                designation: "Employee",
                workingBranch,
                locCode,
                source: "admin"
            };
            if (password && password.trim() !== "") {
                userFields.password = await bcrypt.hash(password.trim(), 10);
            } else {
                userFields.password = hashedPassword;
            }

            const newUser = new User(userFields);
            const savedUser = await newUser.save();
            return res.status(200).json({ success: true, message: "Admin demoted to employee successfully", data: savedUser });
        }

        // 2. PROMOTION PATH: Pure Employee -> Admin (No Admin record exists yet)
        if (!existingAdmin && isEmployee) {
            const hashedPassword = isEmployee.password;
            const empId = isEmployee.empID;

            let finalBranches = [];
            if (role === 'super_admin' || role === 'admin' || role === 'hr_admin') {
                const allBranches = await Branch.find();
                finalBranches = allBranches.map((branch) => branch._id);
            } else {
                finalBranches = branches || [];
            }

            let rolePermissions = await Permission.findOne({ role });
            if (!rolePermissions) {
                const isSuper = (role === 'super_admin' || role === 'admin' || role === 'hr_admin');
                rolePermissions = new Permission({
                    role: role,
                    permissions: {
                        canCreateTraining: isSuper,
                        canCreateAssessment: isSuper,
                        canReassignTraining: isSuper,
                        canReassignAssessment: isSuper,
                        canDeleteTraining: isSuper,
                        canDeleteAssessment: isSuper
                    }
                });
                await rolePermissions.save();
            }

            await User.findByIdAndDelete(id);

            const newAdmin = new Admin({
                _id: isEmployee._id,
                name,
                email,
                phoneNumber: phoneNumber || isEmployee.phoneNumber || "",
                EmpId: empId,
                subRole: "NR",
                password: password && password.trim() !== "" ? await bcrypt.hash(password.trim(), 10) : hashedPassword,
                role,
                permissions: rolePermissions._id,
                branches: finalBranches,
                assignedClusters: [],
            });
            const savedAdmin = await newAdmin.save();

            const userDesignation = role === 'super_admin' ? 'Super Admin' : (role === 'admin' ? 'Admin' : (role === 'hr_admin' ? 'HR Admin' : (role === 'cluster_admin' ? 'Cluster Admin' : (role === 'warehouse_admin' ? 'Warehouse Admin' : (role === 'telecaller' ? 'Telecaller' : 'Store Admin')))));
            let workingBranchStr = "";
            let finalLocCodes = [];
            if (finalBranches.length > 0) {
                const branchDocs = await Branch.find({ _id: { $in: finalBranches } });
                workingBranchStr = branchDocs.map(b => b.workingBranch).join(", ");
                finalLocCodes = branchDocs.map(b => b.locCode);
            }
            const newUserRecord = new User({
                _id: isEmployee._id,
                username: name,
                email,
                phoneNumber: phoneNumber || isEmployee.phoneNumber || "",
                password: password && password.trim() !== "" ? await bcrypt.hash(password.trim(), 10) : hashedPassword,
                empID: empId,
                designation: userDesignation,
                workingBranch: workingBranchStr,
                locCode: finalLocCodes,
                source: "admin"
            });
            await newUserRecord.save();

            return res.status(200).json({ success: true, message: "User promoted to admin successfully", data: savedAdmin });
        }

        // 3. UPDATE EXISTING ADMIN PATH (Admin record exists)
        const updateFields = { name, email, phoneNumber, role };
        if (password && password.trim() !== "") {
            updateFields.password = await bcrypt.hash(password.trim(), 10);
        }

        if (role === 'super_admin' || role === 'admin' || role === 'hr_admin') {
            const allBranches = await Branch.find();
            updateFields.branches = allBranches.map((branch) => branch._id);
            updateFields.assignedClusters = [];
        } else if (role === 'warehouse_admin') {
            const warehouseBranch = await Branch.findOne({
                $or: [
                    { workingBranch: { $regex: /^warehouse$/i } },
                    { locCode: '103' }
                ]
            });
            if (warehouseBranch) {
                updateFields.branches = [warehouseBranch._id];
            } else {
                updateFields.branches = branches || [];
            }
            updateFields.assignedClusters = [];
        } else {
            updateFields.branches = branches || [];
            updateFields.assignedClusters = [];
        }

        let rolePermissions = await Permission.findOne({ role });
        if (!rolePermissions) {
            const isSuper = (role === 'super_admin' || role === 'admin' || role === 'hr_admin');
            rolePermissions = new Permission({
                role: role,
                permissions: {
                    canCreateTraining: isSuper,
                    canCreateAssessment: isSuper,
                    canReassignTraining: isSuper,
                    canReassignAssessment: isSuper,
                    canDeleteTraining: isSuper,
                    canDeleteAssessment: isSuper
                }
            });
            await rolePermissions.save();
        }
        updateFields.permissions = rolePermissions._id;

        const updatedAdmin = await Admin.findByIdAndUpdate(id, updateFields, { new: true }).populate('branches');

        // Also check and update the corresponding User record if it exists
        try {
            const userRecord = await User.findOne({ $or: [{ _id: id }, { empID: updatedAdmin.EmpId }, { email: updatedAdmin.email }] });
            if (userRecord) {
                userRecord.username = name;
                userRecord.email = email;
                userRecord.phoneNumber = phoneNumber || userRecord.phoneNumber;
                if (password && password.trim() !== "") {
                    userRecord.password = await bcrypt.hash(password.trim(), 10);
                }
                const userDesignation = role === 'super_admin' ? 'Super Admin' : (role === 'admin' ? 'Admin' : (role === 'hr_admin' ? 'HR Admin' : (role === 'cluster_admin' ? 'Cluster Admin' : (role === 'warehouse_admin' ? 'Warehouse Admin' : (role === 'telecaller' ? 'Telecaller' : 'Store Admin')))));
                userRecord.designation = userDesignation;

                let workingBranchStr = "";
                let finalLocCodes = [];
                const finalBranches = updateFields.branches || [];
                if (finalBranches.length > 0) {
                    const branchDocs = await Branch.find({ _id: { $in: finalBranches } });
                    workingBranchStr = branchDocs.map(b => b.workingBranch).join(", ");
                    finalLocCodes = branchDocs.map(b => b.locCode);
                }
                userRecord.workingBranch = workingBranchStr;
                userRecord.locCode = finalLocCodes;

                await userRecord.save();
            }

            // Also update Employee model if exists
            const empRecord = await Employee.findOne({ $or: [{ employeeId: updatedAdmin.EmpId }, { email: updatedAdmin.email }] });
            if (empRecord) {
                empRecord.designation = role === 'warehouse_admin' ? 'Warehouse Admin' : empRecord.designation;
                await empRecord.save();
            }
        } catch (syncErr) {
            console.error("Error syncing User record in updateAdminUser:", syncErr);
        }

        res.status(200).json({ success: true, message: "User updated successfully", data: updatedAdmin });
    } catch (error) {
        console.error("Error in updateAdminUser:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteAdminUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.admin?.role === 'cluster_admin') {
            let targetUser = null;
            if (mongoose.isValidObjectId(id)) {
                targetUser = await User.findById(id) || await Admin.findById(id);
            }
            if (!targetUser) {
                targetUser = await User.findOne({ $or: [{ empID: id }, { email: id }] }) || await Admin.findOne({ email: id });
            }
            if (targetUser) {
                const targetRole = targetUser.role || (targetUser.designation === 'Employee' ? 'employee' : '');
                if (targetRole !== 'store_admin' && targetRole !== 'employee') {
                    return res.status(403).json({
                        success: false,
                        message: "Cluster admins are only allowed to delete store_admin or employee users.",
                    });
                }
            }
        }

        let deletedUser = null;
        if (mongoose.isValidObjectId(id)) {
            deletedUser = await User.findByIdAndDelete(id);
        }

        if (!deletedUser) {
            deletedUser = await User.findOneAndDelete({
                $or: [{ empID: id }, { email: id }]
            });
        }

        if (deletedUser) {
            return res.status(200).json({ success: true, message: "Employee deleted successfully" });
        }

        let deletedAdmin = null;
        if (mongoose.isValidObjectId(id)) {
            deletedAdmin = await Admin.findByIdAndDelete(id);
        }

        if (!deletedAdmin) {
            deletedAdmin = await Admin.findOneAndDelete({ email: id });
        }

        if (!deletedAdmin) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPendingRegistrations = async (req, res) => {
    try {
        const pendingUsers = await User.find({ registrationStatus: 'pending' }).sort({ createdAt: -1 });
        const pendingAdmins = await Admin.find({
            $or: [{ registrationStatus: 'pending' }, { isActive: false }]
        }).populate('branches').sort({ createdAt: -1 });

        const formattedUsers = pendingUsers.map((u) => ({
            id: u._id,
            _id: u._id,
            username: u.username,
            name: u.username,
            email: u.email,
            empID: u.empID,
            phoneNumber: u.phoneNumber,
            workingBranch: u.workingBranch || 'Default Store',
            designation: u.designation || 'Employee',
            role: u.designation || 'employee',
            type: 'user',
            createdAt: u.createdAt,
            registrationStatus: u.registrationStatus
        }));

        const formattedAdmins = pendingAdmins.map((a) => {
            let branchName = 'All Stores';
            if (a.branches && a.branches.length > 0) {
                branchName = a.branches.map(b => b.workingBranch || b.locCode).join(', ');
            }
            return {
                id: a._id,
                _id: a._id,
                username: a.name,
                name: a.name,
                email: a.email,
                empID: a.EmpId,
                phoneNumber: a.phoneNumber,
                workingBranch: branchName,
                designation: a.role,
                role: a.role,
                type: 'admin',
                createdAt: a.createdAt,
                registrationStatus: a.registrationStatus || (a.isActive ? 'approved' : 'pending')
            };
        });

        return res.status(200).json({
            success: true,
            data: [...formattedUsers, ...formattedAdmins]
        });
    } catch (error) {
        console.error('Error fetching pending registrations:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch pending registrations' });
    }
};

export const handleRegistrationApproval = async (req, res) => {
    try {
        const { userId, action } = req.body;
        if (!userId || !['accept', 'decline'].includes(action)) {
            return res.status(400).json({ success: false, message: 'userId and action ("accept" or "decline") are required.' });
        }

        let user = await User.findById(userId);
        if (user) {
            if (action === 'accept') {
                user.registrationStatus = 'approved';
                await user.save();
                return res.status(200).json({
                    success: true,
                    message: `Registration for ${user.username} (${user.empID}) has been accepted.`,
                    user
                });
            } else {
                user.registrationStatus = 'declined';
                await user.save();
                return res.status(200).json({
                    success: true,
                    message: `Registration for ${user.username} (${user.empID}) has been declined.`,
                    user
                });
            }
        }

        let admin = await Admin.findById(userId);
        if (admin) {
            if (action === 'accept') {
                admin.registrationStatus = 'approved';
                admin.isActive = true;
                await admin.save();
                return res.status(200).json({
                    success: true,
                    message: `Admin registration for ${admin.name} (${admin.EmpId}) has been accepted.`,
                    user: admin
                });
            } else {
                admin.registrationStatus = 'declined';
                admin.isActive = false;
                await admin.save();
                return res.status(200).json({
                    success: true,
                    message: `Admin registration for ${admin.name} (${admin.EmpId}) has been declined.`,
                    user: admin
                });
            }
        }

        return res.status(404).json({ success: false, message: 'Registration request not found' });
    } catch (error) {
        console.error('Error processing registration approval:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

