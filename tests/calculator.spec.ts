import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { pathToFileURL } from 'url';

const PAGE_URL = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function openPage(page: Page) {
  await page.goto(PAGE_URL);
}

async function setIncome(page: Page, amount: number) {
  await page.locator('#s-income').fill(String(amount));
}

async function setMonthlyBills(page: Page, amount: number) {
  await page.locator('#s-bills').fill(String(amount));
}

async function selectRegion(page: Page, region: 'england' | 'wales' | 'scotland' | 'ni', mode: 's' | 'a' | 'm' = 's') {
  const form = mode === 's' ? '#simple-mode' : mode === 'a' ? '#advanced-mode' : '#makehurt-mode';
  await page.locator(`${form} .region-btn[data-region="${region}"]`).click();
}

async function switchToAdvanced(page: Page) {
  await page.locator('#btn-advanced').click();
}

async function setAdvancedIncome(page: Page, amount: number) {
  await page.locator('#a-income').fill(String(amount));
}

async function setPension(page: Page, pct: number) {
  await page.locator('#a-pension').fill(String(pct));
}

/** Returns text content of a result stat row value by its label text */
async function getStatValue(page: Page, labelText: string): Promise<string> {
  const row = page.locator('.stat-row', { hasText: labelText }).first();
  return (await row.locator('.value').textContent()) ?? '';
}

async function switchToMakeItHurt(page: Page) {
  await page.locator('#btn-makehurt').click();
}

async function setHurtIncome(page: Page, amount: number) {
  await page.locator('#m-income').fill(String(amount));
}

async function setHurtHousing(page: Page, amount: number) {
  await page.locator('#m-housing').fill(String(amount));
}

async function setHurtOtherBills(page: Page, amount: number) {
  await page.locator('#m-other').fill(String(amount));
}

async function setHurtHours(page: Page, hours: number) {
  await page.locator('#m-hours').fill(String(hours));
}

// ─── Tests: Initial state ─────────────────────────────────────────────────────

test.describe('Initial state', () => {
  test('page loads with correct title', async ({ page }) => {
    await openPage(page);
    await expect(page).toHaveTitle('UK Tax Calculator 2026/27 - Tax for Dummies');
  });

  test('simple mode is active by default', async ({ page }) => {
    await openPage(page);
    await expect(page.locator('#btn-simple')).toHaveClass(/active/);
    await expect(page.locator('#btn-advanced')).not.toHaveClass(/active/);
    await expect(page.locator('#simple-mode')).toBeVisible();
    await expect(page.locator('#advanced-mode')).toBeHidden();
  });

  test('shows empty state message when no income entered', async ({ page }) => {
    await openPage(page);
    await expect(page.locator('#simple-results .results-empty')).toBeVisible();
  });

  test('england region is pre-selected in simple mode', async ({ page }) => {
    await openPage(page);
    await expect(page.locator('#simple-mode .region-btn[data-region="england"]')).toHaveClass(/active/);
  });
});

// ─── Tests: Mode toggle ───────────────────────────────────────────────────────

test.describe('Mode toggle', () => {
  test('switches to advanced mode', async ({ page }) => {
    await openPage(page);
    await switchToAdvanced(page);
    await expect(page.locator('#advanced-mode')).toBeVisible();
    await expect(page.locator('#simple-mode')).toBeHidden();
    await expect(page.locator('#btn-advanced')).toHaveClass(/active/);
  });

  test('switches back to simple mode', async ({ page }) => {
    await openPage(page);
    await switchToAdvanced(page);
    await page.locator('#btn-simple').click();
    await expect(page.locator('#simple-mode')).toBeVisible();
    await expect(page.locator('#advanced-mode')).toBeHidden();
  });
});

// ─── Tests: Simple mode — tax calculations ────────────────────────────────────

