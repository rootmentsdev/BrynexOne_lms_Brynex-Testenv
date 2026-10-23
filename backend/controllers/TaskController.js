import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Task from '../model/Task.js';
import Admin from '../model/Admin.js';
import Employee from '../model/Employee.js';
import User from '../model/User.js';
import Branch from '../model/Branch.js';
import { getAccessibleEmployeeIds, getAccessibleStoreIds, isFullAccessAdmin, validateEmployeeAccess } from '../lib/permissions.js';
import { sendNotification } from '../utils/notificationHelper.js';
import Cluster from '../model/Cluster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveAssigneeId = async (assignedTo) => {
  if (!assignedTo) return null;

  // 1. If it's already a valid ObjectId, return it
  if (mongoose.Types.ObjectId.isValid(assignedTo)) {
    return assignedTo.toString();
  }

  // 2. If it is a group selection key, return it
  if (['all_employees', 'all_store_admins', 'all_cluster_admins', 'all_process_control_managers', 'all_hr_admins'].includes(assignedTo)) {
    return assignedTo;
  }

  // Support group labels
  if (assignedTo.toLowerCase() === 'all employees') return 'all_employees';
  if (assignedTo.toLowerCase() === 'all store admins') return 'all_store_admins';
  if (assignedTo.toLowerCase() === 'all cluster admins') return 'all_cluster_admins';
  if (assignedTo.toLowerCase() === 'all process control managers') return 'all_process_control_managers';
  if (assignedTo.toLowerCase() === 'all hr admins') return 'all_hr_admins';

  // 3. Parse formatted label, e.g. "Rivas - Admin - All Stores"
  const parts = assignedTo.split(' - ');
  const namePart = parts[0]?.trim();
  if (!namePart) return assignedTo;

  const escapedName = namePart.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

  // Search Admin by name, username, or EmpId
  const admin = await Admin.findOne({
    $or: [
      { name: { $regex: `^${escapedName}$`, $options: 'i' } },
      { username: { $regex: `^${escapedName}$`, $options: 'i' } },
      { EmpId: { $regex: `^${escapedName}$`, $options: 'i' } },
      { name: { $regex: `^${escapedName}`, $options: 'i' } }
    ]
  });
  if (admin) return admin._id.toString();

  // Search User by username, name, or empID
  const user = await User.findOne({
    $or: [
      { username: { $regex: `^${escapedName}$`, $options: 'i' } },
      { name: { $regex: `^${escapedName}$`, $options: 'i' } },
      { empID: { $regex: `^${escapedName}$`, $options: 'i' } },
      { username: { $regex: `^${escapedName}`, $options: 'i' } }
    ]
  });
  if (user) return user._id.toString();

  // Search Employee
  const employees = await Employee.find({}).lean();
  for (const emp of employees) {
    const fullName = emp.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : (emp.username || '');
    if (fullName.toLowerCase().startsWith(namePart.toLowerCase()) || emp.employeeId?.toLowerCase() === namePart.toLowerCase()) {
      return emp._id.toString();
    }
  }

  return assignedTo;
};

const ASSIGNED_TO_LABELS = {
  store_admin: 'Store Admin',
  cluster_admin: 'Cluster Admin',
  process_control_manager: 'Process Control Manager',
  office_admin: 'Office Admin',
  all_stores: 'All Stores',
  telecaller: 'Telecaller',
};

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  hr_admin: 'HR Admin',
  process_control_manager: 'Process Control Manager',
  cluster_admin: 'Cluster Admin',
  store_admin: 'Store Admin',
  office_admin: 'Office Admin',
  telecaller: 'Telecaller',
};

/** Map form priority to table display priority */
const normalizePriority = (p) => {
  const map = { Urgent: 'High', High: 'High', Normal: 'Medium', Low: 'Low', Medium: 'Medium', Not: 'Not' };
  return map[p] || p;
};

const parseDateParts = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : new Date(dateStr.getTime());
  if (typeof dateStr !== 'string') {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const cleanStr = dateStr.trim();
  if (!cleanStr || cleanStr === '—' || cleanStr === '-') return null;

  const dateOnly = cleanStr.includes('T') ? cleanStr.split('T')[0] : cleanStr.split(' ')[0];

  if (dateOnly.includes('/')) {
    const parts = dateOnly.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
  }
  if (dateOnly.includes('-')) {
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
  }
  const fallback = new Date(cleanStr);
  return isNaN(fallback.getTime()) ? null : fallback;
};

const parseTimeParts = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3]?.toLowerCase();
  if (meridian === 'pm' && hours < 12) hours += 12;
  if (meridian === 'am' && hours === 12) hours = 0;
  return { hours, minutes };
};

const computeStatus = (task) => {
  if (task.status === 'COMPLETED') return 'COMPLETED';
  if (task.status === 'ON HOLD') return 'ON HOLD';
  if (task.status === 'UNDER REVIEW' || task.status === 'PENDING REVIEW') return task.status;

  const end = parseDateParts(task.endDate);
  if (end) {
    const time = parseTimeParts(task.endTime);
    if (time) {
      end.setHours(time.hours, time.minutes, 59, 999);
    } else {
      end.setHours(23, 59, 59, 999);
    }
    const now = new Date();
    if (end < now) return 'OVERDUE';
  }
  return task.status || 'PENDING';
};

