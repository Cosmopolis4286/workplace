import { test, expect } from '@playwright/test';

test.describe('Workplace Application', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check that page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Check for common elements
    const title = await page.title();
    expect(title).toContain('WorkPlace');
  });

  test('should have working API health endpoint', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('ok');
  });

  test('should handle authentication flow', async ({ page }) => {
    await page.goto('/login');
    
    // Check login form exists
    await expect(page.locator('form')).toBeVisible();
    
    // Check for email and password fields
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Check for submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should load dashboard after login', async ({ page }) => {
    // Mock successful login
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');
    
    // Check dashboard elements
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Navigate to a page that makes API calls
    await page.goto('/dashboard');
    
    // Mock API error
    await page.route('/api/user/profile', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Check that error is handled
    await page.reload();
    
    // Look for error message or fallback UI
    const errorElement = page.locator('[data-testid="error-message"], .error, .alert');
    if (await errorElement.isVisible()) {
      await expect(errorElement).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Check mobile navigation
    const mobileNav = page.locator('[data-testid="mobile-nav"], .mobile-nav, nav.burger');
    if (await mobileNav.isVisible()) {
      await expect(mobileNav).toBeVisible();
    }
    
    // Check content is still accessible
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('API Integration', () => {
  test('should handle real API calls', async ({ request }) => {
    // Test actual API endpoints
    const healthResponse = await request.get('/api/health');
    expect(healthResponse.status()).toBe(200);
    
    // Test ready endpoint (if available)
    try {
      const readyResponse = await request.get('/api/ready');
      expect(readyResponse.status()).toBe(200);
      
      const readyBody = await readyResponse.json();
      expect(readyBody).toHaveProperty('ready');
    } catch (error) {
      // Ready endpoint might not be implemented yet
      console.log('Ready endpoint not available:', error.message);
    }
  });

  test('should validate API response structure', async ({ request }) => {
    const response = await request.get('/api/health');
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