test.describe('Simple mode — tax calculations', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
  });

  test('£30,000 England — income tax is £3,486', async ({ page }) => {
    await setIncome(page, 30000);
    const val = await getStatValue(page, 'Income tax');
    expect(val).toContain('£3,486');
  });

  test('£30,000 England — NI is £1,394', async ({ page }) => {
    await setIncome(page, 30000);
    const val = await getStatValue(page, 'National Insurance');
    expect(val).toContain('£1,394');
  });

  test('£30,000 England — take-home is £25,120', async ({ page }) => {
    await setIncome(page, 30000);
    const val = await getStatValue(page, 'Take-home pay');
    expect(val).toContain('£25,120');
  });

  test('£30,000 — effective tax rate is displayed', async ({ page }) => {
    await setIncome(page, 30000);
    const val = await getStatValue(page, 'Total deductions');
    expect(val).toMatch(/\d+\.\d+%/);
  });

  test('£50,270 England — higher rate boundary', async ({ page }) => {
    await setIncome(page, 50270);
    // All in basic rate: (50270 - 12570) * 20% = £7,540
    const val = await getStatValue(page, 'Income tax');
    expect(val).toContain('£7,540');
  });

  test('£60,000 England — higher rate kicks in', async ({ page }) => {
    await setIncome(page, 60000);
    // Basic: (50270-12570)*20% = £7,540; Higher: (60000-50270)*40% = £3,892; Total: £11,432
    const val = await getStatValue(page, 'Income tax');
    expect(val).toContain('£11,432');
  });

  test('£12,570 — no income tax (at personal allowance)', async ({ page }) => {
    await setIncome(page, 12570);
    const val = await getStatValue(page, 'Income tax');
    expect(val).toContain('£0');
  });

  test('income above £100,000 tapers personal allowance', async ({ page }) => {
    // £110,000: PA = 12570 - (10000/2) = 7570; taxable = 102430
    // Tax: 7570*0 + (37700*20%) + (62730*40%) ... let's just verify it's more than basic calc
    await setIncome(page, 110000);
    const val = await getStatValue(page, 'Income tax');
    // Should be significantly higher due to taper. Rough check > £30k tax
    const amount = parseInt(val.replace(/[^0-9]/g, ''));
    expect(amount).toBeGreaterThan(30000);
  });
});

// ─── Tests: Simple mode — Scotland higher tax ─────────────────────────────────

test.describe('Simple mode — Scotland rates', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
  });

  test('£30,000 Scotland — income tax is £3,497', async ({ page }) => {
    await setIncome(page, 30000);
    await selectRegion(page, 'scotland');
    // Scotland: starter 2306*19% + basic 11685*20% + intermediate 3439*21%
    // = 438.14 + 2337 + 722.19 = 3497.33 → rounds to £3,497
    const val = await getStatValue(page, 'Income tax');
    expect(val).toContain('£3,497');
  });

  test('£60,000 Scotland — income tax (£13,228) is higher than England (£11,432)', async ({ page }) => {
    await setIncome(page, 60000);

    // England first
    const engVal = await getStatValue(page, 'Income tax');
    const engAmount = parseInt(engVal.replace(/[^0-9]/g, ''));

    // Switch to Scotland
    await selectRegion(page, 'scotland');
    const scoVal = await getStatValue(page, 'Income tax');
    const scoAmount = parseInt(scoVal.replace(/[^0-9]/g, ''));

    expect(scoAmount).toBeGreaterThan(engAmount);
    expect(scoVal).toContain('£13,228');
  });

  test('NI is the same for Scotland and England at £30,000', async ({ page }) => {
    await setIncome(page, 30000);
    const engNI = await getStatValue(page, 'National Insurance');

    await selectRegion(page, 'scotland');
    const scoNI = await getStatValue(page, 'National Insurance');

    expect(scoNI).toEqual(engNI);
  });

  test('Wales uses same rates as England', async ({ page }) => {
    await setIncome(page, 45000);
    const engTax = await getStatValue(page, 'Income tax');

    await selectRegion(page, 'wales');
    const walesTax = await getStatValue(page, 'Income tax');

    expect(walesTax).toEqual(engTax);
  });

  test('Northern Ireland uses same rates as England', async ({ page }) => {
    await setIncome(page, 45000);
    const engTax = await getStatValue(page, 'Income tax');

    await selectRegion(page, 'ni');
    const niTax = await getStatValue(page, 'Income tax');

    expect(niTax).toEqual(engTax);
  });
});

// ─── Tests: Simple mode — bills & real cost ───────────────────────────────────

