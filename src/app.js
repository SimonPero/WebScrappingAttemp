import express from "express"
import openWebPage from "../utils/scrapping.js";
import * as fs from "node:fs/promises";
import path from "path";
import { fileURLToPath } from 'url';
import { Worker } from "node:worker_threads";

const app = express()
const PORT = 8080
const pages = [
    {
        name: "keito.com.ar",
        urls: ["https://www.keito.com.ar/productos"]
    },
    {
        name: "benka.com.ar",
        urls: ["https://www.benka.com.ar/productos"]
    },
    {
        name: "orsobianco.com.ar",
        urls: ["https://www.orsobianco.com.ar/productos"]
    },
    {
        name: "kill.com.ar",
        urls: [
            "https://www.kill.com.ar/summer-25",
            "https://www.kill.com.ar/premium-outlet/",
            "https://www.kill.com.ar/carteras/",
            "https://www.kill.com.ar/likillda1"
        ]
    },
    {
        name: "zhoue.com.ar",
        urls: [
            "https://www.zhoue.com.ar/invierno-2024/denim3",
            "https://www.zhoue.com.ar/verano-2025/",
            "https://www.zhoue.com.ar/invierno-2024",
        ]
    }
];


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../public')));

async function readJsonFilesRecursively(directoryPath) {
    const data = [];
    const items = await fs.readdir(directoryPath, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(directoryPath, item.name);
        if (item.isDirectory()) {
            const subdirectoryData = await readJsonFilesRecursively(fullPath);
            data.push(...subdirectoryData);
        } else if (item.isFile() && item.name.endsWith('.json')) {
            const fileContent = await fs.readFile(fullPath, 'utf8');
            const jsonData = JSON.parse(fileContent);
            data.push({ filename: item.name, content: jsonData });
        }
    }
    return data;
}

app.get("/cargarDatos", async (req, res) => {
    async function webScrap() {
        const promises = pages.map(url => openWebPage(url));
        await Promise.all(promises);
    }

    try {
        await webScrap()
        const directory = path.join(__dirname, "../data");
        if (await fs.access(directory).then(() => true).catch(() => false)) {
            const data = await readJsonFilesRecursively(directory);
            res.json(data);
        } else {
            res.status(404).send('Data folder not found');
        }
    } catch (error) {
        console.error("Error reading data:", error);
        res.status(500).send('Error processing data');
    }
});
app.get("/sumOfAllPrices", async (req, res) => {
    try {
        const directory = path.join(__dirname, "../data");
        await fs.access(directory);
        const data = await readJsonFilesRecursively(directory);
        const workerCount = 3;
        let queue = data.slice();

        const results = [];

        const workerPromises = new Array(workerCount).fill(null).map((_, i) => {
            return new Promise((resolve) => {
                const worker = new Worker(path.resolve(__dirname, 'worker.js'));
                worker.on('message', (msg) => {
                    results.push(msg);

                    if (queue.length > 0) {
                        const nextData = queue.shift();
                        worker.postMessage(nextData);
                    } else {
                        worker.terminate();
                        resolve();
                    }
                });

                if (queue.length > 0) {
                    const initialData = queue.shift();
                    worker.postMessage(initialData);
                }
            });
        });
        await Promise.all(workerPromises);
        res.json(results);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).send('Data folder not found');
        } else {
            console.error("Error processing data:", error);
            res.status(500).send('Error processing data');
        }
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});