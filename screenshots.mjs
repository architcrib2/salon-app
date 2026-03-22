/**
 * KaratOS Salon — screenshot all pages.
 * Logs in then captures every main page at 1440×900.
 */
import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const BASE = 'http://localhost:5173'
const OUT  = path.join('/Users/architchauhan/Desktop', 'KaratOS Screenshots')

const PAGES = [
  // Public (no login needed)
  { name: '00 - Login',               url: '/login',               auth: false },
  { name: '01 - Online Booking',       url: '/book',                auth: false },
  { name: '02 - Queue Display',        url: '/queue-display',       auth: false },
  // Authenticated
  { name: '03 - Dashboard',            url: '/',                    auth: true  },
  { name: '04 - Appointments',         url: '/appointments',        auth: true  },
  { name: '05 - Customers',            url: '/customers',           auth: true  },
  { name: '06 - Billing',              url: '/billing',             auth: true  },
  { name: '07 - Create Invoice',       url: '/billing/new',         auth: true  },
  { name: '08 - Walk-in Billing',      url: '/billing/walkin',      auth: true  },
  { name: '09 - Services',             url: '/services',            auth: true  },
  { name: '10 - Inventory',            url: '/inventory',           auth: true  },
  { name: '11 - Analytics',            url: '/analytics',           auth: true  },
  { name: '12 - Customer Intelligence',url: '/analytics/intelligence', auth: true },
  { name: '13 - Staff',                url: '/staff',               auth: true  },
  { name: '14 - Waitlist',             url: '/waitlist',            auth: true  },
  { name: '15 - Memberships',          url: '/memberships',         auth: true  },
  { name: '16 - Campaigns',            url: '/campaigns',           auth: true  },
  { name: '17 - Notifications',        url: '/notifications',       auth: true  },
  { name: '18 - Booking Requests',     url: '/booking-requests',    auth: true  },
]

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 15000 })
  await page.waitForSelector('input[type="text"], input[name="username"], input[placeholder*="user" i]', { timeout: 5000 })
  // Fill credentials
  const inputs = await page.$$('input')
  for (const inp of inputs) {
    const type = await inp.evaluate(el => el.type)
    const placeholder = await inp.evaluate(el => el.placeholder.toLowerCase())
    if (type === 'text' || placeholder.includes('user') || placeholder.includes('phone')) {
      await inp.click({ clickCount: 3 })
      await inp.type('admin')
    } else if (type === 'password') {
      await inp.click({ clickCount: 3 })
      await inp.type('demo1234')
    }
  }
  await page.keyboard.press('Enter')
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
  await new Promise(r => setTimeout(r, 1500))
  console.log('  ✓ Logged in')
}

async function screenshot(page, name, url) {
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle2', timeout: 20000 })
    await new Promise(r => setTimeout(r, 1800)) // let charts/data render
    const file = path.join(OUT, `${name}.png`)
    await page.screenshot({ path: file, fullPage: false })
    console.log(`  ✓ ${name}`)
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message.split('\n')[0]}`)
  }
}

;(async () => {
  // Create output folder
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  console.log(`\nSaving screenshots to: ${OUT}\n`)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  // Capture public pages first (no auth)
  for (const p of PAGES.filter(p => !p.auth)) {
    await screenshot(page, p.name, p.url)
  }

  // Login once, then capture all authenticated pages
  console.log('\nLogging in...')
  await login(page)

  for (const p of PAGES.filter(p => p.auth)) {
    await screenshot(page, p.name, p.url)
  }

  await browser.close()
  console.log(`\n✅ Done! ${PAGES.length} screenshots saved to:\n   ${OUT}\n`)
})()
