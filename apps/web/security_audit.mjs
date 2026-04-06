import { chromium } from 'playwright';

async function runSecurityAudit() {
  console.log('🛡️ Starting Security & RLS Penetration Audit...');
  const browser = await chromium.launch({ headless: true });
  
  // Create isolated contexts for User A and User B
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    console.log('👥 Setting up Test Subjects...');
    
    // User A Registration
    const pageA = await contextA.newPage();
    await pageA.goto('http://localhost:3000/register');
    await pageA.getByText('Active Operative').click();
    await pageA.waitForTimeout(1000);
    await pageA.fill('input[placeholder="JOHN"]', 'User');
    await pageA.fill('input[placeholder="DOE"]', 'A');
    await pageA.fill('input[placeholder="ACCESS@LEAK.FILE"]', `userA_${Date.now()}@test.com`);
    await pageA.fill('input[placeholder="••••••••"]', 'password123');
    await pageA.click('button:has-text("Confirm Identity")');
    await pageA.waitForURL('**/lobby', { timeout: 15000 });
    
    // Extract User A ID
    const userIdA = await pageA.evaluate(async () => {
        const res = await fetch('http://localhost:3001/auth/me', { credentials: 'include' });
        const data = await res.json();
        return data.userId;
    });

    // User B Registration
    const pageB = await contextB.newPage();
    await pageB.goto('http://localhost:3000/register');
    await pageB.getByText('Active Operative').click();
    await pageB.waitForTimeout(1000);
    await pageB.fill('input[placeholder="JOHN"]', 'User');
    await pageB.fill('input[placeholder="DOE"]', 'B');
    await pageB.fill('input[placeholder="ACCESS@LEAK.FILE"]', `userB_${Date.now()}@test.com`);
    await pageB.fill('input[placeholder="••••••••"]', 'password123');
    await pageB.click('button:has-text("Confirm Identity")');
    await pageB.waitForURL('**/lobby', { timeout: 15000 });
    
    // Extract User B ID
    const userIdB = await pageB.evaluate(async () => {
        const res = await fetch('http://localhost:3001/auth/me', { credentials: 'include' });
        const data = await res.json();
        return data.userId;
    });

    console.log(`✅ Users Created. UserA: ${userIdA}, UserB: ${userIdB}`);

    // Create a Session for User A (using a separate Facilitator context)
    const facilContext = await browser.newContext();
    const facilPage = await facilContext.newPage();
    await facilPage.goto('http://localhost:3000/register');
    await facilPage.getByText('Lead Facilitator').click();
    await facilPage.fill('input[placeholder="JOHN"]', 'Facil');
    await facilPage.fill('input[placeholder="DOE"]', 'Secure');
    await facilPage.fill('input[placeholder="ACCESS@LEAK.FILE"]', `facil_${Date.now()}@secure.com`);
    await facilPage.fill('input[placeholder="••••••••"]', 'password123');
    await facilPage.click('button:has-text("Confirm Identity")');
    await facilPage.waitForURL('**/lobby');
    await facilPage.getByRole('heading', { name: 'Lead Facilitator' }).click();
    await facilPage.fill('input[placeholder*="Scenario Name"]', 'Security Audit Session');
    await facilPage.click('button:has-text("Initialize Sequence")');
    await facilPage.waitForURL('**/facilitator');
    const sessionCodeA = await facilPage.locator('span.select-all').innerText();
    const sessionIdA = facilPage.url().split('/').pop();
    console.log(`✅ Session A created: ${sessionCodeA} (${sessionIdA})`);

    // User A joins Session A
    await pageA.goto('http://localhost:3000/join');
    await pageA.fill('input[placeholder*="ENTER PIN"]', sessionCodeA);
    await pageA.click('button:has-text("Join Terminal")');
    await pageA.waitForURL('**/dashboard');
    console.log('✅ User A joined Session A');

    // SCENARIO 1: User B tries to fetch User A's portfolio
    console.log('\n🔍 SCENARIO 1: Cross-user portfolio access...');
    const attempt1 = await pageB.evaluate(async ({ sessionId, otherUserId }) => {
        const res = await fetch(`http://localhost:3001/portfolio/${sessionId}?userId=${otherUserId}`, {
            credentials: 'include'
        });
        return { status: res.status };
    }, { sessionId: sessionIdA, otherUserId: userIdA });
    console.log(`Result: Status ${attempt1.status} (${attempt1.status === 404 || attempt1.status === 403 ? 'SECURE ✅' : 'VULNERABLE ❌'})`);

    // SCENARIO 2: User B tries to fetch their own portfolio in Session A (Without Joining)
    console.log('\n🔍 SCENARIO 2: Non-joined session access...');
    const attempt2 = await pageB.evaluate(async ({ sessionId }) => {
        const res = await fetch(`http://localhost:3001/portfolio/${sessionId}`, {
            credentials: 'include'
        });
        return { status: res.status };
    }, { sessionId: sessionIdA });
    console.log(`Result: Status ${attempt2.status} (${attempt2.status === 404 || attempt2.status === 403 ? 'SECURE ✅' : 'VULNERABLE ❌'})`);

    // SCENARIO 3: Unauthorized Trade Execution (VALID DTO, WRONG USER)
    console.log('\n🔍 SCENARIO 3: Unauthorized trade execution...');
    const attempt3 = await pageB.evaluate(async ({ sessionId }) => {
        const res = await fetch(`http://localhost:3001/trade/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionId,
                symbol: 'TECH',
                quantity: 1,
                action: 'BUY'
            }),
            credentials: 'include'
        });
        return { status: res.status };
    }, { sessionId: sessionIdA });
    console.log(`Result: Status ${attempt3.status} (${attempt3.status === 403 || attempt3.status === 404 ? 'SECURE ✅' : 'VULNERABLE ❌'})`);

    // SCENARIO 4: Cross-session score/leaderboard leak
    console.log('\n🔍 SCENARIO 4: Cross-session score leak...');
    const attempt4 = await pageB.evaluate(async ({ sessionId }) => {
        const res = await fetch(`http://localhost:3001/leaderboard/${sessionId}`, {
            credentials: 'include'
        });
        const data = await res.json();
        return { status: res.status, length: (Array.isArray(data) ? data.length : 0) };
    }, { sessionId: sessionIdA });
    console.log(`Result: Status ${attempt4.status}, Data Length: ${attempt4.length} (${attempt4.status === 403 || (attempt4.status === 200 && attempt4.length === 0) ? 'SECURE ✅' : 'VULNERABLE ❌'})`);

  } catch (error) {
    console.error('❌ Audit Failed:', error);
  } finally {
    await browser.close();
  }
}

runSecurityAudit();
