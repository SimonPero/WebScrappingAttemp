async function updateProdComparison() {
    const res = await fetch("http://localhost:8080/cargarDatos");
    const data = await res.json();

    const prodsSection = document.querySelector('.prods');
    prodsSection.innerHTML = '';

    data.forEach(file => {
        const { filename, content } = file;

        const section = document.createElement('section');
        const heading = document.createElement('h3');
        heading.textContent = `Products from ${filename}`;
        section.appendChild(heading);

        content.forEach(product => {
            const productDiv = document.createElement('div');
            productDiv.className = 'product';

            productDiv.innerHTML = `
                <h4>${product.title}</h4>
                <p>Price: ${product.price}</p>
                <p>Discount: ${product.discountPrice || 'N/A'}</p>
                <p>Installments: ${product.installments || 'N/A'}</p>
                <p>Color: ${product.color || 'N/A'}</p>
                <img src="https:${product.images.primary}" alt="${product.title}">
            `;

            section.appendChild(productDiv);
        });

        prodsSection.appendChild(section);
    });
}

async function sumOfAllPrices() {
    const res = await fetch("http://localhost:8080/sumOfAllPrices");
    const data = await res.json();

    const prodsSection = document.querySelector('.prods');
    prodsSection.innerHTML = '';

    data.forEach(file => {
        const { filename, money } = file;

        const section = document.createElement('section');
        const heading = document.createElement('h3');
        heading.textContent = `Products from ${filename}`;
        section.appendChild(heading);

        const productDiv = document.createElement('div');
        productDiv.className = 'product';

        productDiv.innerHTML = `
                <h4>Sum Of All Prices</h4>
                <p>${money}</p>

            `;

        section.appendChild(productDiv);

        prodsSection.appendChild(section);
    });
}