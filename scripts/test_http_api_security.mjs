/**
 * End-to-End HTTP API Integration Test for Password Security Endpoints
 */

import http from 'node:http';
import { handleAuthApi } from '../server/authHandler.js';
import { serverStorage } from '../server/storage.js';

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ HTTP TEST FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✅ ${msg}`);
}

async function startServer() {
  const server = http.createServer((req, res) => {
    handleAuthApi(req, res);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function apiRequest(baseUrl, path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {}

  return { status: res.status, headers: res.headers, body: json, text };
}

async function run() {
  console.log('\n🌐 TESTING SERVER AUTH & SECURITY HTTP ENDPOINTS\n' + '='.repeat(60));

  const { server, baseUrl } = await startServer();

  try {
    // 1. Reset lockouts for clean test
    serverStorage.resetFailedLogins('admin@dineflow.pk');
    serverStorage.resetFailedLogins('owner@burgersmoke.com');
    serverStorage.resetFailedLogins('127.0.0.1');

    // 2. Test Admin Login
    console.log('\n[1] Admin Login via /api/auth/login');
    const adminLogin = await apiRequest(baseUrl, '/api/auth/login', 'POST', {
      email: 'admin@dineflow.pk',
      password: 'AdminPass123!',
    });
    assert(adminLogin.status === 200, 'Admin login returns 200 OK');
    assert(Boolean(adminLogin.body.sessionToken), 'Returns valid sessionToken');
    assert(adminLogin.body.user.role === 'admin', 'User has admin role');
    assert(adminLogin.body.user.password === undefined, 'No password in login response');
    assert(adminLogin.body.user.password_encrypted === undefined, 'No password_encrypted in login response');
    assert(adminLogin.body.user.password_masked === '••••••••••••', 'Masked password provided');

    const adminToken = adminLogin.body.sessionToken;

    // 3. Test Owner Login
    console.log('\n[2] Owner Login via /api/auth/login');
    const ownerLogin = await apiRequest(baseUrl, '/api/auth/login', 'POST', {
      email: 'owner@burgersmoke.com',
      password: 'OwnerPass123!',
    });
    assert(ownerLogin.status === 200, 'Owner login returns 200 OK');
    assert(ownerLogin.body.user.role === 'owner', 'User has owner role');
    const ownerToken = ownerLogin.body.sessionToken;

    // 4. Test Master Admin View Password
    console.log('\n[3] Master Admin Password View via /api/admin/passwords/view');
    // 4a. Without token -> 401
    const noAuth = await apiRequest(baseUrl, '/api/admin/passwords/view', 'POST', { targetUserId: 'user-owner-01' });
    assert(noAuth.status === 401, 'Unauthorized request rejected with 401');

    // 4b. With Owner token -> 403 Forbidden
    const ownerForbidden = await apiRequest(
      baseUrl,
      '/api/admin/passwords/view',
      'POST',
      { targetUserId: 'user-owner-01' },
      ownerToken
    );
    assert(ownerForbidden.status === 403, 'Non-admin request rejected with 403 Forbidden');

    // 4c. With Master Admin token -> 200 OK
    const adminView = await apiRequest(
      baseUrl,
      '/api/admin/passwords/view',
      'POST',
      { targetUserId: 'user-owner-01' },
      adminToken
    );
    assert(adminView.status === 200, 'Master admin successfully decrypts password');
    assert(adminView.body.password === 'OwnerPass123!', 'Decrypted password correctly returned to Master Admin');
    assert(adminView.body.autoHideSeconds === 15, 'Returns 15-second autoHide guidance');

    // 5. Test Audit Log Entry Created for Password View
    console.log('\n[4] Verify Security Audit Log Trail');
    const auditRes = await apiRequest(baseUrl, '/api/admin/audit-logs', 'GET', null, adminToken);
    assert(auditRes.status === 200, 'Fetch audit logs returns 200 OK');
    const viewLog = auditRes.body.logs.find(
      (l) => l.action === 'VIEW_PASSWORD' && l.target_user_id === 'user-owner-01'
    );
    assert(Boolean(viewLog), 'VIEW_PASSWORD audit log entry exists');
    assert(viewLog.admin_email === 'admin@dineflow.pk', 'Audit records master admin email');
    assert(Boolean(viewLog.ip_address), 'Audit records IP address');

    // 6. Test Master Admin Reset Password
    console.log('\n[5] Master Admin Reset Password via /api/admin/passwords/reset');
    const resetRes = await apiRequest(
      baseUrl,
      '/api/admin/passwords/reset',
      'POST',
      { targetUserId: 'user-owner-01' },
      adminToken
    );
    assert(resetRes.status === 200, 'Reset password returns 200 OK');
    assert(Boolean(resetRes.body.generatedPassword), 'Generates strong random password');
    assert(resetRes.body.must_change_password === true, 'Sets must_change_password to true');

    const tempPassword = resetRes.body.generatedPassword;

    // 7. Test Old Owner Session is Invalidated
    console.log('\n[6] Verify Old Session Invalidation');
    const oldSessionAttempt = await apiRequest(
      baseUrl,
      '/api/auth/change-password',
      'POST',
      { currentPassword: 'OwnerPass123!', newPassword: 'BrandNewOwnerPass999!' },
      ownerToken
    );
    assert(oldSessionAttempt.status === 401, 'Old owner session is strictly rejected with 401');

    // 8. Test Owner Login with Reset Password -> must_change_password = true
    console.log('\n[7] Owner Login with Temporary Password');
    const tempLogin = await apiRequest(baseUrl, '/api/auth/login', 'POST', {
      email: 'owner@burgersmoke.com',
      password: tempPassword,
    });
    assert(tempLogin.status === 200, 'Login with generated temporary password succeeds');
    assert(tempLogin.body.must_change_password === true, 'Login flag must_change_password is true');

    const tempToken = tempLogin.body.sessionToken;

    // 9. Owner Changes Password
    console.log('\n[8] Owner Changes Password via /api/auth/change-password');
    const permanentPassword = 'PermanentOwner2026!#$';
    const changeRes = await apiRequest(
      baseUrl,
      '/api/auth/change-password',
      'POST',
      { currentPassword: tempPassword, newPassword: permanentPassword },
      tempToken
    );
    assert(changeRes.status === 200, 'Owner successfully changes password');
    assert(Boolean(changeRes.body.sessionToken), 'Returns fresh session token');

    // 10. Master Admin Views the newly changed password
    console.log('\n[9] Master Admin Views Newly Changed Encrypted Password');
    const adminViewNew = await apiRequest(
      baseUrl,
      '/api/admin/passwords/view',
      'POST',
      { targetUserId: 'user-owner-01' },
      adminToken
    );
    assert(adminViewNew.status === 200, 'Master admin views updated password');
    assert(
      adminViewNew.body.password === permanentPassword,
      'Master admin can view the newly set password'
    );

    // Restore owner password for subsequent consistency
    await apiRequest(
      baseUrl,
      '/api/admin/passwords/reset',
      'POST',
      { targetUserId: 'user-owner-01', manualPassword: 'OwnerPass123!' },
      adminToken
    );

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL HTTP API SECURITY INTEGRATION TESTS PASSED!\n');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
