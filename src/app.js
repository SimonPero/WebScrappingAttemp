import express from "express"
import puppeteer from "puppeteer";
import * as fs from "node:fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

const app = express()
const PORT = 8080
const urls = [
    "https://www.keito.com.ar/productos",
    "https://www.laargentina.com/productos",
    "https://www.benka.com.ar/productos",
    "https://www.orsobianco.com.ar/productos"
];


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../public')));

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


app.get("/cargarDatos", async (req, res) => {
    (async () => {
        const promises = urls.map(url => openWebPage(url));
        await Promise.all(promises);
    })();
    try {
        const directory = path.join(__dirname, "../data");

        if (await fs.access(directory).then(() => true).catch(() => false)) {
            const files = await fs.readdir(directory);
            const data = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(directory, file);
                    const fileContent = await fs.readFile(filePath, 'utf8');
                    const jsonData = JSON.parse(fileContent);
                    data.push({ filename: file, content: jsonData });
                }
            }

            res.json(data);
        } else {
            res.status(404).send('Data folder not found');
        }
    } catch (error) {
        console.error("Error reading data:", error);
        res.status(500).send('Error processing data');
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});