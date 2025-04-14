// Simple script to test user synchronization
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Step 1: Get the admin user token
async function loginAsAdmin() {
  try {
    const res = await axios.post(`${BASE_URL}/api/login`, {
      username: 'admin',  // assuming admin user exists
      password: 'password123'  // assuming this is the password
    }, {
      withCredentials: true
    });
    
    console.log('Logged in as admin:', res.data);
    return res.headers['set-cookie'][0];  // Get the session cookie
  } catch (error) {
    console.error('Error logging in as admin:', error.response?.data || error.message);
    throw error;
  }
}

// Step 2: List all users
async function listUsers(cookie) {
  try {
    const res = await axios.get(`${BASE_URL}/api/admin/users`, {
      headers: {
        Cookie: cookie
      }
    });
    
    console.log('User list with Firebase status:');
    console.table(res.data.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      providerId: user.providerId,
      providerUid: user.providerUid,
      firebaseStatus: user.firebaseStatus
    })));
    
    return res.data;
  } catch (error) {
    console.error('Error listing users:', error.response?.data || error.message);
    throw error;
  }
}

// Step 3: Check for orphaned users
async function checkOrphanedUsers(cookie) {
  try {
    const res = await axios.post(`${BASE_URL}/api/admin/cleanup-orphaned-users?check=true`, {}, {
      headers: {
        Cookie: cookie
      }
    });
    
    console.log('Orphaned users check result:', res.data);
    
    if (res.data.users && res.data.users.length > 0) {
      console.log('Found orphaned users:');
      console.table(res.data.users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        providerId: user.providerId,
        providerUid: user.providerUid
      })));
    } else {
      console.log('No orphaned users found');
    }
    
    return res.data;
  } catch (error) {
    console.error('Error checking orphaned users:', error.response?.data || error.message);
    throw error;
  }
}

// Step 4: Clean up orphaned users
async function cleanupOrphanedUsers(cookie) {
  try {
    const res = await axios.post(`${BASE_URL}/api/admin/cleanup-orphaned-users`, {}, {
      headers: {
        Cookie: cookie
      }
    });
    
    console.log('Cleanup result:', res.data);
    return res.data;
  } catch (error) {
    console.error('Error cleaning up orphaned users:', error.response?.data || error.message);
    throw error;
  }
}

// Main function to run the test
async function runTest() {
  try {
    const cookie = await loginAsAdmin();
    console.log('Step 1: Logged in as admin');
    
    await listUsers(cookie);
    console.log('Step 2: Listed all users with their Firebase status');
    
    await checkOrphanedUsers(cookie);
    console.log('Step 3: Checked for orphaned users');
    
    const confirmCleanup = process.argv.includes('--cleanup');
    if (confirmCleanup) {
      await cleanupOrphanedUsers(cookie);
      console.log('Step 4: Cleaned up orphaned users');
      
      // Verify cleanup was successful
      await listUsers(cookie);
      console.log('Step 5: Verified user list after cleanup');
    } else {
      console.log('Skipping cleanup. Run with --cleanup to perform actual deletion.');
    }
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTest();