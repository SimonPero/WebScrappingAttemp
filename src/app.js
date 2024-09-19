import express from "express"
import openWebPage from "../utils/scrapping.js";
import * as fs from "node:fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

const app = express()
const PORT = 8080
const urls = [
    "https://www.keito.com.ar/productos",
    "https://www.benka.com.ar/productos",
    "https://www.orsobianco.com.ar/productos"
];


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../public')));


app.get("/cargarDatos", async (req, res) => {
    async function webScrap(){
        const promises = urls.map(url => openWebPage(url));
        await Promise.all(promises);
    }
    try {
        await webScrap()
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