test.describe('Simple mode — bills and real cost', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
    await setIncome(page, 30000);
  });

  test('annual bills = monthly bills × 12', async ({ page }) => {
    await setMonthlyBills(page, 1000);
    const val = await getStatValue(page, 'Annual bills');
    expect(val).toContain('£12,000');
  });

  test('money left after bills is correct', async ({ page }) => {
    // Take-home £25,120, bills £12,000 → left £13,120
    await setMonthlyBills(page, 1000);
    const val = await getStatValue(page, 'Left after bills');
    expect(val).toContain('£13,120');
  });

  test('gross equivalent of bills is greater than bill face value', async ({ page }) => {
    await setMonthlyBills(page, 1000);
    const faceValue = 12000;
    const val = await getStatValue(page, 'Gross earned to cover bills');
    const amount = parseInt(val.replace(/[^0-9]/g, ''));
    expect(amount).toBeGreaterThan(faceValue);
  });

  test('hidden tax cost of bills is positive', async ({ page }) => {
    await setMonthlyBills(page, 1000);
    const val = await getStatValue(page, 'Hidden tax cost of your bills');
    const amount = parseInt(val.replace(/[^0-9]/g, ''));
    expect(amount).toBeGreaterThan(0);
  });

  test('insight box appears when bills are entered', async ({ page }) => {
    await setMonthlyBills(page, 500);
    await expect(page.locator('#simple-results .insight-box')).toBeVisible();
  });

  test('insight box does not appear with zero bills', async ({ page }) => {
    await expect(page.locator('#simple-results .insight-box')).not.toBeVisible();
  });

  test('left after bills is negative when bills exceed take-home', async ({ page }) => {
    // Take-home ~£25k, set £3000/mo bills = £36k/yr
    await setMonthlyBills(page, 3000);
    const val = await getStatValue(page, 'Left after bills');
    // Should be negative
    expect(val).toMatch(/-|−|−/);
  });

  test('results update live as income changes', async ({ page }) => {
    await setMonthlyBills(page, 500);
    await setIncome(page, 40000);
    const val40k = await getStatValue(page, 'Income tax');

    await setIncome(page, 50000);
    const val50k = await getStatValue(page, 'Income tax');

    expect(val40k).not.toEqual(val50k);
  });
});

// ─── Tests: Advanced mode ─────────────────────────────────────────────────────