const formatDisplayDate = (dateStr) => {
  const d = parseDateParts(dateStr);
  if (!d || Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatDetailDate = (dateStr) => {
  const d = dateStr instanceof Date
    ? dateStr
    : parseDateParts(dateStr);
  if (!d || Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const isBase64String = (str) => {
  if (!str || typeof str !== 'string') return false;
  const cleaned = str.replace(/[\s]/g, '');
  if (cleaned.startsWith('data:')) return true;
  if (cleaned.length < 100) return false;
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(cleaned);
};

const getMimeTypeFromBase64 = (base64Str) => {
  if (base64Str.startsWith('/9j/')) return 'image/jpeg';
  if (base64Str.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64Str.startsWith('R0lGODlh')) return 'image/gif';
  if (base64Str.startsWith('JVBERi0')) return 'application/pdf';
  if (base64Str.startsWith('UESDBBQ')) return 'application/zip';
  return 'application/octet-stream';
};

const normalizeAttachmentToDataUri = (str) => {
  if (!str) return '';
  const cleaned = str.replace(/[\s]/g, '');
  if (cleaned.startsWith('data:')) return cleaned;
  if (isBase64String(cleaned)) {
    const mime = getMimeTypeFromBase64(cleaned);
    return `data:${mime};base64,${cleaned}`;
  }
  return str;
};

const formatStoreSubLabel = (str) => {
  if (!str) return '—';
  const val = String(str).trim();
  if (val.includes(',') || val.length > 40 || val.toLowerCase().includes('all store')) {
    return 'All Stores';
  }
  return val;
};

export const mapTaskForClient = (doc, overrideBranch, requesterInfo) => {
  const task = doc.toObject ? doc.toObject() : doc;
  const status = computeStatus(task);
  const priority = normalizePriority(task.priority);
  const taskId = task.taskCode || task._id?.toString();

  let attachmentVal = '';
  if (task.attachmentName) {
    attachmentVal = `/api/task/${taskId}/attachment`;
  } else if (task.attachment) {
    attachmentVal = normalizeAttachmentToDataUri(task.attachment);
    if (attachmentVal.startsWith('data:')) {
      attachmentVal = `/api/task/${taskId}/attachment`;
    }
  }

  let reviewAttachmentVal = '';
  if (task.reviewAttachmentName) {
    reviewAttachmentVal = `/api/task/${taskId}/review-attachment`;
  } else if (task.reviewAttachment) {
    reviewAttachmentVal = normalizeAttachmentToDataUri(task.reviewAttachment);
    if (reviewAttachmentVal.startsWith('data:')) {
      reviewAttachmentVal = `/api/task/${taskId}/review-attachment`;
    }
  }

  let requesterRole = '';
  let requesterId = '';

  if (typeof requesterInfo === 'object' && requesterInfo !== null) {
    requesterRole = requesterInfo.role || '';
    requesterId = requesterInfo.userId || '';
  } else {
    requesterRole = requesterInfo || '';
  }

  const isAssignee = requesterId && task.assignedTo === requesterId.toString();
  const isEmployee = ['employee', 'user'].includes(requesterRole);
  const showAdminDetails = requesterId ? !isAssignee : !isEmployee;

  let titleToShow = task.title || '';
  let categoryToShow = task.category || '';
  let subCategoryToShow = task.subCategory || '';

  // Custom role-based header title visibility logic:
  if (task.taskTitles && task.taskTitles.length > 0) {
    let matchingTitleDoc = null;
    if (requesterRole === 'employee' || requesterRole === 'user') {
      matchingTitleDoc = [...task.taskTitles].reverse().find(t => ['store_admin', 'cluster_admin', 'process_control_manager', 'super_admin', 'admin', 'hr_admin'].includes(t.role));
    } else if (requesterRole === 'store_admin') {
      matchingTitleDoc = [...task.taskTitles].reverse().find(t => ['cluster_admin', 'process_control_manager', 'super_admin', 'admin', 'hr_admin'].includes(t.role));
    } else if (requesterRole === 'cluster_admin' || requesterRole === 'process_control_manager') {
      matchingTitleDoc = [...task.taskTitles].reverse().find(t => ['super_admin', 'admin', 'hr_admin'].includes(t.role));
    }

    if (matchingTitleDoc) {
      titleToShow = matchingTitleDoc.title;
      categoryToShow = matchingTitleDoc.title;
    }
  } else {
    titleToShow = (showAdminDetails && task.adminTitle) ? task.adminTitle : (task.title || '');
    categoryToShow = (showAdminDetails && task.adminCategory) ? task.adminCategory : (task.category || '');
    subCategoryToShow = (showAdminDetails && task.adminSubCategory) ? task.adminSubCategory : (task.subCategory || '');
  }

  const rawAssigneeSub = overrideBranch ?? task.storeName ?? task.storeCode ?? '—';

  const isReassigned = Boolean(
    task.status === 'REASSIGNED' ||
    task.reassignedCategory ||
    (task.workMap && task.workMap.some(w => w.action === 'REASSIGNED')) ||
    (task.attachments && task.attachments.some(a => a.step === 'REASSIGNED'))
  );

  return {
    id: taskId,
    _id: task._id?.toString(),
    title: titleToShow,
    category: categoryToShow,
    categorySub: formatStoreSubLabel(task.storeName || task.storeCode || subCategoryToShow),
    categoryDetail: subCategoryToShow,
    adminTitle: task.adminTitle || '',
    adminCategory: task.adminCategory || '',
    adminSubCategory: task.adminSubCategory || '',
    reassignedTitle: task.title || '',
    reassignedCategory: task.category || '',
    reassignedSubCategory: task.subCategory || '',
    isReassigned,
    assignedTo: task.assignedTo,
    createdBy: task.createdBy?.toString() || '',
    assignee: task.assignedToLabel || ASSIGNED_TO_LABELS[task.assignedTo] || task.assignedTo,
    assigneeSub: formatStoreSubLabel(rawAssigneeSub),
    assigneeRole: task.assignedToLabel || ASSIGNED_TO_LABELS[task.assignedTo] || task.assignedTo,
    priority,
    startDate: formatDisplayDate(task.startDate),
    startTime: task.startTime || '—',
    endDate: task.endDate ? formatDisplayDate(task.endDate) : '—',
    endTime: task.endTime || '—',
    description: task.description?.trim() || '—',
    status,
    assignedBy: task.assignedByName || '—',
    assignedByRole: task.assignedByRole || '—',
    assignedDate: formatDetailDate(task.createdAt ? new Date(task.createdAt) : task.startDate),
    assignedTime: task.startTime || '—',
    startDateDetail: formatDetailDate(task.startDate),
    endDateDetail: task.endDate ? formatDetailDate(task.endDate) : '—',
    mode: task.mode,
    additionalInfo: task.additionalInfo,
    attachment: attachmentVal,
    attachmentName: task.attachmentName || '',
    reviewAttachment: reviewAttachmentVal,
    reviewAttachmentName: task.reviewAttachmentName || '',
    attachments: (task.attachments || []).map((att, idx) => ({
      id: att._id?.toString() || idx,
      name: att.name || 'attachment',
      uploadedByName: att.uploadedByName || 'Unknown',
      uploadedAt: att.uploadedAt,
      step: att.step || 'ASSIGNED',
      url: `/api/task/${taskId}/attachment/${idx}`
    })),
    requestedExtensionDate: task.requestedExtensionDate || '',
    previousStatus: task.previousStatus || '',
    approvalChain: task.approvalChain || [],
    approvalChainIndex: task.approvalChainIndex ?? 0,
    workMap: (() => {
      const list = task.workMap || [];
      const filtered = [];
      let lastAssignee = null;
      for (const step of list) {
        if (step.action !== 'ASSIGNED' && step.action !== 'REASSIGNED' && step.action !== 'COMPLETED' && step.action !== 'EXTENSION REQUESTED' && step.action !== 'EXTENSION APPROVED' && step.action !== 'EXTENSION REJECTED') {
          continue;
        }
        if (step.action === 'ASSIGNED') {
          filtered.push(step);
          lastAssignee = step.assignedTo;
        } else if (step.action === 'REASSIGNED') {
          if (step.assignedTo && lastAssignee && String(step.assignedTo) !== String(lastAssignee)) {
            filtered.push(step);
            lastAssignee = step.assignedTo;
          }
        } else if (step.action === 'COMPLETED' || step.action === 'EXTENSION REQUESTED' || step.action === 'EXTENSION APPROVED' || step.action === 'EXTENSION REJECTED') {
          filtered.push(step);
        }
      }
      return filtered;
    })(),
    createdAt: task.createdAt,
  };
};

const nextTaskCode = async () => {
  // Find highest numeric code to avoid E11000 duplicate key errors if tasks were deleted or generated
  const tasks = await Task.find({ taskCode: { $regex: /^TSK-\d+$/ } })
    .select('taskCode')
    .lean();

  let maxNum = 0;
  for (const t of tasks) {
    const match = t.taskCode?.match(/^TSK-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  let candidateNum = Math.max(maxNum + 1, (await Task.countDocuments()) + 1);
  let candidate = `TSK-${String(candidateNum).padStart(3, '0')}`;

  // Ensure collision-free
  while (await Task.exists({ taskCode: candidate })) {
    candidateNum++;
    candidate = `TSK-${String(candidateNum).padStart(3, '0')}`;
  }

  return candidate;
};

export const createTask = async (req, res) => {
  try {
    let creator = await Admin.findById(req.admin.userId).populate('branches');
    let isCreatorAdmin = true;
    if (!creator) {
      creator = await User.findById(req.admin.userId);
      isCreatorAdmin = false;
      if (!creator) {
        return res.status(404).json({ success: false, message: 'Creator not found' });
      }
    }

    const {
      title,
      category,
      subCategory,
      assignedTo,
      assignedToLabel,
      mode = 'task',
      startDate,
      startTime = '',
      endDate = '',
      endTime = '',
      description = '',
      additionalInfo = '',
      priority = 'Normal',
      fileAttachment,
    } = req.body;

    if (!title || !category || !subCategory || !assignedTo || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'title, category, subCategory, assignedTo, and startDate are required',
      });
    }

    // Resolve assignedTo string to proper ObjectID if needed (e.g. from Flutter label)
    const resolvedAssignedTo = await resolveAssigneeId(assignedTo);
    const resolvedAssignedToLabel = resolvedAssignedTo !== assignedTo ? assignedTo : assignedToLabel;

    let attachment = '';
    let attachmentName = '';
    if (fileAttachment && fileAttachment.base64) {
      attachment = fileAttachment.base64;
      attachmentName = fileAttachment.name;
    }

    const branch = isCreatorAdmin ? creator.branches?.[0] : null;
    let storeName = '';
    let storeCode = '';

    if (isCreatorAdmin) {
      storeName = branch?.workingBranch || '';
      storeCode = branch?.locCode ? `Z-${branch.locCode}` : '';
    } else {
      storeName = creator.workingBranch || '';
      storeCode = creator.locCode ? (Array.isArray(creator.locCode) ? `Z-${creator.locCode[0]}` : `Z-${creator.locCode}`) : '';
    }

    const roleLabel = isCreatorAdmin ? (ROLE_LABELS[creator.role] || creator.role) : 'Staff';
    const subRole = isCreatorAdmin && creator.subRole && creator.subRole !== 'NR' ? creator.subRole : '';

    // Resolve all target assignees
    const targets = [];

    if (resolvedAssignedTo === 'all_employees') {
      const storeIds = await getAccessibleStoreIds(creator._id);
      const employeesList = await Employee.find({ storeId: { $in: storeIds }, isActive: true }).populate('storeId');
      employeesList.forEach(emp => {
        const empName = emp.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : (emp.username || 'Employee');
        const storeNameVal = emp.storeId?.workingBranch || 'Store';
        targets.push({
          id: emp._id.toString(),
          label: `${empName} - Staff - ${storeNameVal}`
        });
      });
    }
    else if (resolvedAssignedTo === 'all_store_admins') {
      const storeIds = await getAccessibleStoreIds(creator._id);
      const adminQuery = { role: 'store_admin', branches: { $in: storeIds }, isActive: true };
      const adminsList = await Admin.find(adminQuery).populate('branches');
      adminsList.forEach(ad => {
        const storeNameVal = ad.branches?.[0]?.workingBranch || 'Store';
        targets.push({
          id: ad._id.toString(),
          label: `${ad.name} - Store Admin - ${storeNameVal}`
        });
      });
    } 
    else if (resolvedAssignedTo === 'all_cluster_admins') {
      const adminsList = await Admin.find({ role: 'cluster_admin', isActive: true });
      adminsList.forEach(ad => {
        targets.push({
          id: ad._id.toString(),
          label: `${ad.name} - Cluster Admin - Cluster`
        });
      });
    }
    else if (resolvedAssignedTo === 'all_process_control_managers') {
      const adminsList = await Admin.find({ role: 'process_control_manager', isActive: true });
      adminsList.forEach(ad => {
        targets.push({
          id: ad._id.toString(),
          label: `${ad.name} - Process Control Manager - All Store`
        });
      });
    }
    else if (resolvedAssignedTo === 'all_hr_admins') {
      const adminsList = await Admin.find({ role: 'hr_admin', isActive: true });
      adminsList.forEach(ad => {
        targets.push({
          id: ad._id.toString(),
          label: `${ad.name} - HR Admin - Admin`
        });
      });
    }
    else {
      targets.push({
        id: resolvedAssignedTo,
        label: resolvedAssignedToLabel || ASSIGNED_TO_LABELS[resolvedAssignedTo] || resolvedAssignedTo
      });
    }

    // Deduplicate targets by id so no individual receives duplicate tasks
    const uniqueTargets = [];
    const seenTargetIds = new Set();
    for (const t of targets) {
      if (t.id && !seenTargetIds.has(t.id.toString())) {
        seenTargetIds.add(t.id.toString());
        uniqueTargets.push(t);
      }
    }

    if (uniqueTargets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No employees or admins match this group selection',
      });
    }

    const createdTasks = [];
    const baseTaskCode = await nextTaskCode();
    let index = 0;

    for (const target of uniqueTargets) {
      const taskCode = uniqueTargets.length > 1
        ? `${baseTaskCode}-${index + 1}`
        : baseTaskCode;

      // Resolve store for individual assignee dynamically
      let targetStoreName = '';
      let targetStoreCode = '';
      try {
        const targetAdmin = await Admin.findById(target.id).populate('branches');
        if (targetAdmin) {
          if (['super_admin', 'admin', 'hr_admin'].includes(targetAdmin.role)) {
            targetStoreName = 'Office';
            targetStoreCode = '';
          } else {
            const targetBranch = targetAdmin.branches?.[0];
            targetStoreName = targetBranch?.workingBranch || '';
            targetStoreCode = targetBranch?.locCode ? `Z-${targetBranch.locCode}` : '';
          }
        } else {
          const targetUser = await User.findById(target.id);
          if (targetUser) {
            targetStoreName = targetUser.workingBranch || '';
            targetStoreCode = targetUser.locCode ? (Array.isArray(targetUser.locCode) ? `Z-${targetUser.locCode[0]}` : `Z-${targetUser.locCode}`) : '';
          } else {
            const targetEmp = await Employee.findById(target.id).populate('storeId');
            if (targetEmp) {
              targetStoreName = targetEmp.storeId?.workingBranch || targetEmp.workingBranch || '';
              targetStoreCode = targetEmp.storeId?.locCode ? `Z-${targetEmp.storeId.locCode}` : '';
            }
          }
        }
      } catch (err) {
        console.error('Error resolving target assignee store:', err);
      }

      if (!targetStoreName && !targetStoreCode) {
        targetStoreName = storeName;
        targetStoreCode = storeCode;
      }

      // Approval chain for task completion: Assignee -> Creator (Assigner)
      let resolvedApprovalChain = [creator._id.toString()];

      const task = await Task.create({
        taskCode,
        title: title.trim(),
        category: category.trim(),
        subCategory: subCategory.trim(),
        adminTitle: title.trim(),
        adminCategory: category.trim(),
        adminSubCategory: subCategory.trim(),
        assignedTo: target.id,
        assignedToLabel: target.label,
        mode,
        startDate,
        startTime,
        endDate: mode === 'auto' ? startDate : endDate,
        endTime: mode === 'auto' ? startTime : endTime,
        description,
        additionalInfo,
        priority,
        status: 'IN PROGRESS',
        storeName: targetStoreName,
        storeCode: targetStoreCode,
        createdBy: creator._id,
        assignedByName: isCreatorAdmin ? creator.name : creator.username,
        assignedByRole: subRole ? `${roleLabel} · ${subRole}` : roleLabel,
        attachment,
        attachmentName,
        attachments: attachment ? [{
          name: attachmentName,
          file: attachment,
          uploadedBy: creator._id.toString(),
          uploadedByName: isCreatorAdmin ? creator.name : creator.username,
          uploadedAt: new Date(),
          step: 'ASSIGNED'
        }] : [],
        workMap: [{
          assignedTo: target.id,
          assignedToLabel: target.label,
          assignedBy: isCreatorAdmin ? creator.name : creator.username,
          assignedAt: new Date(),
          action: 'ASSIGNED'
        }],
        approvalChain: resolvedApprovalChain,
        approvalChainIndex: 0,
        taskTitles: [{
          userId: creator._id.toString(),
          role: isCreatorAdmin ? creator.role : 'user',
          title: title.trim()
        }]
      });
      createdTasks.push(task);
      
      // Send notification to the assignee (fire safely in background)
      const creatorName = isCreatorAdmin ? creator.name : creator.username;
      sendNotification({
        title: 'New Task Assigned',
        body: `You have been assigned a new task: "${title.trim()}" by ${creatorName}`,
        userIds: [target.id],
        senderName: creatorName,
        category: 'Task'
      }).catch(notifErr => {
        console.error('Failed to send task assignment notification:', notifErr.message);
      });

      index++;
    }

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: mapTaskForClient(createdTasks[0], null, req.admin),
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error.message,
    });
  }
};

