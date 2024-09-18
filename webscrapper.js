import puppeteer from "puppeteer";
import * as fs from "node:fs/promises";
import path from "node:path";

const urls = [
    "https://www.keito.com.ar/productos",
    "https://www.laargentina.com/productos",
    "https://www.benka.com.ar/productos",
    "https://www.orsobianco.com.ar/productos"
];

async function openWebPage(url) {
    const browser = await puppeteer.launch();
    try {
        console.log(`Processing: ${url}`);
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' }); 

        await page.setViewport({ width: 1080, height: 1024 });

        const productData = await page.evaluate(() => {
            const productContainers = document.querySelectorAll('.js-item-product');

            const products = [...productContainers].map(productContainer => {
                const title = productContainer.querySelector('.js-item-name')?.textContent.trim();
                const price = productContainer.querySelector('.js-price-display')?.textContent.trim();
                const discountPrice = productContainer.querySelector('.js-payment-discount-price-product')?.textContent.trim();
                const installments = productContainer.querySelector('.js-installment-price')?.textContent.trim();
                const productLink = productContainer.querySelector('.item-link')?.getAttribute('href');

                const primaryImageSrc = productContainer.querySelector('.js-item-image-primary')?.getAttribute('data-srcset');
                const secondaryImageSrc = productContainer.querySelector('.js-item-image-secondary')?.getAttribute('data-srcset');

                const sizes = [...productContainer.querySelectorAll('.js-insta-variant')].map(variant => ({
                    size: variant.getAttribute('data-option'),
                    selected: variant.classList.contains('selected'),
                }));

                const color = productContainer.querySelector('.js-color-variants-container .js-insta-variant')?.getAttribute('data-option');

                return {
                    title,
                    price,
                    discountPrice,
                    installments,
                    productLink,
                    images: {
                        primary: primaryImageSrc,
                        secondary: secondaryImageSrc,
                    },
                    sizes,
                    color
                };
            });

            return products;
        });

        if (productData && productData.length > 0) {
            const sanitizedFileName = url.replace(/https?:\/\//, "").replace(/\//g, "_") + ".json";
            const directory = "data";

            await fs.mkdir(directory, { recursive: true }); 
            const filePath = path.join(directory, sanitizedFileName);

            await fs.writeFile(filePath, JSON.stringify(productData, null, 2));
            console.log(`Saved ${productData.length} products for ${url} to ${filePath}`);
        } else {
            console.error(`No product data found for ${url}`);
        }
    } catch (error) {
        console.error(`Error processing ${url}:`, error);
    } finally {
        await browser.close();
    }
}

(async () => {
    const promises = urls.map(url => openWebPage(url));
    await Promise.all(promises);
})();