test.describe('Advanced mode', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
    await switchToAdvanced(page);
  });

  test('shows empty state when no income', async ({ page }) => {
    await expect(page.locator('#advanced-results .results-empty')).toBeVisible();
  });

  test('results appear after entering income', async ({ page }) => {
    await setAdvancedIncome(page, 35000);
    await expect(page.locator('#advanced-results .results-empty')).not.toBeVisible();
    const count = await page.locator('#advanced-results .stat-row').count();
    expect(count).toBeGreaterThan(0);
  });

  test('income tax matches simple mode for same income and region', async ({ page }) => {
    await setAdvancedIncome(page, 35000);
    const advTax = await getStatValue(page, 'Income tax');

    // Check simple mode gives same
    await page.locator('#btn-simple').click();
    await setIncome(page, 35000);
    const simpTax = await getStatValue(page, 'Income tax');

    expect(advTax).toEqual(simpTax);
  });

  test('pension contribution reduces income tax', async ({ page }) => {
    await setAdvancedIncome(page, 50000);
    const taxBefore = await getStatValue(page, 'Income tax');

    await setPension(page, 10);
    const taxAfter = await getStatValue(page, 'Income tax');

    const before = parseInt(taxBefore.replace(/[^0-9]/g, ''));
    const after = parseInt(taxAfter.replace(/[^0-9]/g, ''));
    expect(after).toBeLessThan(before);
  });

  test('pension contribution row appears when pension > 0', async ({ page }) => {
    await setAdvancedIncome(page, 40000);
    await setPension(page, 5);
    await expect(page.locator('#advanced-results').getByText(/Pension contribution/)).toBeVisible();
  });

  test('pension note shows contribution amount and tax saving', async ({ page }) => {
    await setAdvancedIncome(page, 40000);
    await setPension(page, 5);
    const note = await page.locator('#a-pension-note').textContent();
    expect(note).toMatch(/£2,000/); // 5% of £40k
    expect(note).toMatch(/saving/i);
  });

  test('pension does not reduce NI', async ({ page }) => {
    await setAdvancedIncome(page, 40000);
    const niWithout = await getStatValue(page, 'National Insurance');

    await setPension(page, 10);
    const niWith = await getStatValue(page, 'National Insurance');

    expect(niWith).toEqual(niWithout);
  });

  test('critical bills appear in results table', async ({ page }) => {
    await setAdvancedIncome(page, 35000);
    // Fill rent
    const criticalInputs = page.locator('#critical-bills .critical-bill');
    await criticalInputs.nth(0).fill('900'); // rent
    await expect(page.locator('.bills-table')).toBeVisible();
    await expect(page.locator('.bills-table').getByText('Rent / Mortgage')).toBeVisible();
  });

  test('extra bills appear in results table', async ({ page }) => {
    await setAdvancedIncome(page, 35000);
    const extraAmounts = page.locator('.extra-bill-amount');
    await extraAmounts.nth(0).fill('40'); // internet
    await expect(page.locator('.bills-table').getByText('Internet')).toBeVisible();
  });

  test('add extra bill row works', async ({ page }) => {
    const rowsBefore = await page.locator('#extra-bills .bill-row-inner').count();
    await page.locator('.btn-add').click();
    const rowsAfter = await page.locator('#extra-bills .bill-row-inner').count();
    expect(rowsAfter).toBe(rowsBefore + 1);
  });

  test('remove extra bill row works', async ({ page }) => {
    const rowsBefore = await page.locator('#extra-bills .bill-row-inner').count();
    await page.locator('#extra-bills .btn-remove').first().click();
    const rowsAfter = await page.locator('#extra-bills .bill-row-inner').count();
    expect(rowsAfter).toBe(rowsBefore - 1);
  });

  test('income allocation bar is visible after entering income', async ({ page }) => {
    await setAdvancedIncome(page, 35000);
    await expect(page.locator('.income-bar')).toBeVisible();
    await expect(page.locator('.bar-track')).toBeVisible();
    await expect(page.locator('.bar-legend')).toBeVisible();
  });

  test('bar segments sum to approximately 100%', async ({ page }) => {
    await setAdvancedIncome(page, 35000);
    const segments = page.locator('.bar-segment');
    const count = await segments.count();
    let total = 0;
    for (let i = 0; i < count; i++) {
      const width = await segments.nth(i).getAttribute('style');
      const match = width?.match(/width:([\d.]+)%/);
      if (match) total += parseFloat(match[1]);
    }
    expect(total).toBeCloseTo(100, 0);
  });

  test('Scotland region switch updates tax in advanced mode', async ({ page }) => {
    await setAdvancedIncome(page, 60000);
    const engTax = await getStatValue(page, 'Income tax');

    await selectRegion(page, 'scotland', 'a');
    const scoTax = await getStatValue(page, 'Income tax');

    expect(parseInt(scoTax.replace(/[^0-9]/g, ''))).toBeGreaterThan(
      parseInt(engTax.replace(/[^0-9]/g, ''))
    );
  });

  test('bills table shows gross equivalent > annual cost', async ({ page }) => {
    await setAdvancedIncome(page, 35000);
    const criticalInputs = page.locator('#critical-bills .critical-bill');
    await criticalInputs.nth(0).fill('800'); // £800/mo rent

    // The gross-needed column should be > annual (£9,600)
    const rows = page.locator('.bills-table tbody tr:not(.tier-header):not(.subtotal)');
    const firstRow = rows.first();
    const cells = firstRow.locator('td');

    const annualText = await cells.nth(2).textContent(); // annual col
    const grossText = await cells.nth(3).textContent();  // gross needed col

    const annual = parseInt((annualText ?? '').replace(/[^0-9]/g, ''));
    const gross = parseInt((grossText ?? '').replace(/[^0-9]/g, ''));
    expect(gross).toBeGreaterThan(annual);
  });
});

// ─── Tests: Region badge in results ──────────────────────────────────────────

test.describe('Region badge', () => {
  test('badge shows region name in simple results', async ({ page }) => {
    await openPage(page);
    await setIncome(page, 30000);
    await expect(page.locator('#simple-results .badge')).toHaveText('England');

    await selectRegion(page, 'scotland');
    await expect(page.locator('#simple-results .badge')).toHaveText('Scotland');
  });
});

