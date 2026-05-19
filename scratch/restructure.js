const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Remove the global <div class="container">
html = html.replace('<body>\n    <div class="container">', '<body>\n    <div class="app-wrapper">');

// We'll rename it to app-wrapper.
// Wait, login, admin, tabs need .container or we can just apply styles directly via CSS.
// The CSS I wrote earlier uses #loginView, #adminView, #tabsCafeView for styling.

// 1. Refactor posView
let posViewRegex = /<div id="posView">([\s\S]*?)<\/div>\s*<div id="adminView">/;
let posViewMatch = html.match(posViewRegex);
if(posViewMatch) {
    let posContent = posViewMatch[1];
    
    // Extract header
    let headerRegex = /<div class="header">[\s\S]*?<\/div>/;
    let header = posContent.match(headerRegex)[0];
    
    // Extract form inner content
    let formRegex = /<form id="posForm">([\s\S]*?)<\/form>/;
    let formMatch = posContent.match(formRegex);
    let formContent = formMatch[1];
    
    // Extract everything up to Total Box (these are the products)
    let totalBoxIndex = formContent.indexOf('<div class="total-box">');
    let productsPart = formContent.substring(0, totalBoxIndex);
    
    // Change ticket-row and adicional-item to product-card products-grid
    productsPart = productsPart.replace(/<div class="ticket-row/g, '<div class="product-card');
    productsPart = productsPart.replace(/<div class="adicional-item/g, '<div class="product-card');
    
    // Wrap groups between section-title in products-grid
    // We can just add <div class="products-grid"> after each section-title and close it before the next section-title or end.
    let parts = productsPart.split('<div class="section-title">');
    let newProductsPart = parts[0];
    for(let i=1; i<parts.length; i++) {
        let titleEndIndex = parts[i].indexOf('</div>');
        let title = parts[i].substring(0, titleEndIndex);
        let content = parts[i].substring(titleEndIndex + 6);
        newProductsPart += `<div class="section-title">${title}</div>\n<div class="products-grid">\n${content}\n</div>\n`;
    }
    
    // Format product-card contents to separate info and actions
    // This is a bit complex with regex, let's just leave the internal HTML as is for now, 
    // or fix it with CSS flex-direction: column which already works well!
    // I can just change ticket-info to product-info, ticket-inputs to product-actions
    newProductsPart = newProductsPart.replace(/ticket-info/g, 'product-info');
    newProductsPart = newProductsPart.replace(/ticket-inputs/g, 'product-actions');
    
    let sidebarPart = formContent.substring(totalBoxIndex);
    
    // Also hidden inputs should go to sidebar
    let hiddenInputsRegex = /<input type="hidden"[\s\S]*?>/g;
    let hiddenInputs = "";
    let match;
    while ((match = hiddenInputsRegex.exec(newProductsPart)) !== null) {
        hiddenInputs += match[0] + "\n";
    }
    // Remove hidden inputs from newProductsPart
    newProductsPart = newProductsPart.replace(/<input type="hidden"[\s\S]*?>\s*/g, '');
    
    let newPosView = `
        <div id="posView" class="split-view">
            ${header}
            <div class="main-pane">
                ${newProductsPart}
            </div>
            <div class="sidebar-pane">
                <form id="posForm">
                    ${hiddenInputs}
                    ${sidebarPart}
                </form>
                <div id="mensajeTaq" class="loading">✓ Venta registrada e impresa</div>
            </div>
        </div>
    `;
    
    // Remove <div id="mensajeTaq"... from original if it was outside form
    newPosView = newPosView.replace('<div id="mensajeTaq" class="loading">✓ Venta registrada e impresa</div>\n    </div>', '');
    
    html = html.replace(posViewMatch[0], newPosView + '\n        <div id="adminView">');
}

// 2. Refactor cafeView
let cafeViewRegex = /<div id="cafeView">([\s\S]*?)<\/div>\s*<div id="tabsCafeView">/;
let cafeViewMatch = html.match(cafeViewRegex);
if(cafeViewMatch) {
    let cafeContent = cafeViewMatch[1];
    
    let headerRegex = /<div class="header">[\s\S]*?<\/div>/;
    let header = cafeContent.match(headerRegex)[0];
    
    let formRegex = /<form id="cafeForm">([\s\S]*?)<\/form>/;
    let formMatch = cafeContent.match(formRegex);
    let formContent = formMatch[1];
    
    let totalBoxIndex = formContent.indexOf('<div class="total-box cafe-total">');
    let productsPart = formContent.substring(0, totalBoxIndex);
    
    productsPart = productsPart.replace(/<div class="adicional-item/g, '<div class="product-card cafe-card');
    
    let parts = productsPart.split('<div class="section-title"');
    let newProductsPart = parts[0];
    for(let i=1; i<parts.length; i++) {
        let titleEndIndex = parts[i].indexOf('</div>');
        let titleLine = parts[i].substring(0, titleEndIndex);
        let content = parts[i].substring(titleEndIndex + 6);
        newProductsPart += `<div class="section-title"${titleLine}</div>\n<div class="products-grid">\n${content}\n</div>\n`;
    }
    
    let sidebarPart = formContent.substring(totalBoxIndex);
    
    let hiddenInputsRegex = /<input type="hidden"[\s\S]*?>/g;
    let hiddenInputs = "";
    let match;
    while ((match = hiddenInputsRegex.exec(newProductsPart)) !== null) {
        hiddenInputs += match[0] + "\n";
    }
    newProductsPart = newProductsPart.replace(/<input type="hidden"[\s\S]*?>\s*/g, '');
    
    let newCafeView = `
        <div id="cafeView" class="split-view">
            ${header}
            <div class="main-pane">
                ${newProductsPart}
            </div>
            <div class="sidebar-pane">
                <form id="cafeForm">
                    ${hiddenInputs}
                    ${sidebarPart}
                </form>
                <div id="mensajeCafe" class="loading">✓ Venta registrada e impresa</div>
            </div>
        </div>
    `;
    
    html = html.replace(cafeViewMatch[0], newCafeView + '\n        <div id="tabsCafeView">');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log("Transformation completed.");
