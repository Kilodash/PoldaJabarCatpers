import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ defaultViewport: { width: 1280, height: 800 } });
    const page = await browser.newPage();

    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });

    await page.type('input[type="email"]', 'admin@poldajabar.go.id');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'dashboard.png' });

    await page.goto('http://localhost:5173/pengaturan', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'pengaturan.png' });

    await page.goto('http://localhost:5173/personel', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'personel.png' });

    console.log("Screenshots captured.");
    await browser.close();
})();