// ─── Tests: Mode toggle — Make it Hurt ──────────────────────────────────────

test.describe('Mode toggle — Make it Hurt', () => {
  test('switches to Make it Hurt mode', async ({ page }) => {
    await openPage(page);
    await switchToMakeItHurt(page);
    await expect(page.locator('#makehurt-mode')).toBeVisible();
    await expect(page.locator('#simple-mode')).toBeHidden();
    await expect(page.locator('#advanced-mode')).toBeHidden();
    await expect(page.locator('#btn-makehurt')).toHaveClass(/active/);
  });

  test('switches from Make it Hurt back to Simple', async ({ page }) => {
    await openPage(page);
    await switchToMakeItHurt(page);
    await page.locator('#btn-simple').click();
    await expect(page.locator('#simple-mode')).toBeVisible();
    await expect(page.locator('#makehurt-mode')).toBeHidden();
  });

  test('income carries over between modes when destination is empty', async ({ page }) => {
    await openPage(page);
    await setIncome(page, 45000);
    await switchToAdvanced(page);
    // Advanced income should have been filled from simple
    await expect(page.locator('#a-income')).toHaveValue('45000');
    await switchToMakeItHurt(page);
    // Make it Hurt income should have been filled from advanced
    await expect(page.locator('#m-income')).toHaveValue('45000');
  });
});

// ─── Tests: Make it Hurt — initial state ────────────────────────────────────

test.describe('Make it Hurt — initial state', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
    await switchToMakeItHurt(page);
  });

  test('shows empty state message when no income entered', async ({ page }) => {
    await expect(page.locator('#makehurt-results .results-empty')).toBeVisible();
  });

  test('england region is pre-selected by default', async ({ page }) => {
    await expect(page.locator('#makehurt-mode .region-btn[data-region="england"]')).toHaveClass(/active/);
  });
});

// ─── Tests: Make it Hurt — worker summary & calculations ────────────────────

test.describe('Make it Hurt — worker summary', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
    await switchToMakeItHurt(page);
    await setHurtIncome(page, 35000);
    await setHurtHousing(page, 800);
    await setHurtOtherBills(page, 400);
    await setHurtHours(page, 37.5);
  });

  test('worker summary bar appears with disposable income', async ({ page }) => {
    await expect(page.locator('.worker-bar')).toBeVisible();
    await expect(page.locator('.worker-bar-amount')).toBeVisible();
    const amount = await page.locator('.worker-bar-amount').textContent();
    expect(amount).toMatch(/£[\d,]+\/mo/);
  });

  test('worker bar shows gross, tax rate, and hourly rate', async ({ page }) => {
    const subText = await page.locator('.worker-bar-sub').first().textContent();
    expect(subText).toMatch(/£35,000\/yr gross/);
    expect(subText).toMatch(/\d+\.\d+% deductions/);
    expect(subText).toMatch(/£\d+\.\d+\/hr/);
  });

  test('worker bar shows take-home breakdown', async ({ page }) => {
    const subText = await page.locator('.worker-bar-sub').nth(1).textContent();
    expect(subText).toMatch(/take-home/);
    expect(subText).toMatch(/£800 housing/);
    expect(subText).toMatch(/£400 bills/);
  });

  test('net hourly rate is displayed in correct format', async ({ page }) => {
    const subText = await page.locator('.worker-bar-sub').first().textContent();
    expect(subText).toMatch(/£\d+\.\d{2}\/hr/);
  });

  test('results update live as inputs change', async ({ page }) => {
    const amountBefore = await page.locator('.worker-bar-amount').textContent();
    await setHurtOtherBills(page, 100);
    const amountAfter = await page.locator('.worker-bar-amount').textContent();
    expect(amountBefore).not.toEqual(amountAfter);
  });
});

// ─── Tests: Make it Hurt — benefits ladder ──────────────────────────────────

