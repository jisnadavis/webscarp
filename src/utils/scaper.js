const puppeteer = require('puppeteer')
const fs = require('fs')

const pcArray = []

const scraper = async (url) => {
  const browser = await puppeteer.launch({ headless: false })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1080, height: 1024 })
    await page.goto(url)

    await handleCookiesAndNotifications(page)

    await repeatScraping(page)
  } catch (error) {
    console.error('Error navigating or scraping:', error)
  } finally {
    await browser.close()
  }
}

const handleCookiesAndNotifications = async (page) => {
  try {
    const cookieButton = await page.$('#cookiesAcceptAll')
    if (cookieButton) {
      console.log('Accepting cookies...')
      await cookieButton.click()
      await page.waitForSelector('body') // Wait for the popup to close
    }

    const notificationsButton = await page.$(
      'button[aria-label="Allow"], button[title="Allow"]'
    )

    if (notificationsButton) {
      console.log('Allowing notifications...')
      await notificationsButton.click()
      await page.waitForSelector('body') // Wait for the popup to close
    }
  } catch (error) {
    console.error('Error handling cookies or notifications:', error)
  }
}

const repeatScraping = async (page) => {
  try {
    while (true) {
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

      const nextButton = await page.$(
        'button[aria-label="Página siguiente"][data-testid="icon_right"]'
      )

      if (!nextButton) {
        break // Exit loop if there is no next button
      }

      await nextButton.click()
      await page.waitForNavigation({ waitUntil: 'networkidle0' }) // Wait for navigation to complete
      await handleCookiesAndNotifications(page) // Handle cookies and notifications on each new page
    }
  } catch (error) {
    console.error('Error scraping products:', error)
  } finally {
    await writeToFile(pcArray)
  }
}

const writeToFile = (data) => {
  fs.writeFileSync('computer.json', JSON.stringify(data, null, 2))
  console.log('File written successfully.')
}

// URL to scrape
const url = 'https://www.pccomponentes.com/portatiles/mas-relevantes'
scraper(url)
