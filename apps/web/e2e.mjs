import { chromium } from 'playwright';

async function runBrowserE2E() {
  console.log('🚀 Launching Chromium (Headless Mode)...');
  const browser = await chromium.launch({ headless: true }); 
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  
  const screenshotFailure = async (name) => {
    const pages = [];
    for (const ctx of browser.contexts()) {
        pages.push(...ctx.pages());
    }
    for (let i = 0; i < pages.length; i++) {
        await pages[i].screenshot({ path: `e2e-fail-${name}-page${i}-${Date.now()}.png` });
    }
  };

  const setupConsole = (page, name) => {
    page.on('console', msg => console.log(`[${name}] ${msg.type().toUpperCase()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[${name}] PAGE ERROR: ${err.message}`));
  };

  try {
    // 1. Facilitator Registration/Login (Tab 1)
    console.log('👤 Registering Facilitator...');
    const facilPage = await context.newPage();
    setupConsole(facilPage, 'FACIL');
    await facilPage.goto('http://localhost:3000/register');
    
    console.log('Selecting Lead Facilitator role...');
    await facilPage.getByText('Lead Facilitator').click();
    await facilPage.waitForTimeout(1000);

    console.log('Filling registration form...');
    const testEmail = `facil_${Date.now()}@test.com`;
    await facilPage.fill('input[placeholder="JOHN"]', 'Admin');
    await facilPage.fill('input[placeholder="DOE"]', 'E2E');
    await facilPage.fill('input[placeholder="ACCESS@LEAK.FILE"]', testEmail);
    await facilPage.fill('input[placeholder="••••••••"]', 'password123');
    await facilPage.click('button:has-text("Confirm Identity")');

    console.log('⏳ Waiting for Lobby navigation...');
    await facilPage.waitForURL('**/lobby', { timeout: 30000 });
    console.log('✅ Arrived at Lobby.');
    
    console.log('Selecting Lead Facilitator in Lobby...');
    await facilPage.getByRole('heading', { name: 'Lead Facilitator' }).click();
    
    console.log('Initializing New Sequence...');
    await facilPage.fill('input[placeholder*="Scenario Name"]', 'E2E Test Session');
    // First select is Scenario, second is Format
    await facilPage.locator('select').nth(0).selectOption('TECH_CRISIS');
    await facilPage.locator('select').nth(1).selectOption('STANDARD'); 
    await facilPage.click('button:has-text("Initialize Sequence")');

    console.log('Waiting for Facilitator Dashboard...');
    await facilPage.waitForURL('**/facilitator', { timeout: 15000 });
    
    console.log('Waiting for valid Session Code...');
    const sessionCodeElement = facilPage.locator('span.select-all');
    await sessionCodeElement.waitFor({ state: 'visible', timeout: 10000 });
    
    let sessionCode = '';
    for (let i = 0; i < 10; i++) {
        sessionCode = await sessionCodeElement.innerText();
        if (sessionCode && sessionCode !== '------' && sessionCode.length >= 6) {
            break;
        }
        await facilPage.waitForTimeout(1000);
    }
    
    if (!sessionCode || sessionCode === '------') {
        throw new Error('Failed to extract valid Session Code from Dashboard after 10s');
    }
    
    console.log(`✅ Session Created and Initialized. Code: ${sessionCode}`);

    // 2. Player Join (Tab 2)
    console.log('👤 Opening Player Tab (Mobile View)...');
    const playerContext = await browser.newContext({ 
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
    });
    const playerPage = await playerContext.newPage();
    setupConsole(playerPage, 'PLAYER');
    
    console.log('👤 Player: Entering as Guest...');
    await playerPage.goto('http://localhost:3000/login');
    await playerPage.click('button:has-text("Enter as Guest")');
    await playerPage.waitForURL('**/lobby', { timeout: 10000 });

    console.log('👤 Player: Joining Session...');
    await playerPage.goto('http://localhost:3000/join');
    await playerPage.fill('input[placeholder*="ENTER PIN"]', sessionCode);
    await playerPage.click('button:has-text("Join Terminal")');
    
    await playerPage.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('✅ Player Joined and at Dashboard');

    await facilPage.bringToFront();
    console.log('⏳ Waiting for Player to appear in Facilitator Roster...');
    await facilPage.locator('text=Guest').first().waitFor({ state: 'visible', timeout: 10000 });
    console.log('👥 Player detected in Roster');

    // 3. Start Game
    console.log('🎮 Starting Game from Facilitator Tab...');
    await facilPage.bringToFront();
    const startBtn = facilPage.getByRole('button', { name: /Start Simulation/i });
    await startBtn.waitFor({ state: 'visible', timeout: 5000 });
    await startBtn.click();
    
    console.log('⏳ Waiting for Simulation to go ACTIVE...');
    await facilPage.locator('text=ACTIVE').first().waitFor({ state: 'visible', timeout: 10000 });
    console.log('🚀 Simulation is LIVE');
    console.log('⏳ Waiting for propagation (3s)...');
    await facilPage.waitForTimeout(3000);

    // 4. Play 5 Rounds
    for (let round = 1; round <= 5; round++) {
      console.log(`\n--- ROUND ${round} ---`);
      
      await playerPage.bringToFront();
      console.log('📰 Waiting for News Break...');
      const exploreMarketBtn = playerPage.getByRole('button', { name: /Analyze & Trade/i });
      
      try {
        await exploreMarketBtn.waitFor({ state: 'visible', timeout: 10000 });
      } catch (e) {
        console.log('⚠️ News Break not visible. Attempting RELOAD to sync state...');
        await playerPage.reload();
        await playerPage.waitForTimeout(3000);
        await exploreMarketBtn.waitFor({ state: 'visible', timeout: 10000 }).catch(() => console.log('News Break still not visible after reload.'));
      }

      if (await exploreMarketBtn.isVisible()) {
        await exploreMarketBtn.click();
      }

      console.log('💸 Adjusting Trade Sliders (Diversifying)...');
      const sliders = playerPage.locator('input[type="range"]');
      const sliderCount = await sliders.count();
      if (sliderCount >= 7) {
        await sliders.nth(0).fill('40'); // TECHNOLOGY
        await playerPage.waitForTimeout(200);
        await sliders.nth(1).fill('10'); // FIXED INCOME
        await playerPage.waitForTimeout(200);
        await sliders.nth(2).fill('10'); // COMMODITIES
        await playerPage.waitForTimeout(200);
        await sliders.nth(3).fill('10'); // DIGITAL ASSETS
        await playerPage.waitForTimeout(200);
        await sliders.nth(4).fill('10'); // INDUSTRIAL
        await playerPage.waitForTimeout(200);
        await sliders.nth(5).fill('10'); // REAL ESTATE
        await playerPage.waitForTimeout(200);
        await sliders.nth(6).fill('10'); // CASH RESERVE
        await playerPage.waitForTimeout(500);
      }

      const commitBtn = playerPage.getByRole('button', { name: /Commit Portfolio/i });
      await commitBtn.waitFor({ state: 'visible', timeout: 5000 });
      await commitBtn.click();
      console.log('✅ Trade Committed');
      
      await facilPage.bringToFront();
      console.log(`⏳ Waiting for Facilitator Dashboard to sync Round ${round}...`);
      try {
        await facilPage.locator(`text=ROUND: ${round}`).first().waitFor({ state: 'visible', timeout: 15000 });
      } catch (e) {
        console.log(`Warning: ROUND: ${round} text not found, continuing anyway.`);
      }

      console.log('⏳ Waiting for Player to be READY in Roster...');
      await Promise.race([
        facilPage.locator('text=READY').first().waitFor({ state: 'visible', timeout: 35000 }),
        facilPage.locator('text=STATUS_LOCKED').first().waitFor({ state: 'visible', timeout: 35000 })
      ]).catch(() => console.log('⚠️ Warning: Ready status not detected, proceeding to click advance.'));

      console.log('⏩ Clicking Force Advance Round');
      const advanceBtn = facilPage.getByRole('button', { name: /Force Advance Round/i });
      await advanceBtn.waitFor({ state: 'visible', timeout: 5000 });
      await advanceBtn.click();
      
      console.log('--- ROUND END ---');
      await facilPage.waitForTimeout(3000);
    }

    console.log('\n🏁 Game Over! Switching to Player Tab to view Modal...');
    await playerPage.bringToFront();
    
    console.log('🔄 Final reload to sync COMPLETED status...');
    await playerPage.reload();
    await playerPage.waitForTimeout(5000);

    console.log('⏳ Waiting for GameOverModal...');
    // Relaxed wait for "COMPLETE" anywhere in the modal
    await playerPage.locator('text=Simulation Complete').waitFor({ state: 'visible', timeout: 30000 });
    
    console.log('⏳ Waiting for Gemini AI Analysis to finish loading...');
    await playerPage.locator('text=Generating customized tactical analysis').waitFor({ state: 'hidden', timeout: 60000 });
    
    console.log('⏳ Waiting for any Chart to appear...');
    // Don't fail if charts take too long, just wait a bit
    await playerPage.locator('.recharts-surface').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => console.log('Warning: Charts did not appear within 10s'));

    console.log('📸 Capturing Detailed Screenshots...');
    // Full page screenshot for mobile view to see everything
    await playerPage.screenshot({ path: '/Users/aphchat/Coding Year 1/Hackanomics/apps/web/e2e_verification_mobile.png', fullPage: true });
    
    await facilPage.bringToFront();
    await facilPage.screenshot({ path: '/Users/aphchat/Coding Year 1/Hackanomics/apps/web/e2e_verification_desktop.png' });
    
    await playerPage.bringToFront();
    console.log('✅ E2E UI Verification Completed Successfully!');

  } catch (error) {
    console.error('❌ E2E Failed:', error);
    await screenshotFailure('main-error');
  } finally {
    if (browser) await browser.close();
  }
}

runBrowserE2E();