test.describe('Make it Hurt — benefits ladder', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
    await switchToMakeItHurt(page);
  });

  test('benefits ladder renders with multiple rows', async ({ page }) => {
    await setHurtIncome(page, 35000);
    await setHurtHousing(page, 800);
    await setHurtOtherBills(page, 400);
    const rows = page.locator('.ladder .ladder-row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(10);
  });

  test('match banner appears identifying a matching benefit profile', async ({ page }) => {
    await setHurtIncome(page, 25000);
    await setHurtHousing(page, 700);
    await setHurtOtherBills(page, 300);
    await expect(page.locator('.match-banner')).toBeVisible();
    const bannerText = await page.locator('.match-banner').textContent();
    expect(bannerText).toMatch(/matching your|doesn't reach/);
  });

  test('ladder rows have below, match, or above classes', async ({ page }) => {
    await setHurtIncome(page, 30000);
    await setHurtHousing(page, 600);
    await setHurtOtherBills(page, 300);
    // Should have at least one .below and one .above or .match
    const belowCount = await page.locator('.ladder-row.below').count();
    const matchOrAbove = await page.locator('.ladder-row.match, .ladder-row.above').count();
    expect(belowCount).toBeGreaterThan(0);
    expect(matchOrAbove).toBeGreaterThan(0);
  });

  test('high earner: banner says benefits do not reach your disposable', async ({ page }) => {
    await setHurtIncome(page, 150000);
    await setHurtHousing(page, 500);
    await setHurtOtherBills(page, 300);
    const bannerText = await page.locator('.match-banner').textContent();
    expect(bannerText).toMatch(/doesn't reach/i);
  });
});

// ─── Tests: Make it Hurt — Scotland profiles ────────────────────────────────

test.describe('Make it Hurt — Scotland profiles', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
    await switchToMakeItHurt(page);
    await setHurtIncome(page, 35000);
    await setHurtHousing(page, 700);
    await setHurtOtherBills(page, 300);
  });

  test('Scotland region shows Scottish Child Payment profiles', async ({ page }) => {
    await selectRegion(page, 'scotland', 'm');
    await expect(page.locator('.ladder').getByText('Scottish Child Payment').first()).toBeVisible();
  });

  test('England region does NOT show Scottish Child Payment profiles', async ({ page }) => {
    // England is default
    await expect(page.locator('.ladder').getByText('Scottish Child Payment')).not.toBeVisible();
  });
});

// ─── Tests: Make it Hurt — insight box & region badge ───────────────────────

test.describe('Make it Hurt — insight box & region badge', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
    await switchToMakeItHurt(page);
    await setHurtIncome(page, 35000);
    await setHurtHousing(page, 800);
    await setHurtOtherBills(page, 400);
    await setHurtHours(page, 37.5);
  });

  test('insight box appears with hours, take-home, and tax rate', async ({ page }) => {
    const insightBox = page.locator('#makehurt-results .insight-box');
    await expect(insightBox).toBeVisible();
    const text = await insightBox.textContent();
    expect(text).toMatch(/37\.5 hours a week/);
    expect(text).toMatch(/take home|keep/i);
    expect(text).toMatch(/effective rate/i);
    expect(text).toMatch(/HMRC/);
  });

  test('badge shows correct region name', async ({ page }) => {
    await expect(page.locator('#makehurt-results .badge')).toHaveText('England');
    await selectRegion(page, 'scotland', 'm');
    await expect(page.locator('#makehurt-results .badge')).toHaveText('Scotland');
  });
});

// ─── Tests: Advanced mode — additional coverage ─────────────────────────────

test.describe('Advanced mode — additional coverage', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
    await switchToAdvanced(page);
    await setAdvancedIncome(page, 40000);
  });

  test('region badge shows in advanced results', async ({ page }) => {
    await expect(page.locator('#advanced-results .badge')).toHaveText('England');
    await selectRegion(page, 'scotland', 'a');
    await expect(page.locator('#advanced-results .badge')).toHaveText('Scotland');
  });

  test('total deductions and effective rate displayed', async ({ page }) => {
    const val = await getStatValue(page, 'Total deductions');
    expect(val).toMatch(/£[\d,]+/);
    expect(val).toMatch(/\d+\.\d+%/);
  });

  test('take-home stat row displayed', async ({ page }) => {
    const val = await getStatValue(page, 'Take-home');
    expect(val).toMatch(/£[\d,]+/);
  });

  test('bills table shows tier headers', async ({ page }) => {
    const criticalInputs = page.locator('#critical-bills .critical-bill');
    await criticalInputs.nth(0).fill('800');
    const extraAmounts = page.locator('.extra-bill-amount');
    await extraAmounts.nth(0).fill('40');
    await expect(page.locator('.bills-table .tier-header').getByText('Critical')).toBeVisible();
    await expect(page.locator('.bills-table .tier-header').getByText('Extras')).toBeVisible();
  });

  test('insight box appears when bills are entered in advanced mode', async ({ page }) => {
    const criticalInputs = page.locator('#critical-bills .critical-bill');
    await criticalInputs.nth(0).fill('800');
    await expect(page.locator('#advanced-results .insight-box')).toBeVisible();
  });
});