import { buildTaskFilter, resolveAllAssignedIds, isBranchMatchingDeptOrWorkingBranch } from '../lib/permissions.js';

export const getTasks = async (req, res) => {
  try {
    const adminId = req.admin.userId;
    const { search, category, priority, status, storeId, employeeId, mine, mobile } = req.query;
    
    // 1. Build Base Query
    let baseQuery = {};
    if (storeId) {
        baseQuery.storeCode = storeId;
    }
    if (employeeId) {
      // 1. Determine caller identity and role
      const callerAdmin = await Admin.findById(adminId);
      if (callerAdmin && callerAdmin.role !== 'employee') {
        // If they are not full access (Super/HR Admin), validate they have store/cluster access to this employee
        if (!isFullAccessAdmin(callerAdmin.role)) {
          const accessibleStoreIds = await getAccessibleStoreIds(adminId);

          const accessibleEmployees = await Employee.find({
              storeId: { $in: accessibleStoreIds },
              status: 'Active'
          }).select('_id').lean();

          const accessibleBranches = await Branch.find({ _id: { $in: accessibleStoreIds } });
          const locCodes = accessibleBranches.map(b => b.locCode);
          const accessibleUsers = await User.find({ locCode: { $in: locCodes } }).select('_id').lean();

          const accessibleAdmins = await Admin.find({
              branches: { $in: accessibleStoreIds },
              isActive: true
          }).select('_id').lean();

          const accessibleAssigneeIds = [
              ...accessibleEmployees.map(e => e._id.toString()),
              ...accessibleUsers.map(u => u._id.toString()),
              ...accessibleAdmins.map(a => a._id.toString()),
          ];

          if (!accessibleAssigneeIds.includes(employeeId.toString())) {
            return res.status(403).json({ success: false, message: 'Access denied: You do not have access to this employee\'s tasks' });
          }
        }
      } else {
        // Regular user/employee: can only view their own tasks
        const callerUser = callerAdmin || await User.findById(adminId);
        if (!callerUser) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Check if the requested employeeId belongs to the caller
        const callerEmployee = await Employee.findOne({
          $or: [
            { email: callerUser.email },
            { contactNo: callerUser.contactNo || callerUser.phoneNumber },
            { username: callerUser.username || callerUser.name }
          ]
        });
        const allowedIds = [callerUser._id.toString()];
        if (callerEmployee) {
          allowedIds.push(callerEmployee._id.toString());
        }

        if (!allowedIds.includes(employeeId.toString())) {
          return res.status(403).json({ success: false, message: 'Access denied: You cannot view tasks of other employees' });
        }
      }

      const linkedTargetIds = await resolveAllAssignedIds(null, null, employeeId);
      baseQuery.assignedTo = { $in: linkedTargetIds };
    }
    if (category && category !== 'All') {
      baseQuery.category = { $regex: new RegExp(category, 'i') };
    }
    if (priority && priority !== 'All') {
      baseQuery.priority = priority;
    }
    if (status && status !== 'All') {
      if (status === 'OVERDUE') {
        baseQuery.status = { $nin: ['COMPLETED', 'ON HOLD', 'UNDER REVIEW', 'PENDING REVIEW'] };
      } else if (status === 'IN PROGRESS') {
        baseQuery.status = { $in: ['IN PROGRESS', 'PENDING', 'REASSIGNED'] };
      } else {
        baseQuery.status = status;
      }
    }

    // 2. Wrap with RBAC Filter
    //    For mobile/flutter app: only show tasks assigned to the user (not tasks they created)
    //    For web: apply normal RBAC filtering
    let secureQuery;
    if (mobile === 'true') {
      const assignedIds = await resolveAllAssignedIds(null, null, adminId);
      
      secureQuery = {
        ...baseQuery,
        assignedTo: { $in: assignedIds }
      };
    } else if (mine === 'true') {
      secureQuery = {
        ...baseQuery,
        $or: [
          { createdBy: adminId },
          { assignedTo: adminId.toString() },
        ],
      };
    } else {
      secureQuery = await buildTaskFilter(adminId, baseQuery);
      if (secureQuery._id === null) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }


    // 3. Fetch filtered tasks directly from MongoDB
    let tasks = await Task.find(secureQuery)
      .select({ attachment: 0, reviewAttachment: 0, 'attachments.file': 0 })
      .sort({ createdAt: -1 })
      .lean();

    // 4. Batch-resolve assignee working branches (2 queries total)
    const assigneeIds = [...new Set(tasks.map(t => t.assignedTo?.toString()).filter(Boolean))];
    const [assigneeAdmins, assigneeUsers] = await Promise.all([
      Admin.find({ _id: { $in: assigneeIds } }, { role: 1, branches: 1 }).populate('branches', 'workingBranch locCode').lean(),
      User.find({ _id: { $in: assigneeIds } }, { workingBranch: 1, locCode: 1 }).lean(),
    ]);
    const branchByAssignee = {};
    assigneeAdmins.forEach(ad => {
      if (['super_admin', 'admin', 'hr_admin'].includes(ad.role)) {
        branchByAssignee[ad._id.toString()] = 'Office';
      } else {
        branchByAssignee[ad._id.toString()] = ad.branches?.[0]?.workingBranch || '';
      }
    });
    assigneeUsers.forEach(u => {
      branchByAssignee[u._id.toString()] = u.workingBranch || '';
    });

    let mapped = tasks.map((t) => mapTaskForClient(t, branchByAssignee[t.assignedTo?.toString()] || null, req.admin));

    if (search) {
      const q = search.toLowerCase();
      mapped = mapped.filter((t) => [
        t.title, t.id, t.assignee, t.categorySub, t.category, t.description,
      ].some((v) => String(v).toLowerCase().includes(q)));
    }

    if (category && category !== 'All') {
      mapped = mapped.filter((t) => t.category.toLowerCase().includes(category.toLowerCase()));
    }

    if (priority && priority !== 'All') {
      mapped = mapped.filter((t) => t.priority === priority);
    }

    if (status && status !== 'All') {
      mapped = mapped.filter((t) => t.status === status);
    }

    // Sort by OVERDUE tasks first, then by newest created first
    mapped.sort((a, b) => {
      const aOverdue = a.status === 'OVERDUE' ? 1 : 0;
      const bOverdue = b.status === 'OVERDUE' ? 1 : 0;
      if (aOverdue !== bOverdue) {
        return bOverdue - aOverdue;
      }
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return res.status(200).json({
      success: true,
      count: mapped.length,
      data: mapped,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message,
    });
  }
};

function assignedToMatchesRole(assignedTo, role) {
  if (role === 'cluster_admin' || role === 'process_control_manager') {
    return assignedTo === 'cluster_admin' || assignedTo === 'process_control_manager' || assignedTo === 'all_stores' || assignedTo === 'store_admin';
  }
  if (role === 'store_admin') {
    return assignedTo === 'store_admin';
  }
  return true;
}

export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    }).select({ attachment: 0, reviewAttachment: 0, 'attachments.file': 0 });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Resolve assignee's actual working branch
    let assigneeBranch = null;
    try {
      const assigneeId = task.assignedTo?.toString();
      if (assigneeId) {
        const assigneeAdmin = await Admin.findById(assigneeId, { role: 1, branches: 1 }).populate('branches', 'workingBranch').lean();
        if (assigneeAdmin) {
          assigneeBranch = ['super_admin', 'admin', 'hr_admin', 'process_control_manager'].includes(assigneeAdmin.role)
            ? 'Office'
            : (assigneeAdmin.branches?.[0]?.workingBranch || null);
        } else {
          const assigneeUser = await User.findById(assigneeId, { workingBranch: 1 }).lean();
          assigneeBranch = assigneeUser?.workingBranch || null;
        }
      }
    } catch (_) {}

    return res.status(200).json({
      success: true,
      data: mapTaskForClient(task, assigneeBranch, req.admin),
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch task',
      error: error.message,
    });
  }
};

