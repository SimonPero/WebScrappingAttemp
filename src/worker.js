import { parentPort } from 'worker_threads';

parentPort.on('message', (data) => {
    console.log(`Worker processing: ${data.filename}`);
    let money = 0;

    for (let i = 0; i < data.content.length; i++) {
        let price = data.content[i].price;

        if (typeof price === 'string') {
            price = price.replace(/[^\d,.-]/g, '');
            price = price.replace(/\./g, '').replace(',', '.');
        }
        price = parseFloat(price);
        if (!isNaN(price)) {
            money += price;
        } else {
            console.warn(`Invalid price value for item at index ${i}:`, data.content[i].price);
        }
    }

    console.log(`Total money for ${data.filename}:`, money);
    parentPort.postMessage({ filename: data.filename, money });
});