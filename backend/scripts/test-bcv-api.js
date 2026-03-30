#!/usr/bin/env node
/**
 * BCV Sync API Test Script
 * Tests the exchange-rates BCV sync endpoints
 *
 * Usage: node test-bcv-api.js [command]
 * Commands:
 *   current-rate [code]  - Get current rate (default: VES)
 *   sync-status [code]   - Get sync status (default: VES)
 *   sync [code]          - Trigger manual sync (requires auth)
 *   auto-sync [code]     - Toggle auto-sync (requires auth)
 *   test-all             - Run all tests
 */

const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:3001';
const AUTH_TOKEN = process.env.AUTH_TOKEN; // Optional, for protected endpoints

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function testCurrentRate(currencyCode = 'VES') {
  log(`\n📊 Testing GET /exchange-rates/current-rate/${currencyCode}`, 'blue');

  try {
    const response = await axios.get(`${API_BASE}/exchange-rates/current-rate/${currencyCode}`, {
      timeout: 30000,
      headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {},
    });

    const data = response.data;

    if (data.error) {
      log(`❌ Error: ${data.error}`, 'red');
      return false;
    }

    log(`✅ Current Rate Result:`, 'green');
    log(`   Rate: ${data.rate} ${currencyCode}/USD`);
    log(`   Source: ${data.source}`);
    log(`   Date: ${data.date}`);
    log(`   Confidence: ${data.confidence}`);

    // Validate rate is reasonable for VES (typically 20-200)
    if (data.rate < 1 || data.rate > 1000) {
      log(`⚠️ Warning: Rate ${data.rate} seems unusual`, 'yellow');
    }

    return true;
  } catch (error) {
    log(`❌ Failed: ${error.message}`, 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Data: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

async function testSyncStatus(currencyCode = 'VES') {
  log(`\n📋 Testing GET /exchange-rates/sync-status/${currencyCode}`, 'blue');

  try {
    const response = await axios.get(`${API_BASE}/exchange-rates/sync-status/${currencyCode}`, {
      timeout: 10000,
      headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {},
    });

    const data = response.data;

    if (data.error) {
      log(`❌ Error: ${data.error}`, 'red');
      return false;
    }

    log(`✅ Sync Status Result:`, 'green');
    log(`   Currency: ${data.currencyCode}`);
    log(`   Auto Sync: ${data.autoSync ? 'Enabled' : 'Disabled'}`);
    log(`   Last Sync: ${data.lastSyncAt || 'Never'}`);
    log(`   Sync Source: ${data.syncSource || 'N/A'}`);
    log(`   Sync Attempts: ${data.syncAttempts}`);
    log(`   Is Stale: ${data.isStale ? 'Yes ⚠️' : 'No ✅'}`);

    if (data.syncError) {
      log(`   ⚠️ Last Error: ${data.syncError}`, 'yellow');
    }

    return true;
  } catch (error) {
    log(`❌ Failed: ${error.message}`, 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
    }
    return false;
  }
}

async function testManualSync(currencyCode = 'VES') {
  log(`\n🔄 Testing POST /exchange-rates/sync/${currencyCode}`, 'blue');
  log(`   (Requires SUPERADMIN auth)`, 'yellow');

  if (!AUTH_TOKEN) {
    log(`⚠️ Skipping: No AUTH_TOKEN provided`, 'yellow');
    log(`   Set AUTH_TOKEN env variable to test protected endpoints`, 'yellow');
    return null;
  }

  try {
    const response = await axios.post(
      `${API_BASE}/exchange-rates/sync/${currencyCode}`,
      {},
      {
        timeout: 60000,
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      }
    );

    const data = response.data;

    if (data.error) {
      log(`❌ Error: ${data.error}`, 'red');
      return false;
    }

    log(`✅ Manual Sync Result:`, 'green');
    log(`   Success: ${data.success}`);
    log(`   Rate: ${data.rate}`);
    log(`   Source: ${data.source}`);
    log(`   Date: ${data.date}`);
    log(`   Confidence: ${data.confidence}`);

    return true;
  } catch (error) {
    log(`❌ Failed: ${error.message}`, 'red');
    if (error.response?.status === 403) {
      log(`   ⚠️ 403 Forbidden - User lacks SUPERADMIN role`, 'yellow');
    } else if (error.response?.status === 401) {
      log(`   ⚠️ 401 Unauthorized - Invalid or expired token`, 'yellow');
    }
    return false;
  }
}

async function testToggleAutoSync(currencyCode = 'VES') {
  log(`\n⚙️ Testing PATCH /exchange-rates/${currencyCode}/auto-sync`, 'blue');
  log(`   (Requires SUPERADMIN auth)`, 'yellow');

  if (!AUTH_TOKEN) {
    log(`⚠️ Skipping: No AUTH_TOKEN provided`, 'yellow');
    return null;
  }

  try {
    // First enable
    let response = await axios.patch(
      `${API_BASE}/exchange-rates/${currencyCode}/auto-sync`,
      { enabled: true },
      {
        timeout: 10000,
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      }
    );

    log(`✅ Enable Auto-Sync: ${response.data.success}`, 'green');

    // Then disable
    response = await axios.patch(
      `${API_BASE}/exchange-rates/${currencyCode}/auto-sync`,
      { enabled: false },
      {
        timeout: 10000,
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      }
    );

    log(`✅ Disable Auto-Sync: ${response.data.success}`, 'green');

    return true;
  } catch (error) {
    log(`❌ Failed: ${error.message}`, 'red');
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function runAllTests() {
  log('═'.repeat(60), 'blue');
  log('  BCV SYNC API TEST SUITE', 'blue');
  log('═'.repeat(60), 'blue');
  log(`\nAPI Base: ${API_BASE}`);
  log(`Auth Token: ${AUTH_TOKEN ? '✅ Provided' : '❌ Not provided (public endpoints only)'}`);

  const results = {
    currentRate: await testCurrentRate('VES'),
    syncStatus: await testSyncStatus('VES'),
    manualSync: await testManualSync('VES'),
    toggleAutoSync: await testToggleAutoSync('VES'),
  };

  // Summary
  log('\n' + '═'.repeat(60), 'blue');
  log('  TEST SUMMARY', 'blue');
  log('═'.repeat(60), 'blue');

  const passed = Object.entries(results).filter(([, r]) => r === true).length;
  const failed = Object.entries(results).filter(([, r]) => r === false).length;
  const skipped = Object.entries(results).filter(([, r]) => r === null).length;

  log(`\n✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
  log(`⚠️ Skipped: ${skipped} (need auth)`, skipped > 0 ? 'yellow' : 'reset');

  return failed === 0;
}

// Parse command line arguments
const command = process.argv[2] || 'test-all';
const arg = process.argv[3] || 'VES';

(async () => {
  try {
    switch (command) {
      case 'current-rate':
        await testCurrentRate(arg);
        break;
      case 'sync-status':
        await testSyncStatus(arg);
        break;
      case 'sync':
        await testManualSync(arg);
        break;
      case 'auto-sync':
        await testToggleAutoSync(arg);
        break;
      case 'test-all':
      default:
        const success = await runAllTests();
        process.exit(success ? 0 : 1);
    }
  } catch (error) {
    log(`\n💥 Fatal error: ${error.message}`, 'red');
    process.exit(1);
  }
})();
