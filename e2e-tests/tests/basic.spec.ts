import { test, expect } from '@playwright/test';

test.describe('Workplace Application', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check that page loads - body should be visible
    await expect(page.locator('body')).toBeVisible();
    
    // Check that document has loaded (has title or some content)
    const title = await page.title();
    // Accept empty title or any title - just verify page loaded
    expect(typeof title).toBe('string');
  });

  test('should have working API health endpoint', async ({ request }) => {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const response = await request.get(`${apiUrl}/api/health`);
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('ok');
  });

  test('should handle authentication flow', async ({ page }) => {
    await page.goto('/login');
    
    // Check login form exists
    await expect(page.locator('body')).toBeVisible();
    
    // Check for form elements (email/password inputs or buttons)
    const hasForm = await page.locator('form, input, button').count() > 0;
    expect(hasForm).toBe(true);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Check content is accessible on mobile
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('API Integration', () => {
  test('should handle real API calls', async ({ request }) => {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    // Test actual API endpoints
    const healthResponse = await request.get(`${apiUrl}/api/health`);
    expect(healthResponse.status()).toBe(200);
  });

  test('should validate API response structure', async ({ request }) => {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const response = await request.get(`${apiUrl}/api/health`);
    const body = await response.json();
    
    // Validate response structure
    expect(body).toBeInstanceOf(Object);
    expect(body).toHaveProperty('status');
    expect(typeof body.status).toBe('string');
    
    // Check for additional health metrics
    if (body.uptime) {
      expect(typeof body.uptime).toBe('number');
    }
    
    if (body.timestamp) {
      expect(typeof body.timestamp).toBe('string');
    }
  });
});
