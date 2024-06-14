const puppeteer = require('puppeteer')
const fs = require('fs')

const pcArray = []
const handleCookies = async (page) => {
  try {
    // Accept cookies if the button exists
    const cookieButton = await page.$('#cookiesAcceptAll')
    if (cookieButton) {
      console.log('Accepting cookies...')
      await cookieButton.click()
      await page.waitForSelector('body') // Wait for the body element to ensure the popup is closed
    }
  } catch (error) {
    console.error('Error handling cookies:', error)
  }
}

const scraper = async (url) => {
  const browser = await puppeteer.launch({ headless: false })

  const page = await browser.newPage()
  await page.setViewport({ width: 1080, height: 1024 })
  await page.goto(url, { waitUntil: 'networkidle2' })

  await handleCookies(page) // Handle cookies only on the first page load
  scrapeProducts(page, browser)
}

const scrapeProducts = async (page, browser) => {
  try {
    await page.waitForSelector('.product-card', { timeout: 10000 })

    const products = await page.$$('.product-card')

    for (const product of products) {
      try {
        const title = await product.$eval('img[title]', (img) =>
          img.getAttribute('title')
        )
        const img = await product.$eval('img[title]', (img) => img.src)
        const price = await product.$eval(
          'div.product-card__price-container span',
          (span) => span.textContent.trim().replace('€', '').trim()
        )

        pcArray.push({ title, img, price })
      } catch (error) {
        console.error('Error extracting product data:', error)
      }
    }
  } catch (error) {
    console.error('Error scraping products:', error)
  }

  try {
    await page.$eval(
      'button[aria-label="Página siguiente"][data-testid="icon_right"]',
      (el) => el.click()
    )

    await page.waitForNavigation()
    console.log('pasamos la siguente pagina')
    console.log(`collectados ${pcArray.length}datos `)
    scrapeProducts(page, browser)
  } catch (error) {
    writeToFile(pcArray)
    await browser.close()
  }
}
const writeToFile = (data) => {
  fs.writeFileSync('computer.json', JSON.stringify(data, null, 2))
  console.log('File written successfully.')
}

// URL to scrape
const url = 'https://www.pccomponentes.com/portatiles/mas-relevantes'
scraper(url)