export const getTaskAssignees = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const adminId = req.admin.userId;
    let user = await Admin.findById(adminId).populate('branches');
    let role = user ? user.role : '';
    let isUserAdmin = true;

    if (!user || user.role === 'employee') {
      user = user || await User.findById(adminId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User or Admin not found' });
      }
      role = 'user';
      isUserAdmin = false;
    }

    // Helper to determine if a user/admin is associated with all/multiple stores
    const isAllStoreEmployee = (item, designationOrRole) => {
      const design = String(designationOrRole || '').toLowerCase();
      const workingBranch = String(item.workingBranch || '').toLowerCase();
      
      const hasAllStoreRole = ['super_admin', 'admin', 'hr_admin', 'process_control_manager', 'office_admin'].includes(design) || 
                              design.includes('process control') ||
                              design.includes('office admin') ||
                              design.includes('hr admin') || 
                              design.includes('super admin') || 
                              (design.includes('admin') && !design.includes('store') && !design.includes('cluster'));
      
      const hasAllStoreBranch = workingBranch.includes(',') || 
                              workingBranch.includes('all store') || 
                              workingBranch.includes('office');
                                
      const hasManyLocCodes = Array.isArray(item.locCode) && item.locCode.length > 3;
      const hasManyBranches = Array.isArray(item.branches) && item.branches.length > 3;
      
      return hasAllStoreRole || hasAllStoreBranch || hasManyLocCodes || hasManyBranches || item.locCode === 'All';
    };

    // 1. Parse target branch from query parameters (locCode or storeId)
    const { locCode, storeId } = req.query;
    let targetBranchId = null;
    let targetBranchName = null;

    if (locCode) {
      const branch = await Branch.findOne({ locCode: String(locCode).trim() });
      if (branch) {
        targetBranchId = branch._id.toString();
        targetBranchName = branch.workingBranch;
      }
    } else if (storeId) {
      const branch = await Branch.findOne({ 
        $or: [
          ...(storeId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: storeId }] : []),
          { locCode: String(storeId).trim() }
        ]
      });
      if (branch) {
        targetBranchId = branch._id.toString();
        targetBranchName = branch.workingBranch;
      }
    }

    // 2. Build generic options list based on role
    const genericOptions = [];
    if (role === 'super_admin' || role === 'admin') {
      genericOptions.push(
        { value: 'all_employees', label: 'All Employees', type: 'group' },
        { value: 'all_hr_admins', label: 'All HR Admins', type: 'group' },
        { value: 'all_process_control_managers', label: 'All Process Control Managers', type: 'group' },
        { value: 'all_office_admins', label: 'All Office Admins', type: 'group' },
        { value: 'all_cluster_admins', label: 'All Cluster Admins', type: 'group' },
        { value: 'all_store_admins', label: 'All Store Admins', type: 'group' }
      );
    } else if (role === 'hr_admin') {
      genericOptions.push(
        { value: 'all_employees', label: 'All Employees', type: 'group' },
        { value: 'all_process_control_managers', label: 'All Process Control Managers', type: 'group' },
        { value: 'all_office_admins', label: 'All Office Admins', type: 'group' },
        { value: 'all_cluster_admins', label: 'All Cluster Admins', type: 'group' },
        { value: 'all_store_admins', label: 'All Store Admins', type: 'group' }
      );
    } else if (role === 'process_control_manager') {
      genericOptions.push(
        { value: 'all_employees', label: 'All Employees', type: 'group' },
        { value: 'all_office_admins', label: 'All Office Admins', type: 'group' },
        { value: 'all_cluster_admins', label: 'All Cluster Admins', type: 'group' },
        { value: 'all_store_admins', label: 'All Store Admins', type: 'group' }
      );
    } else if (role === 'office_admin') {
      genericOptions.push(
        { value: 'all_employees', label: 'All Employees', type: 'group' },
        { value: 'all_office_admins', label: 'All Office Admins', type: 'group' },
        { value: 'all_store_admins', label: 'All Store Admins', type: 'group' }
      );
    } else if (role === 'cluster_admin') {
      genericOptions.push(
        { value: 'all_employees', label: 'All Employees', type: 'group' },
        { value: 'all_store_admins', label: 'All Store Admins', type: 'group' }
      );
    } else if (role === 'store_admin' || role === 'user') {
      genericOptions.push(
        { value: 'all_employees', label: 'All Employees', type: 'group' }
      );
    }

    // 3. Fetch accessible stores for the logged-in admin/user
    let accessibleStoreIds = await getAccessibleStoreIds(adminId);

    // Restrict accessible stores to the queried target branch if provided
    if (targetBranchId) {
      if (accessibleStoreIds.includes(targetBranchId)) {
        accessibleStoreIds = [targetBranchId];
      } else {
        accessibleStoreIds = [];
      }
    }

    // 4. Get Accessible Employees under these stores
    let employeeIds = await getAccessibleEmployeeIds(adminId, targetBranchId || null);

    // 5. Fetch Accessible Admins based on role hierarchy
    let adminQuery = { isActive: true };
    if (role === 'super_admin' || role === 'admin') {
      adminQuery.role = { $in: ['super_admin', 'admin', 'hr_admin', 'process_control_manager', 'cluster_admin', 'store_admin', 'office_admin'] };
    } else if (role === 'hr_admin') {
      adminQuery.role = { $in: ['hr_admin', 'process_control_manager', 'cluster_admin', 'store_admin', 'office_admin'] };
    } else if (role === 'process_control_manager') {
      adminQuery.role = { $in: ['process_control_manager', 'cluster_admin', 'store_admin', 'office_admin'] };
    } else if (role === 'office_admin') {
      adminQuery.role = { $in: ['office_admin', 'store_admin'] };
    } else if (role === 'cluster_admin') {
      adminQuery.role = { $in: ['cluster_admin', 'store_admin'] };
      adminQuery.branches = { $in: accessibleStoreIds };
    } else if (role === 'store_admin' || role === 'user') {
      adminQuery.role = 'store_admin';
      adminQuery.branches = { $in: accessibleStoreIds };
    } else {
      adminQuery.role = 'store_admin';
    }

    const admins = await Admin.find(adminQuery).populate('branches');

    // 6. Format individual lists
    const individualAssignees = [];

    // Add Admins
    admins.forEach(ad => {
      const designation = ad.subRole && ad.subRole !== 'NR' 
        ? ad.subRole 
        : (ROLE_LABELS[ad.role] || ad.role || 'Admin');
      
      let storeName = ad.branches && ad.branches.length > 0 ? ad.branches[0].workingBranch : 'Store';

      const isAllStore = isAllStoreEmployee(ad, ad.role);
      if (isAllStore || ['super_admin', 'admin', 'hr_admin', 'process_control_manager', 'office_admin'].includes(ad.role)) {
        storeName = 'All Store';
      }

      const empCode = (ad.EmpId || ad.employeeId || '').trim();

      individualAssignees.push({
        value: ad._id.toString(),
        label: `${ad.name} - ${designation} - ${storeName}`,
        type: 'admin',
        role: ad.role,
        empCode: empCode,
        isAllStore,
        storeNameNormalized: storeName
      });
    });

    // Make sure logged-in admin is in the list if they are an admin
    if (isUserAdmin && role === 'store_admin' && !individualAssignees.some(ad => ad.value === adminId.toString())) {
      const designation = user.subRole && user.subRole !== 'NR'
        ? user.subRole
        : 'Store Admin';
      let storeName = user.branches && user.branches.length > 0 ? user.branches[0].workingBranch : 'Store';

      const isAllStore = isAllStoreEmployee(user, user.role);
      if (isAllStore) {
        storeName = 'All Store';
      }

      const empCode = (user.EmpId || user.employeeId || '').trim();

      individualAssignees.push({
        value: user._id.toString(),
        label: `${user.name} - ${designation} - ${storeName}`,
        type: 'admin',
        role: user.role,
        empCode: empCode,
        isAllStore,
        storeNameNormalized: storeName
      });
    }

    // Add Employees from Employee collection
    const dbEmployees = await Employee.find({ _id: { $in: employeeIds }, status: 'Active' }).populate('storeId');
    dbEmployees.forEach(emp => {
      const name = emp.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : (emp.username || 'Employee');
      const empCode = (emp.employeeId || '').trim();
      const alreadyPresent = individualAssignees.some(item => 
        item.value === emp._id.toString() ||
        (empCode && item.empCode && item.empCode.toLowerCase() === empCode.toLowerCase()) ||
        (item.label && item.label.split(' - ')[0].trim().toLowerCase() === name.toLowerCase())
      );
      if (!alreadyPresent) {
        const designation = emp.designation || 'Staff';
        let storeNameVal = (emp.storeId && emp.storeId.workingBranch) || emp.workingBranch || emp.department || 'Store';

        const isAllStore = isAllStoreEmployee(emp, designation);
        if (isAllStore) {
          storeNameVal = 'All Store';
        }

        individualAssignees.push({
          value: emp._id.toString(),
          label: `${name} - ${designation} - ${storeNameVal}`,
          type: 'employee',
          empCode: empCode,
          isAllStore,
          storeNameNormalized: storeNameVal
        });
      }
    });

    // Add Users from User collection
    const dbUsers = await User.find({ _id: { $in: employeeIds } }).lean();
    dbUsers.forEach(u => {
      const uName = (u.username || u.name || 'Employee').trim();
      const empCode = (u.empID || u.EmpId || '').trim();
      const alreadyPresent = individualAssignees.some(item => 
        item.value === u._id.toString() ||
        (empCode && item.empCode && item.empCode.toLowerCase() === empCode.toLowerCase()) ||
        (item.label && item.label.split(' - ')[0].trim().toLowerCase() === uName.toLowerCase())
      );
      if (!alreadyPresent) {
        const designation = u.designation || 'Staff';
        let storeNameVal = u.workingBranch || 'Store';

        const isAllStore = isAllStoreEmployee(u, designation);
        if (isAllStore) {
          storeNameVal = 'All Store';
        }

        individualAssignees.push({
          value: u._id.toString(),
          label: `${uName} - ${designation} - ${storeNameVal}`,
          type: 'employee',
          empCode: empCode,
          isAllStore,
          storeNameNormalized: storeNameVal
        });
      }
    });

    // Make sure logged-in regular user is in the list
    if (!isUserAdmin && !individualAssignees.some(emp => emp.value === adminId.toString())) {
      const designation = user.designation || 'Staff';
      let storeNameVal = user.workingBranch || 'Store';

      const isAllStore = isAllStoreEmployee(user, designation);
      if (isAllStore) {
        storeNameVal = 'All Store';
      }

      individualAssignees.push({
        value: user._id.toString(),
        label: `${user.username || 'Employee'} - ${designation} - ${storeNameVal}`,
        type: 'employee',
        isAllStore,
        storeNameNormalized: storeNameVal
      });
    }

    // 6. Filter individual options
    let filteredAssignees = individualAssignees;

    if (role === 'user' || role === 'store_admin') {
      const allowedBranches = role === 'store_admin' ? (user.branches || []) : [];
      let allowedStoreNames = [];
      if (role === 'user' && user.workingBranch) {
        allowedStoreNames.push(user.workingBranch.trim().toLowerCase());
      } else if (role === 'store_admin' && user.branches) {
        user.branches.forEach(b => {
          if (b.workingBranch) allowedStoreNames.push(b.workingBranch.trim().toLowerCase());
        });
      }

      filteredAssignees = individualAssignees.filter(assignee => {
        if (assignee.isAllStore) return false;
        const assigneeStore = String(assignee.storeNameNormalized || '').trim().toLowerCase();
        if (allowedStoreNames.includes(assigneeStore)) return true;
        // Also check fuzzy branch matching
        if (allowedBranches.length > 0) {
          return allowedBranches.some(b => isBranchMatchingDeptOrWorkingBranch(b, assigneeStore));
        }
        return false;
      });
    } else if (targetBranchName) {
      // If a specific store is requested via locCode/storeId parameter, filter to just that store
      const normalizedTarget = String(targetBranchName).trim().toLowerCase();
      filteredAssignees = individualAssignees.filter(assignee => {
        const assigneeStore = String(assignee.storeNameNormalized || '').trim().toLowerCase();
        return assigneeStore === normalizedTarget || (targetBranchId && isBranchMatchingDeptOrWorkingBranch({ workingBranch: targetBranchName }, assigneeStore));
      });
    }

    // Sort individual options alphabetically by label
    filteredAssignees.sort((a, b) => a.label.localeCompare(b.label));

    // Combine generic group options with individual options
    const finalOptions = [...genericOptions, ...filteredAssignees];

    return res.status(200).json({
      success: true,
      data: finalOptions,
    });
  } catch (error) {
    console.error('Error fetching task assignees:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch task assignees',
      error: error.message,
    });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status, fileAttachment } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'status is required' });
    }

    let normalizedStatus = status.trim().toUpperCase();
    if (normalizedStatus === 'REVIEW') {
      normalizedStatus = 'UNDER REVIEW';
    }
    if (normalizedStatus === 'REASSIGN') {
      normalizedStatus = 'REASSIGNED';
    }
    const validStatuses = ['PENDING', 'IN PROGRESS', 'COMPLETED', 'OVERDUE', 'ON HOLD', 'UNDER REVIEW', 'PENDING REVIEW', 'REASSIGNED', 'EXTENSION REQUESTED'];
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Find the task by Mongo ID or taskCode
    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Role-based validation
    const userId = req.admin.userId;
    const userRole = req.admin.role;
    const isUserAdmin = userRole && userRole !== 'employee' && userRole !== 'user';

    // Verify permissions for status update (non-reassign status changes)
    if (normalizedStatus !== 'REASSIGNED') {
      if (!isUserAdmin) {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        const employee = await Employee.findOne({
          $or: [
            { userId: user._id },
            { employeeId: { $regex: `^${user.empID}$`, $options: 'i' } }
          ]
        });
        const assignedIds = [user._id.toString()];
        if (employee) {
          assignedIds.push(employee._id.toString());
        }

        const isAssignedToMe = assignedIds.includes(task.assignedTo);
        const isMyStore = task.storeCode === `Z-${user.locCode}`;
        if (!isAssignedToMe && !isMyStore) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You are not authorized to update this task',
          });
        }
      }
    } else {
      // Reassigning power check: only current assignee or admin can reassign
      if (!isUserAdmin) {
        const user = await User.findById(userId);
        const employee = user ? await Employee.findOne({
          $or: [
            { userId: user._id },
            { employeeId: { $regex: `^${user.empID}$`, $options: 'i' } }
          ]
        }) : null;
        const assignedIds = [userId.toString()];
        if (employee) {
          assignedIds.push(employee._id.toString());
        }
        if (!assignedIds.includes(task.assignedTo)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You are not authorized to reassign this task',
          });
        }
      }
    }

    // Resolve executor's display name
    let executorName = 'Unknown';
    try {
      const executorAdmin = await Admin.findById(userId);
      if (executorAdmin) {
        executorName = executorAdmin.name;
      } else {
        const executorUser = await User.findById(userId);
        if (executorUser) {
          executorName = executorUser.username;
        }
      }
    } catch (err) {
      console.error('Error resolving executor details:', err);
    }

    // Only the creator (assigner) can mark a task as COMPLETED.
    const isTaskCreator = task.createdBy.toString() === userId.toString();

    if (normalizedStatus === 'COMPLETED') {
      if (!isTaskCreator) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Only the assigner (creator) of this task can mark it as COMPLETED.',
        });
      }
    }

    if (normalizedStatus === 'UNDER REVIEW') {
      if (!fileAttachment || !fileAttachment.base64) {
        return res.status(400).json({
          success: false,
          message: 'Attachment is required to submit this task for review.',
        });
      }

      task.reviewAttachment = fileAttachment.base64;
      task.reviewAttachmentName = fileAttachment.name;

      if (!task.attachments) {
        task.attachments = [];
      }
      task.attachments.push({
        name: fileAttachment.name,
        file: fileAttachment.base64,
        uploadedBy: userId.toString(),
        uploadedByName: executorName,
        uploadedAt: new Date(),
        step: 'UNDER REVIEW'
      });
    }

    if (!task.workMap) {
      task.workMap = [];
    }
    if (task.workMap.length === 0) {
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: task.assignedByName || 'Creator',
        assignedAt: task.createdAt || new Date(),
        action: 'ASSIGNED'
      });
    }

    if (normalizedStatus === 'REASSIGNED') {
      const { assignedTo, assignedToLabel, reassignedCategory, reassignedSubCategory, endDate, endTime } = req.body;
      if (!assignedTo) {
        return res.status(400).json({
          success: false,
          message: 'assignedTo is required when updating status to REASSIGNED',
        });
      }

      const resolvedAssignedTo = await resolveAssigneeId(assignedTo);
      const resolvedAssignedToLabel = resolvedAssignedTo !== assignedTo ? assignedTo : (assignedToLabel || assignedTo);

      task.assignedTo = resolvedAssignedTo;
      task.assignedToLabel = resolvedAssignedToLabel;

      if (reassignedCategory) {
        task.category = reassignedCategory;
        task.reassignedCategory = reassignedCategory;
        task.title = reassignedCategory;
      }
      if (reassignedSubCategory) {
        task.subCategory = reassignedSubCategory;
        task.reassignedSubCategory = reassignedSubCategory;
      }
      if (endDate) {
        task.endDate = endDate;
      }
      if (endTime) {
        task.endTime = endTime;
      }

      task.workMap.push({
        assignedTo: resolvedAssignedTo,
        assignedToLabel: resolvedAssignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: 'REASSIGNED'
      });

      if (fileAttachment && fileAttachment.base64) {
        if (!task.attachments) {
          task.attachments = [];
        }
        task.attachments.push({
          name: fileAttachment.name,
          file: fileAttachment.base64,
          uploadedBy: userId.toString(),
          uploadedByName: executorName,
          uploadedAt: new Date(),
          step: 'REASSIGNED'
        });
      }

      if (!task.taskTitles) {
        task.taskTitles = [];
      }
      task.taskTitles.push({
        userId: userId.toString(),
        role: userRole || 'user',
        title: reassignedCategory ? reassignedCategory.trim() : task.title
      });

      // Update approval chain on status reassign: Reassigner -> Previous Approvers -> Creator
      const reassignerId = userId.toString();
      const creatorId = task.createdBy.toString();
      let resolvedApprovalChain = [reassignerId];
      if (task.approvalChain && task.approvalChain.length > 0) {
        task.approvalChain.forEach(id => {
          if (id !== reassignerId && !resolvedApprovalChain.includes(id)) {
            resolvedApprovalChain.push(id);
          }
        });
      }
      if (!resolvedApprovalChain.includes(creatorId)) {
        resolvedApprovalChain.push(creatorId);
      }

      task.approvalChain = resolvedApprovalChain;
      task.approvalChainIndex = 0;

      // Update store details
      try {
        const targetAdmin = await Admin.findById(resolvedAssignedTo).populate('branches');
        let targetStoreName = '';
        let targetStoreCode = '';
        if (targetAdmin) {
          const targetBranch = targetAdmin.branches?.[0];
          targetStoreName = targetBranch?.workingBranch || '';
          targetStoreCode = targetBranch?.locCode ? `Z-${targetBranch.locCode}` : '';
        } else {
          const targetUser = await User.findById(resolvedAssignedTo);
          if (targetUser) {
            targetStoreName = targetUser.workingBranch || '';
            targetStoreCode = targetUser.locCode ? (Array.isArray(targetUser.locCode) ? `Z-${targetUser.locCode[0]}` : `Z-${targetUser.locCode}`) : '';
          }
        }
        if (targetStoreName || targetStoreCode) {
          task.storeName = targetStoreName;
          task.storeCode = targetStoreCode;
        }
      } catch (err) {
        console.error('Error updating task store on status-reassign:', err);
      }
    } else if (normalizedStatus === 'COMPLETED') {
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: 'COMPLETED'
      });
    } else if (normalizedStatus === 'UNDER REVIEW' || normalizedStatus === 'PENDING REVIEW') {
      // Save proofs to attachments
      if (fileAttachment && fileAttachment.base64) {
        task.reviewAttachment = fileAttachment.base64;
        task.reviewAttachmentName = fileAttachment.name;
        if (!task.attachments) {
          task.attachments = [];
        }
        task.attachments.push({
          name: fileAttachment.name,
          file: fileAttachment.base64,
          uploadedBy: userId.toString(),
          uploadedByName: executorName,
          uploadedAt: new Date(),
          step: normalizedStatus
        });
      }

      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: normalizedStatus
      });
    } else if (normalizedStatus === 'IN PROGRESS') {
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: 'IN PROGRESS'
      });
    } else if (normalizedStatus === 'ON HOLD') {
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: 'ON HOLD'
      });
    } else if (normalizedStatus === 'EXTENSION REQUESTED') {
      const { requestedExtensionDate } = req.body;
      if (!requestedExtensionDate) {
        return res.status(400).json({
          success: false,
          message: 'requestedExtensionDate is required when status is EXTENSION REQUESTED',
        });
      }
      task.previousStatus = task.status;
      task.requestedExtensionDate = requestedExtensionDate;
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: 'EXTENSION REQUESTED',
        details: requestedExtensionDate
      });
    }

    task.status = normalizedStatus;
    if (normalizedStatus === 'PENDING REVIEW') {
      let targetApprover = task.createdBy;
      task.approvalChainIndex = 0;
      if (task.approvalChain && task.approvalChain.length > 0) {
        targetApprover = task.approvalChain[0];
      }
    }
    await task.save();

    // Trigger status-change notifications to relevant party (creator, assignee, or active approver)
    const statusRecipientsSet = new Set();
    if (task.assignedTo && task.assignedTo.toString() !== userId.toString()) {
      statusRecipientsSet.add(task.assignedTo.toString());
    }
    if (task.createdBy && task.createdBy.toString() !== userId.toString()) {
      statusRecipientsSet.add(task.createdBy.toString());
    }
    if (normalizedStatus === 'PENDING REVIEW' && task.approvalChain && task.approvalChain.length > 0) {
      const activeApprover = task.approvalChain[task.approvalChainIndex || 0];
      if (activeApprover && activeApprover.toString() !== userId.toString()) {
        statusRecipientsSet.add(activeApprover.toString());
      }
    }
    const statusNotifyUserIds = Array.from(statusRecipientsSet);

    if (statusNotifyUserIds.length > 0) {
      let notifTitle = `Task Status: ${normalizedStatus}`;
      let notifBody = `Task "${task.title}" status was updated to ${normalizedStatus} by ${executorName}`;

      if (normalizedStatus === 'REASSIGNED') {
        notifTitle = 'Task Reassigned';
        notifBody = `Task "${task.title}" has been reassigned to you by ${executorName}`;
      } else if (normalizedStatus === 'UNDER REVIEW') {
        notifTitle = 'Task Submitted for Review';
        notifBody = `Task "${task.title}" has been submitted for review by ${executorName}`;
      } else if (normalizedStatus === 'PENDING REVIEW') {
        notifTitle = 'Task Pending Approval';
        notifBody = `Task "${task.title}" has been submitted for approval by ${executorName}`;
      } else if (normalizedStatus === 'EXTENSION REQUESTED') {
        const extDate = req.body?.requestedExtensionDate || task.requestedExtensionDate || '';
        notifTitle = 'Task Extension Requested';
        notifBody = `Task "${task.title}" has an extension requested ${extDate ? `to ${extDate} ` : ''}by ${executorName}`;
      } else if (normalizedStatus === 'COMPLETED') {
        notifTitle = 'Task Completed';
        notifBody = `Task "${task.title}" has been marked as COMPLETED by ${executorName}`;
      } else if (normalizedStatus === 'IN PROGRESS') {
        notifTitle = 'Task In Progress';
        notifBody = `Task "${task.title}" is now IN PROGRESS by ${executorName}`;
      } else if (normalizedStatus === 'ON HOLD') {
        notifTitle = 'Task Put On Hold';
        notifBody = `Task "${task.title}" was put ON HOLD by ${executorName}`;
      } else if (normalizedStatus === 'OVERDUE') {
        notifTitle = 'Task Overdue';
        notifBody = `Task "${task.title}" status changed to OVERDUE by ${executorName}`;
      }

      await sendNotification({
        title: notifTitle,
        body: notifBody,
        userIds: statusNotifyUserIds,
        senderName: executorName,
        category: 'Task'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      data: mapTaskForClient(task, null, req.admin),
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update task status',
      error: error.message,
    });
  }
};

