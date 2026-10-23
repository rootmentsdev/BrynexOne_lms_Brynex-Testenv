import mongoose from 'mongoose';
import Notification from '../model/Notification.js';
import User from '../model/User.js';
import Admin from '../model/Admin.js';
import { sendPushNotification } from '../lib/firebaseAdmin.js';

/**
 * Utility to save a notification to the database and send push notifications via FCM.
 * 
 * @param {Object} params
 * @param {string} params.title - Title of the notification
 * @param {string} params.body - Detailed message body of the notification
 * @param {string[]} [params.userIds] - Targeted user/employee ObjectIds
 * @param {string[]} [params.roles] - Targeted designation/role strings
 * @param {string[]} [params.branches] - Targeted store/location codes
 * @param {string} [params.senderName] - Name of the admin performing the action (saved in useradmin field)
 * @param {string} [params.category] - Category of notification (e.g. 'Task', 'Training', 'General')
 */
export const sendNotification = async ({
  title,
  body,
  userIds = [],
  roles = [],
  branches = [],
  senderName = 'System',
  category = 'General'
}) => {
  try {
    // 1. Sanitize userIds to only valid ObjectIds for the Notification.user Schema
    const validUserObjectIds = (Array.isArray(userIds) ? userIds : [userIds])
      .filter(id => id && mongoose.Types.ObjectId.isValid(String(id)))
      .map(id => new mongoose.Types.ObjectId(String(id)));

    // Save notification to database first
    const notification = await Notification.create({
      title,
      body,
      user: validUserObjectIds,
      Role: roles,
      branch: branches,
      useradmin: senderName,
      category
    });

    // 2. Resolve FCM tokens
    const fcmTokensSet = new Set();

    // 2a. Direct UserIds
    if (userIds && userIds.length > 0) {
      const users = await User.find({ _id: { $in: userIds }, fcmToken: { $exists: true, $ne: '' } }, 'fcmToken');
      const admins = await Admin.find({ _id: { $in: userIds }, fcmToken: { $exists: true, $ne: '' } }, 'fcmToken');
      users.forEach(u => fcmTokensSet.add(u.fcmToken));
      admins.forEach(a => fcmTokensSet.add(a.fcmToken));
    }

    // 2b. Roles/Designations
    if (roles && roles.length > 0) {
      const users = await User.find({ designation: { $in: roles }, fcmToken: { $exists: true, $ne: '' } }, 'fcmToken');
      const admins = await Admin.find({ role: { $in: roles }, fcmToken: { $exists: true, $ne: '' } }, 'fcmToken');
      users.forEach(u => fcmTokensSet.add(u.fcmToken));
      admins.forEach(a => fcmTokensSet.add(a.fcmToken));
    }

    // 2c. Branches (match locCode or workingBranch)
    if (branches && branches.length > 0) {
      const users = await User.find({
        $or: [
          { locCode: { $in: branches } },
          { workingBranch: { $in: branches } }
        ],
        fcmToken: { $exists: true, $ne: '' }
      }, 'fcmToken');
      users.forEach(u => fcmTokensSet.add(u.fcmToken));
    }

    // 3. Trigger Firebase Admin SDK Push Notifications in background
    const tokens = Array.from(fcmTokensSet);
    if (tokens.length > 0) {
      console.log(`[Push Notification] Attempting to send notifications to ${tokens.length} target devices.`);
      Promise.all(
        tokens.map(token => 
          sendPushNotification(token, {
            title: title || 'Notification',
            body: body || '',
            data: { category, senderName }
          })
        )
      ).catch(err => {
        console.error('[Push Notification] Error sending batch push notifications:', err);
      });
    }

    return notification;
  } catch (err) {
    console.error('Error creating notification / sending push:', err);
  }
};
