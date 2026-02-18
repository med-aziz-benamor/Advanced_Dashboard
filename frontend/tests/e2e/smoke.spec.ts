import { test, expect } from '@playwright/test'

test('login screen loads', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('AdvancedDashboard')).toBeVisible()
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
})