export const reassignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, assignedToLabel, category, subCategory, fileAttachment, endDate, endTime } = req.body;
    if (!assignedTo) {
      return res.status(400).json({ success: false, message: 'assignedTo is required' });
    }
    if (!fileAttachment || !fileAttachment.base64) {
      return res.status(400).json({ success: false, message: 'Task completion attachment is required for reassignment' });
    }

    const resolvedAssignedTo = await resolveAssigneeId(assignedTo);
    const resolvedAssignedToLabel = resolvedAssignedTo !== assignedTo ? assignedTo : (assignedToLabel || assignedTo);

    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const userId = req.admin.userId;
    const userRole = req.admin.role;
    const isUserAdmin = userRole && userRole !== 'employee' && userRole !== 'user';

    // Verify permissions: only current assignee or admin can reassign
    if (!isUserAdmin) {
      const user = await User.findById(userId);
      const employee = user ? await Employee.findOne({
        $or: [
          { userId: user._id },
          { employeeId: { $regex: `^${user.empID}$`, $options: 'i' } }
        ]
      }) : null;
      const assignedIds = [userId.toString()];
      if (employee) {
        assignedIds.push(employee._id.toString());
      }
      if (!assignedIds.includes(task.assignedTo)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to reassign this task',
        });
      }
    }

    // Resolve reassigner's display name
    let reassignerName = 'Unknown';
    try {
      const reassignerAdmin = await Admin.findById(userId);
      if (reassignerAdmin) {
        reassignerName = reassignerAdmin.name;
      } else {
        const reassignerUser = await User.findById(userId);
        if (reassignerUser) {
          reassignerName = reassignerUser.username;
        }
      }
    } catch (err) {
      console.error('Error resolving reassigner details:', err);
    }

    if (!task.workMap) {
      task.workMap = [];
    }
    if (task.workMap.length === 0) {
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: task.assignedByName || 'Creator',
        assignedAt: task.createdAt || new Date(),
        action: 'ASSIGNED'
      });
    }

    task.assignedTo = resolvedAssignedTo;
    task.assignedToLabel = resolvedAssignedToLabel;
    task.status = 'REASSIGNED'; // Reset status to REASSIGNED

    if (category) {
      task.category = category;
      task.reassignedCategory = category;
      task.title = category; // Dynamically set category as the title
    }
    if (subCategory) {
      task.subCategory = subCategory;
      task.reassignedSubCategory = subCategory;
    }
    if (endDate) {
      task.endDate = endDate;
    }
    if (endTime) {
      task.endTime = endTime;
    }

    if (!task.taskTitles) {
      task.taskTitles = [];
    }
    
    // Store title for this reassigner
    task.taskTitles.push({
      userId: userId.toString(),
      role: userRole || 'user',
      title: category ? category.trim() : task.title
    });

    // Approval chain for reassigned task completion: Reassigner -> Previous Approvers -> Creator
    const reassignerId = userId.toString();
    const creatorId = task.createdBy.toString();
    let resolvedApprovalChain = [reassignerId];
    if (task.approvalChain && task.approvalChain.length > 0) {
      task.approvalChain.forEach(id => {
        if (id !== reassignerId && !resolvedApprovalChain.includes(id)) {
          resolvedApprovalChain.push(id);
        }
      });
    }
    if (!resolvedApprovalChain.includes(creatorId)) {
      resolvedApprovalChain.push(creatorId);
    }

    task.approvalChain = resolvedApprovalChain;
    task.approvalChainIndex = 0;

    task.workMap.push({
      assignedTo: resolvedAssignedTo,
      assignedToLabel: resolvedAssignedToLabel,
      assignedBy: reassignerName,
      assignedAt: new Date(),
      action: 'REASSIGNED'
    });

    if (fileAttachment && fileAttachment.base64) {
      if (!task.attachments) {
        task.attachments = [];
      }
      task.attachments.push({
        name: fileAttachment.name,
        file: fileAttachment.base64,
        uploadedBy: userId.toString(),
        uploadedByName: reassignerName,
        uploadedAt: new Date(),
        step: 'REASSIGNED'
      });
    }

    // Update storeName and storeCode to the new assignee's store dynamically
    try {
      const targetAdmin = await Admin.findById(resolvedAssignedTo).populate('branches');
      let targetStoreName = '';
      let targetStoreCode = '';
      if (targetAdmin) {
        if (['super_admin', 'admin', 'hr_admin'].includes(targetAdmin.role)) {
          targetStoreName = 'Office';
          targetStoreCode = '';
        } else {
          const targetBranch = targetAdmin.branches?.[0];
          targetStoreName = targetBranch?.workingBranch || '';
          targetStoreCode = targetBranch?.locCode ? `Z-${targetBranch.locCode}` : '';
        }
      } else {
        const targetUser = await User.findById(resolvedAssignedTo);
        if (targetUser) {
          targetStoreName = targetUser.workingBranch || '';
          targetStoreCode = targetUser.locCode ? (Array.isArray(targetUser.locCode) ? `Z-${targetUser.locCode[0]}` : `Z-${targetUser.locCode}`) : '';
        }
      }
      if (targetStoreName || targetStoreCode) {
        task.storeName = targetStoreName;
        task.storeCode = targetStoreCode;
      }
    } catch (err) {
      console.error('Error updating task store on reassign:', err);
    }

    await task.save();

    // Send notification to the new assignee
    await sendNotification({
      title: 'Task Reassigned',
      body: `Task "${task.title}" has been reassigned to you by ${reassignerName}`,
      userIds: [task.assignedTo],
      senderName: reassignerName,
      category: 'Task'
    });

    return res.status(200).json({
      success: true,
      message: 'Task reassigned successfully',
      data: mapTaskForClient(task, null, req.admin),
    });
  } catch (error) {
    console.error('Error reassigning task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reassign task',
      error: error.message,
    });
  }
};