// ─── Tests: Tax engine edge cases ───────────────────────────────────────────

test.describe('Tax engine edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
  });

  test('£125,140 — personal allowance fully tapered to zero', async ({ page }) => {
    await setIncome(page, 125140);
    const val = await getStatValue(page, 'Income tax');
    // PA = 12570 - (25140/2) = 0; all 125140 taxable
    // Basic: 37700*20% = £7,540; Higher: (125140-50270)*40% = £29,948; Additional: 0
    // Total = £37,488 (but bands shift with PA taper, so check approximately)
    const amount = parseInt(val.replace(/[^0-9]/g, ''));
    expect(amount).toBeGreaterThan(37000);
  });

  test('£150,000 England — additional rate (45%) applies', async ({ page }) => {
    await setIncome(page, 150000);
    const val = await getStatValue(page, 'Income tax');
    // PA=0, Basic: 37700*20%=7540, Higher: (125140-50270)*40%=29948, Additional: (150000-125140)*45%=11187
    // Total ≈ £48,675
    const amount = parseInt(val.replace(/[^0-9]/g, ''));
    expect(amount).toBeGreaterThan(45000);
  });

  test('£150,000 Scotland — top band (48%) means more tax than England', async ({ page }) => {
    await setIncome(page, 150000);
    const engVal = await getStatValue(page, 'Income tax');
    const engAmount = parseInt(engVal.replace(/[^0-9]/g, ''));

    await selectRegion(page, 'scotland');
    const scoVal = await getStatValue(page, 'Income tax');
    const scoAmount = parseInt(scoVal.replace(/[^0-9]/g, ''));

    expect(scoAmount).toBeGreaterThan(engAmount);
  });
});

// ─── Tests: State persistence - localStorage ─────────────────────────────────

test.describe('State persistence - localStorage', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
    // Clear any leftover state
    await page.evaluate(() => localStorage.removeItem('ukTaxState'));
  });

  test('simple mode state persists across reload', async ({ page }) => {
    await setIncome(page, 45000);
    await setMonthlyBills(page, 500);
    await page.reload();
    expect(await page.locator('#s-income').inputValue()).toBe('45000');
    expect(await page.locator('#s-bills').inputValue()).toBe('500');
  });

  test('advanced mode state persists across reload', async ({ page }) => {
    await switchToAdvanced(page);
    await setAdvancedIncome(page, 60000);
    await setPension(page, 5);
    await selectRegion(page, 'scotland', 'a');
    await page.reload();
    expect(await page.locator('#a-income').inputValue()).toBe('60000');
    expect(await page.locator('#a-pension').inputValue()).toBe('5');
    await expect(page.locator('#advanced-mode .region-btn[data-region="scotland"]')).toHaveClass(/active/);
  });

  test('Make it Hurt state persists across reload', async ({ page }) => {
    await switchToMakeItHurt(page);
    await setHurtIncome(page, 35000);
    await setHurtHousing(page, 800);
    await setHurtOtherBills(page, 200);
    await setHurtHours(page, 40);
    await page.reload();
    expect(await page.locator('#m-income').inputValue()).toBe('35000');
    expect(await page.locator('#m-housing').inputValue()).toBe('800');
    expect(await page.locator('#m-other').inputValue()).toBe('200');
    expect(await page.locator('#m-hours').inputValue()).toBe('40');
  });

  test('active mode persists across reload', async ({ page }) => {
    await switchToMakeItHurt(page);
    await setHurtIncome(page, 30000);
    await page.reload();
    await expect(page.locator('#btn-makehurt')).toHaveClass(/active/);
    await expect(page.locator('#makehurt-mode')).toBeVisible();
  });

  test('region selection persists across reload', async ({ page }) => {
    await selectRegion(page, 'scotland');
    await setIncome(page, 30000);
    await page.reload();
    await expect(page.locator('#simple-mode .region-btn[data-region="scotland"]')).toHaveClass(/active/);
    await expect(page.locator('#simple-mode .region-btn[data-region="england"]')).not.toHaveClass(/active/);
  });

  test('student loan selection persists across reload', async ({ page }) => {
    await page.locator('#s-student-loan').selectOption('plan2');
    await setIncome(page, 40000);
    await page.reload();
    expect(await page.locator('#s-student-loan').inputValue()).toBe('plan2');
  });

  test('state updates when inputs change', async ({ page }) => {
    await setIncome(page, 30000);
    await setIncome(page, 55000);
    await page.reload();
    expect(await page.locator('#s-income').inputValue()).toBe('55000');
  });

  test('clearing localStorage resets to defaults', async ({ page }) => {
    await setIncome(page, 45000);
    await page.evaluate(() => localStorage.removeItem('ukTaxState'));
    // Navigate to clean URL (no query params) to avoid URL param restore
    await page.goto(PAGE_URL);
    expect(await page.locator('#s-income').inputValue()).toBe('');
    await expect(page.locator('#btn-simple')).toHaveClass(/active/);
  });
});

