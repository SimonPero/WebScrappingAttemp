import puppeteer from "puppeteer";
import * as fs from "node:fs/promises";
import path from "path";

const scrollInfiniteItems = async (page) => {
    let lastScrollHeight = 0;
    let noNewContentCount = 0;
    const MAX_NO_NEW_CONTENT = 1;

    while (true) {
        await page.evaluate(() => {
            const closeElement = document.getElementById('p-close');
            if (closeElement) {
                closeElement.click();
                return true;
            }
            return false;
        });

        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
        await new Promise((resolve) => setTimeout(resolve, 500))

        const currentScrollHeight = await page.evaluate("document.body.scrollHeight");
        if (currentScrollHeight === lastScrollHeight) {
            noNewContentCount++;
        } else {
            noNewContentCount = 0;
        }
        lastScrollHeight = currentScrollHeight;

        await page.evaluate(() => {
            const loadMoreButton = document.querySelector('.js-load-more');
            if (loadMoreButton) {
                const style = window.getComputedStyle(loadMoreButton);
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                    loadMoreButton.click();
                    return 'clicked';
                }
                return 'hidden';
            }
            return 'not found';
        });

        if (noNewContentCount >= MAX_NO_NEW_CONTENT) {
            console.log("No new content after multiple scrolls. Ending.");
            break;
        }

        await new Promise((resolve) => setTimeout(resolve, 500))
    }
};

export default async function openWebPage(url) {
    const browser = await puppeteer.launch({
        headless: true,
    });
    try {
        const directory = `data/${url.name}`;
        await fs.mkdir(directory, { recursive: true });

        for (const urlPage of url.urls) {
            const page = await browser.newPage();
            await page.setViewport({ width: 1080, height: 1024 });
            await page.goto(urlPage, { waitUntil: 'networkidle2' });

            await scrollInfiniteItems(page);

            const productData = await page.evaluate(() => {
                const productContainers = document.querySelectorAll('.js-item-product');

                return [...productContainers].map(productContainer => {
                    const title = productContainer.querySelector('.js-item-name')?.textContent.trim();
                    const price = productContainer.querySelector('.js-price-display')?.textContent.trim();
                    const discountPrice = productContainer.querySelector('.js-payment-discount-price-product')?.textContent.trim();
                    const installments = productContainer.querySelector('.js-installment-price')?.textContent.trim();
                    const productLink = productContainer.querySelector('.item-link')?.getAttribute('href');

                    const imageContainer = productContainer.querySelector('.item-image img');
                    const primaryImageSrc = imageContainer?.getAttribute('data-srcset') || imageContainer?.getAttribute('srcset');

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
                        },
                        sizes,
                        color
                    };
                });
            });

            if (productData && productData.length > 0) {
                const sanitizedFileName = `${sanitizeFileName(urlPage)}.json`;

                const filePath = path.join(directory, sanitizedFileName);

                await fs.writeFile(filePath, JSON.stringify(productData, null, 2));
                console.log(`Saved ${productData.length} products for ${urlPage} to ${filePath}`);
            } else {
                console.error(`No product data found for ${urlPage}`);
            }
        }
    } catch (error) {
        console.error(`Error processing ${url.name}:`, error);
    } finally {
        await browser.close();
    }
}
const sanitizeFileName = (url) => {
    return url.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};