export const approveTaskStep = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' or 'REJECT'
    const userId = req.admin.userId;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be APPROVE or REJECT' });
    }

    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.status !== 'PENDING REVIEW') {
      return res.status(400).json({ success: false, message: 'Task is not pending approval review.' });
    }

    // Determine current expected approver from the chain
    let expectedApprover = task.createdBy.toString();
    const hasChain = task.approvalChain && task.approvalChain.length > 0;
    if (hasChain) {
      expectedApprover = task.approvalChain[task.approvalChainIndex];
    }

    const callerAllowedIds = await resolveAllAssignedIds(null, null, userId);
    const isAuthorized = 
      userId.toString() === String(expectedApprover) ||
      callerAllowedIds.includes(String(expectedApprover)) ||
      task.createdBy.toString() === userId.toString() ||
      ['super_admin', 'admin', 'hr_admin'].includes(req.admin.role);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not the authorized approver for the current step.',
      });
    }

    // Resolve executor's display name
    let executorName = 'Approver';
    const executorAdmin = await Admin.findById(userId);
    if (executorAdmin) {
      executorName = executorAdmin.name;
    } else {
      const executorUser = await User.findById(userId);
      if (executorUser) {
        executorName = executorUser.username;
      }
    }

    if (action === 'REJECT') {
      // Send task back to IN PROGRESS
      task.status = 'IN PROGRESS';
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: 'IN PROGRESS',
        details: 'Review Rejected - Sent back to IN PROGRESS'
      });
      await task.save();

      // Notify Assignee of rejection
      await sendNotification({
        title: 'Task Submission Rejected',
        body: `Your submission for task "${task.title}" has been rejected by ${executorName}`,
        userIds: [task.assignedTo],
        senderName: executorName,
        category: 'Task'
      });

      return res.status(200).json({
        success: true,
        message: 'Task submission rejected and returned to IN PROGRESS.',
        data: mapTaskForClient(task, null, req.admin)
      });
    }

    // action === 'APPROVE'
    const { fileAttachment } = req.body;
    if (fileAttachment && fileAttachment.base64) {
      if (!task.attachments) {
        task.attachments = [];
      }
      task.attachments.push({
        name: fileAttachment.name,
        file: fileAttachment.base64,
        uploadedBy: userId.toString(),
        uploadedByName: executorName,
        uploadedAt: new Date(),
        step: 'UNDER REVIEW'
      });
    }

    if (hasChain && task.approvalChainIndex < task.approvalChain.length - 1) {
      // Advance to next step in the chain
      task.approvalChainIndex += 1;
      const nextApprover = task.approvalChain[task.approvalChainIndex];
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: 'PENDING REVIEW',
        details: fileAttachment?.name 
          ? `Approved with proof (${fileAttachment.name}) by ${executorName}. Forwarded to next approval stage.`
          : `Approved by ${executorName}. Sent to next approval stage.`
      });
      await task.save();

      // Notify next approver
      await sendNotification({
        title: 'Task Pending Approval',
        body: `Task "${task.title}" has been approved by ${executorName} and requires your review.`,
        userIds: [nextApprover],
        senderName: executorName,
        category: 'Task'
      });

      return res.status(200).json({
        success: true,
        message: 'Approved step successfully. Forwarded to the next level.',
        data: mapTaskForClient(task, null, req.admin)
      });
    } else {
      // Final approval in the chain -> Complete task
      task.status = 'COMPLETED';
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: 'COMPLETED',
        details: 'Approved completely and finalized.'
      });
      await task.save();

      // Notify assignee of completion
      await sendNotification({
        title: 'Task Completed',
        body: `Great job! Your task "${task.title}" has been fully approved and completed.`,
        userIds: [task.assignedTo],
        senderName: executorName,
        category: 'Task'
      });

      return res.status(200).json({
        success: true,
        message: 'Task fully approved and completed.',
        data: mapTaskForClient(task, null, req.admin)
      });
    }
  } catch (error) {
    console.error('Error in approveTaskStep:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process approval step',
      error: error.message
    });
  }
};