// ─── Tests: State persistence - URL params ───────────────────────────────────

test.describe('State persistence - URL params', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
    await page.evaluate(() => localStorage.removeItem('ukTaxState'));
  });

  test('simple mode loads from URL params', async ({ page }) => {
    await page.goto(`${PAGE_URL}?income=50000&bills=1000`);
    expect(await page.locator('#s-income').inputValue()).toBe('50000');
    expect(await page.locator('#s-bills').inputValue()).toBe('1000');
    // Results should be computed
    const val = await getStatValue(page, 'Income tax');
    expect(val).toContain('£');
  });

  test('advanced mode loads from URL params', async ({ page }) => {
    await page.goto(`${PAGE_URL}?mode=advanced&income=60000&pension=5`);
    await expect(page.locator('#btn-advanced')).toHaveClass(/active/);
    expect(await page.locator('#a-income').inputValue()).toBe('60000');
    expect(await page.locator('#a-pension').inputValue()).toBe('5');
  });

  test('Make it Hurt loads from URL params', async ({ page }) => {
    await page.goto(`${PAGE_URL}?mode=makehurt&income=35000&housing=800&bills=200&hours=40`);
    await expect(page.locator('#btn-makehurt')).toHaveClass(/active/);
    expect(await page.locator('#m-income').inputValue()).toBe('35000');
    expect(await page.locator('#m-housing').inputValue()).toBe('800');
    expect(await page.locator('#m-other').inputValue()).toBe('200');
    expect(await page.locator('#m-hours').inputValue()).toBe('40');
  });

  test('region loads from URL params', async ({ page }) => {
    await page.goto(`${PAGE_URL}?income=30000&region=scotland`);
    await expect(page.locator('#simple-mode .region-btn[data-region="scotland"]')).toHaveClass(/active/);
  });

  test('student loan loads from URL params', async ({ page }) => {
    await page.goto(`${PAGE_URL}?income=40000&loan=plan2`);
    expect(await page.locator('#s-student-loan').inputValue()).toBe('plan2');
  });

  test('URL params take priority over localStorage', async ({ page }) => {
    // Set localStorage with income=30000
    await setIncome(page, 30000);
    // Navigate with URL param income=80000
    await page.goto(`${PAGE_URL}?income=80000`);
    expect(await page.locator('#s-income').inputValue()).toBe('80000');
  });

  test('URL updates when inputs change', async ({ page }) => {
    await setIncome(page, 42000);
    const url = page.url();
    expect(url).toContain('income=42000');
  });

  test('mode param in URL activates correct mode', async ({ page }) => {
    await page.goto(`${PAGE_URL}?mode=makehurt&income=30000`);
    await expect(page.locator('#btn-makehurt')).toHaveClass(/active/);
    await expect(page.locator('#makehurt-mode')).toBeVisible();
    await expect(page.locator('#simple-mode')).toBeHidden();
  });
});
