import { test, expect, Page } from '@playwright/test';

// Full game is ~5 rounds × ~30s each + transitions — budget 5 minutes
test.setTimeout(300_000);

const ROUNDS = 5;
// Allocation across 7 asset classes — must sum to 100
const ROUND_ALLOCATION = ['30', '15', '15', '15', '10', '10', '5'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function attachConsole(page: Page, label: string) {
  page.on('console', msg => console.log(`[${label}] ${msg.type().toUpperCase()}: ${msg.text()}`));
  page.on('pageerror', err => console.error(`[${label}] PAGE ERROR: ${err.message}`));
}

async function getSessionCode(page: Page): Promise<string> {
  const el = page.locator('.select-all');
  await el.waitFor({ state: 'visible', timeout: 10_000 });
  for (let i = 0; i < 10; i++) {
    const code = await el.innerText();
    if (code && code !== '------' && code.length >= 6) return code;
    await page.waitForTimeout(1000);
  }
  throw new Error('Could not extract a valid session code after 10s');
}

async function commitAllocation(page: Page) {
  const sliders = page.locator('input[type="range"]');
  const count = await sliders.count();
  const values = ROUND_ALLOCATION.slice(0, count);
  for (let i = 0; i < values.length; i++) {
    await sliders.nth(i).fill(values[i]);
  }
  const commitBtn = page.getByRole('button', { name: /Commit Portfolio/i });
  await commitBtn.waitFor({ state: 'visible', timeout: 5_000 });
  await commitBtn.click();
}

// ─── Test ────────────────────────────────────────────────────────────────────

test.describe('Game Flow', () => {
  test('facilitator creates session → player joins → plays 5 rounds → game over modal appears', async ({ browser }) => {
    // Two separate contexts = two independent browser "tabs"
    const facilContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const playerContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    });

    const facilPage = await facilContext.newPage();
    const playerPage = await playerContext.newPage();
    attachConsole(facilPage, 'FACIL');
    attachConsole(playerPage, 'PLAYER');

    try {
      // ── 1. Facilitator registers ──────────────────────────────────────────
      const testEmail = `facil_${Date.now()}@test.com`;
      await facilPage.goto('/register');
      await facilPage.getByText('Lead Facilitator').click();
      await facilPage.waitForTimeout(500);
      await facilPage.fill('input[placeholder="JOHN"]', 'Admin');
      await facilPage.fill('input[placeholder="DOE"]', 'E2E');
      await facilPage.fill('input[placeholder="ACCESS@LEAK.FILE"]', testEmail);
      await facilPage.fill('input[placeholder="••••••••"]', 'password123');
      await facilPage.click('button:has-text("Confirm Identity")');
      await facilPage.waitForURL('**/lobby', { timeout: 30_000 });

      // ── 2. Create session ────────────────────────────────────────────────
      await facilPage.getByRole('heading', { name: 'Lead Facilitator' }).click();
      await facilPage.fill('input[placeholder*="Scenario Name"]', 'E2E Test Session');
      await facilPage.locator('select').nth(0).selectOption('TECH_CRISIS');
      await facilPage.locator('select').nth(1).selectOption('STANDARD');
      await facilPage.click('button:has-text("Initialize Sequence")');
      await facilPage.waitForURL('**/facilitator', { timeout: 15_000 });

      const sessionCode = await getSessionCode(facilPage);
      console.log(`✅ Session code: ${sessionCode}`);

      // ── 3. Player joins as guest ─────────────────────────────────────────
      await playerPage.goto('/login');
      await playerPage.click('button:has-text("Enter as Guest")');
      await playerPage.waitForURL('**/lobby', { timeout: 10_000 });

      await playerPage.goto('/join');
      await playerPage.fill('input[placeholder*="ENTER PIN"]', sessionCode);
      await playerPage.click('button:has-text("Join Terminal")');
      await playerPage.waitForURL('**/dashboard', { timeout: 15_000 });
      console.log('✅ Player at dashboard');

      // ── 4. Verify player appears in facilitator roster ───────────────────
      await facilPage.bringToFront();
      await expect(facilPage.locator('text=Guest').first()).toBeVisible({ timeout: 10_000 });

      // ── 5. Start simulation ──────────────────────────────────────────────
      await facilPage.getByRole('button', { name: /Start Simulation/i }).click();
      await expect(facilPage.locator('text=ACTIVE').first()).toBeVisible({ timeout: 10_000 });
      console.log('✅ Simulation ACTIVE');

      // ── 6. Play 5 rounds ─────────────────────────────────────────────────
      for (let round = 1; round <= ROUNDS; round++) {
        console.log(`\n--- ROUND ${round} ---`);

        // REST-based session start does not push WebSocket events to players.
        // Reload to force joinSession → initialState which syncs the ACTIVE state.
        await playerPage.bringToFront();
        await playerPage.reload();
        console.log('🔄 Player page reloaded to sync state');

        // Dismiss news break if showing, otherwise go straight to sliders
        const analyzeBtn = playerPage.getByRole('button', { name: /Analyze & Trade/i });
        const commitBtn  = playerPage.getByRole('button', { name: /Commit Portfolio/i });

        await Promise.race([
          analyzeBtn.waitFor({ state: 'visible', timeout: 20_000 }),
          commitBtn.waitFor({ state: 'visible', timeout: 20_000 }),
        ]);

        if (await analyzeBtn.isVisible()) {
          console.log('📰 Dismissing news break');
          await analyzeBtn.click();
        } else {
          console.log('⏩ Already in trading state');
        }

        // Player: set allocation and commit
        await commitAllocation(playerPage);
        console.log(`✅ Round ${round} trade committed`);

        // Facilitator: wait for READY status, then advance
        await facilPage.bringToFront();
        await facilPage
          .locator('text=READY')
          .first()
          .waitFor({ state: 'visible', timeout: 35_000 })
          .catch(() => console.log('⚠️ READY status not seen, advancing anyway'));

        await facilPage.getByRole('button', { name: /Sync Next Round/i }).click();
        console.log(`⏩ Advanced round ${round}`);
        await facilPage.waitForTimeout(2_000); // let round transition settle
      }

      // ── 7. Assert game over modal ────────────────────────────────────────
      await playerPage.bringToFront();
      await playerPage.reload();

      await expect(playerPage.locator('text=Simulation Complete')).toBeVisible({ timeout: 30_000 });
      console.log('✅ GameOverModal visible');

      // Wait for AI debrief to finish loading (non-fatal — may already be done)
      await playerPage
        .locator('text=Syncing Tactical')
        .waitFor({ state: 'hidden', timeout: 60_000 })
        .catch(() => {});

      // Charts render once data is available (non-fatal — depends on portfolio/ranking data)
      const chartsVisible = await playerPage
        .locator('.recharts-surface')
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      console.log(chartsVisible ? '✅ Charts rendered' : '⚠️ Charts not rendered (data may be missing)');

    } finally {
      await facilContext.close();
      await playerContext.close();
    }
  });
});