export const getTaskAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task || !task.attachment) {
      return res.status(404).send('Attachment not found');
    }

    const attachmentVal = normalizeAttachmentToDataUri(task.attachment);

    if (attachmentVal.startsWith('data:')) {
      const matches = attachmentVal.match(/^data:([^;]+);base64,(.*)$/i);
      if (!matches) {
        return res.status(400).send('Invalid data URI format');
      }
      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${task.attachmentName || 'attachment'}"`);
      return res.send(buffer);
    } else {
      // Legacy disk file fallback
      const uploadDir = path.join(__dirname, '..');
      const filePath = path.join(uploadDir, task.attachment);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      } else {
        return res.status(404).send('File not found on server');
      }
    }
  } catch (error) {
    console.error('Error fetching task attachment:', error);
    return res.status(500).send('Failed to fetch task attachment');
  }
};

export const getTaskReviewAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task || !task.reviewAttachment) {
      return res.status(404).send('Review proof not found');
    }

    const reviewAttachmentVal = normalizeAttachmentToDataUri(task.reviewAttachment);

    if (reviewAttachmentVal.startsWith('data:')) {
      const matches = reviewAttachmentVal.match(/^data:([^;]+);base64,(.*)$/i);
      if (!matches) {
        return res.status(400).send('Invalid data URI format');
      }
      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${task.reviewAttachmentName || 'review-proof'}"`);
      return res.send(buffer);
    } else {
      // Legacy disk file fallback
      const uploadDir = path.join(__dirname, '..');
      const filePath = path.join(uploadDir, task.reviewAttachment);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      } else {
        return res.status(404).send('File not found on server');
      }
    }
  } catch (error) {
    console.error('Error fetching task review attachment:', error);
    return res.status(500).send('Failed to fetch task review attachment');
  }
};

export const getTaskAttachmentByIndex = async (req, res) => {
  try {
    const { id, index } = req.params;
    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task || !task.attachments || !task.attachments[index]) {
      return res.status(404).send('Attachment not found');
    }

    const att = task.attachments[index];
    const attachmentVal = normalizeAttachmentToDataUri(att.file);

    if (attachmentVal.startsWith('data:')) {
      const matches = attachmentVal.match(/^data:([^;]+);base64,(.*)$/i);
      if (!matches) {
        return res.status(400).send('Invalid data URI format');
      }
      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${att.name || 'attachment'}"`);
      return res.send(buffer);
    } else {
      return res.status(400).send('Invalid attachment format');
    }
  } catch (error) {
    console.error('Error fetching task attachment by index:', error);
    return res.status(500).send('Failed to fetch task attachment');
  }
};

// ─── REQUEST EXTENSION (called by mobile assignee) ───────────────────────────
export const requestExtension = async (req, res) => {
  try {
    const { id } = req.params;
    const { requestedExtensionDate } = req.body;

    if (!requestedExtensionDate) {
      return res.status(400).json({ success: false, message: 'requestedExtensionDate is required (YYYY-MM-DD)' });
    }

    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.status === 'EXTENSION REQUESTED') {
      return res.status(400).json({ success: false, message: 'An extension request is already pending for this task' });
    }

    if (task.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Cannot request extension for a completed task' });
    }

    // Resolve caller display name
    const userId = req.admin.userId;
    let executorName = 'Unknown';
    try {
      const execAdmin = await Admin.findById(userId);
      executorName = execAdmin ? execAdmin.name : (await User.findById(userId))?.username || 'Unknown';
    } catch (_) {}

    // Normalize date — strip time component if present
    const normalizedDate = requestedExtensionDate.includes('T')
      ? requestedExtensionDate.split('T')[0]
      : requestedExtensionDate;

    task.previousStatus = task.status;
    task.requestedExtensionDate = normalizedDate;
    task.status = 'EXTENSION REQUESTED';
    task.workMap.push({
      assignedTo: task.assignedTo,
      assignedToLabel: task.assignedToLabel,
      assignedBy: executorName,
      assignedAt: new Date(),
      action: 'EXTENSION REQUESTED',
      details: normalizedDate,
    });

    await task.save();

    // Notify the task creator
    await sendNotification({
      title: 'Task Extension Requested',
      body: `"${task.title}" — ${executorName} is requesting a deadline extension to ${normalizedDate}`,
      userIds: [task.createdBy],
      senderName: executorName,
      category: 'Task',
    });

    return res.status(200).json({
      success: true,
      message: 'Extension request submitted successfully',
      data: mapTaskForClient(task, null, req.admin),
    });
  } catch (error) {
    console.error('Error requesting task extension:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit extension request', error: error.message });
  }
};

export const resolveExtensionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, endDate } = req.body; // 'APPROVE' or 'REJECT' and optional endDate

    if (!action || !['APPROVE', 'REJECT'].includes(action.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVE or REJECT' });
    }

    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Task MUST be in EXTENSION REQUESTED status — no exceptions
    if (task.status !== 'EXTENSION REQUESTED') {
      return res.status(400).json({ success: false, message: 'Task does not have a pending extension request' });
    }

    // Permissions check: only the creator (assigner) of the task can resolve extension requests
    const userId = req.admin.userId;
    if (task.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the creator of this task can approve or reject extension requests',
      });
    }

    // Resolve executor/creator display name
    let resolverName = 'Unknown';
    try {
      const resolverAdmin = await Admin.findById(userId);
      if (resolverAdmin) {
        resolverName = resolverAdmin.name;
      } else {
        const resolverUser = await User.findById(userId);
        if (resolverUser) {
          resolverName = resolverUser.username;
        }
      }
    } catch (err) {
      console.error('Error resolving executor details:', err);
    }

    const nextStatus = task.status === 'EXTENSION REQUESTED' ? (task.previousStatus || 'IN PROGRESS') : task.status;

    if (action.toUpperCase() === 'APPROVE') {
      let newEndDate = endDate || task.requestedExtensionDate;
      if (!newEndDate) {
        return res.status(400).json({ success: false, message: 'New end date is required to approve extension' });
      }
      if (newEndDate.includes('T')) {
        newEndDate = newEndDate.split('T')[0];
      }
      task.endDate = newEndDate;
      task.status = nextStatus;
      
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: resolverName,
        assignedAt: new Date(),
        action: 'EXTENSION APPROVED',
        details: newEndDate
      });

      task.requestedExtensionDate = '';
      task.previousStatus = '';
    } else {
      task.status = nextStatus;
      
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: resolverName,
        assignedAt: new Date(),
        action: 'EXTENSION REJECTED',
        details: ''
      });

      task.requestedExtensionDate = '';
      task.previousStatus = '';
    }

    await task.save();

    // Trigger notification to the assignee
    await sendNotification({
      title: `Extension Request ${action.toUpperCase() === 'APPROVE' ? 'Approved' : 'Rejected'}`,
      body: `Your extension request for task "${task.title}" has been ${action.toUpperCase() === 'APPROVE' ? 'approved' : 'rejected'} by ${resolverName}`,
      userIds: [task.assignedTo],
      senderName: resolverName,
      category: 'Task'
    });

    return res.status(200).json({
      success: true,
      message: `Extension request ${action.toLowerCase()}d successfully`,
      data: mapTaskForClient(task, null, req.admin),
    });
  } catch (error) {
    console.error('Error resolving extension request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve extension request',
      error: error.message,
    });
  }
};

export const updateTaskDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      category,
      subCategory,
      assignedTo,
      assignedToLabel,
      endDate,
      priority,
      description,
      additionalInfo,
    } = req.body;

    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Permissions check: only task creator can edit task details
    const userId = req.admin.userId;
    if (task.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the creator of this task can edit its details',
      });
    }

    // Resolve editor's name
    let editorName = 'Unknown';
    try {
      const editorAdmin = await Admin.findById(userId);
      if (editorAdmin) {
        editorName = editorAdmin.name;
      } else {
        const editorUser = await User.findById(userId);
        if (editorUser) {
          editorName = editorUser.username;
        }
      }
    } catch (err) {
      console.error('Error resolving editor details:', err);
    }

    if (title) {
      task.title = title;
      task.adminTitle = title;
    }
    if (category) {
      task.category = category;
      task.adminCategory = category;
    }
    if (subCategory) {
      task.subCategory = subCategory;
      task.adminSubCategory = subCategory;
    }

    let assigneeChanged = false;
    let oldAssigneeLabel = task.assignedToLabel || task.assignedTo;
    if (assignedTo && assignedTo !== task.assignedTo) {
      task.assignedTo = assignedTo;
      if (assignedToLabel) task.assignedToLabel = assignedToLabel;
      assigneeChanged = true;
    }

    if (endDate) {
      let trimmedDate = endDate;
      if (trimmedDate.includes('T')) {
        trimmedDate = trimmedDate.split('T')[0];
      }
      task.endDate = trimmedDate;
    }

    if (priority) task.priority = priority;
    if (description !== undefined) task.description = description;
    if (additionalInfo !== undefined) task.additionalInfo = additionalInfo;

    if (assigneeChanged) {
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: editorName,
        assignedAt: new Date(),
        action: 'REASSIGNED',
        details: `Details updated. Reassigned from ${oldAssigneeLabel} to ${task.assignedToLabel}`,
      });
    }

    await task.save();

    // Send notifications for details edit / reassign
    if (assigneeChanged && task.assignedTo) {
      await sendNotification({
        title: 'Task Reassigned',
        body: `Task "${task.title}" has been reassigned to you by ${editorName}`,
        userIds: [task.assignedTo.toString()],
        senderName: editorName,
        category: 'Task'
      });
    } else if (task.assignedTo && task.assignedTo.toString() !== userId.toString()) {
      await sendNotification({
        title: 'Task Details Updated',
        body: `Task "${task.title}" details have been updated by ${editorName}`,
        userIds: [task.assignedTo.toString()],
        senderName: editorName,
        category: 'Task'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task details updated successfully',
      data: mapTaskForClient(task, null, req.admin),
    });
  } catch (error) {
    console.error('Error updating task details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update task details',
      error: error.message,
    });
  }
};

