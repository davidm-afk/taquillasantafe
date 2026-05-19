const fs = require('fs');

const originalHTML = fs.readFileSync('index.html', 'utf8');

// The common head and modals end before <div class="app-container">
const splitHeaderIdx = originalHTML.indexOf('<div class="app-container">');
const commonHeader = originalHTML.substring(0, splitHeaderIdx + '<div class="app-container">\n'.length);

const commonFooter = `
    </div>
    <script src='app.js'></script>
</body>
</html>
`;

function extractView(id) {
    const startTag = `<div id="${id}"`;
    const startIdx = originalHTML.indexOf(startTag);
    if (startIdx === -1) return '';
    
    let depth = 0;
    let endIdx = -1;
    let inTag = false;
    let closing = false;
    
    // Very simple matcher for this specific well-formatted file
    // We know each view is just a single <div id="...">...</div> at the top level of app-container
    // A regex is easier here because we know the order of views
    return '';
}

// Better to use regex to find the views
const loginMatch = originalHTML.match(/<div id="loginView"[\s\S]*?<\/button>\s*<\/div>\s*<\/div>/);
const adminMatch = originalHTML.match(/<div id="adminView"[\s\S]*?<\/button>\s*<\/div>\s*<\/div>/);
const posMatch = originalHTML.match(/<div id="posView"[\s\S]*?<\/div>\s*<\/div>/);
// For posView we must be careful. Let's just find them by index.

function getBlock(html, startString) {
    const startIdx = html.indexOf(startString);
    if (startIdx === -1) return '';
    let i = startIdx;
    let depth = 0;
    let result = '';
    while (i < html.length) {
        if (html.substring(i, i + 4) === '<div') {
            depth++;
            result += '<div';
            i += 4;
        } else if (html.substring(i, i + 6) === '</div') {
            depth--;
            result += '</div';
            i += 5; // wait, </div is 5 chars, wait we add > later
        } else {
            result += html[i];
            i++;
        }
        if (depth === 0 && result.length > 10) { // we closed the initial div
            // find the closing >
            while (i < html.length && html[i-1] !== '>') {
                result += html[i];
                i++;
            }
            return result;
        }
    }
    return result;
}

const loginView = getBlock(originalHTML, '<div id="loginView"');
const adminView = getBlock(originalHTML, '<div id="adminView"');
const posView = getBlock(originalHTML, '<div id="posView"');
const cafeView = getBlock(originalHTML, '<div id="cafeView"');
const tabsCafeView = getBlock(originalHTML, '<div id="tabsCafeView"');

// Fix display: none on the views
function showView(viewHtml) {
    // The views might have style="display:none;" or just class="view-panel" which is display:none by default.
    // In our new MPA, we want them visible. 
    // We can just add inline style="display:flex" or "display:block" or "display:grid!important"
    // But .view-panel by default is display: none.
    // The easiest way is to remove .view-panel or add a class that makes it visible.
    // For split-view it has display: grid !important. For login it has nothing, we can add style="display:flex;"
    return viewHtml.replace('class="view-panel"', 'class="view-panel active-view" style="display:flex;"')
                   .replace('class="view-panel split-view"', 'class="view-panel split-view" style="display:grid !important;"');
}

// Reconstruct products for Cafeteria
const userProductsHTML = `
                    <div class="adicional-item cafe-row" data-nombre="Coca cola" data-precio="39"><span>Coca cola ($39)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Coca Light" data-precio="39"><span>Coca Light ($39)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Coca Zero" data-precio="39"><span>Coca Zero ($39)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Sprite" data-precio="39"><span>Sprite ($39)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Fanta" data-precio="39"><span>Fanta ($39)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Mundet" data-precio="39"><span>Mundet ($39)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Fresca" data-precio="39"><span>Fresca ($39)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Delaware Punch" data-precio="39"><span>Delaware ($39)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Jugo Valle" data-precio="39"><span>Jugo Valle ($39)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Fuze Tea" data-precio="35"><span>Fuze Tea ($35)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Topochico" data-precio="39"><span>Topochico ($39)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Powerade" data-precio="49"><span>Powerade ($49)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Agua" data-precio="35"><span>Botella Agua ($35)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Agua de sabor" data-precio="60"><span>Agua de sabor ($60)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Garrafon Agua Simple" data-precio="110"><span>Garrafon Nat. ($110)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Garrafon Agua Sabor" data-precio="130"><span>Garrafon Sab. ($130)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Vaso con hielo" data-precio="5"><span>Vaso con hielo ($5)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>

                <div class="section-title" style="color:var(--cafe); border-color:var(--cafe); margin-top:20px; grid-column: span 2;">Snacks y Comida</div>
                    <div class="adicional-item cafe-row" data-nombre="Palomitas" data-precio="80"><span>Palomitas ($80)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Pizza" data-precio="250"><span>Pizza entera ($250)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Rebanada de pizza" data-precio="30"><span>Rebanada Pizza ($30)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Nuggets" data-precio="120"><span>Nuggets ($120)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Burguer Sencilla" data-precio="140"><span>Hamburguesa Sen. ($140)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Hamburguesa especial" data-precio="160"><span>Hamburguesa Esp. ($160)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Hotdog (2)" data-precio="120"><span>Hotdog x2 ($120)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Hotdog pizza" data-precio="150"><span>Hotdog pizza ($150)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Chicken Tenders" data-precio="120"><span>Chicken Tenders ($120)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Papas Francesa" data-precio="120"><span>Papas Francesa ($120)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Dedos Queso" data-precio="120"><span>Dedos Queso ($120)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Boneless" data-precio="120"><span>Boneless ($120)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Crazy Papas" data-precio="105"><span>Crazy Papas ($105)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Vaso Loco" data-precio="60"><span>Vaso Loco ($60)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Helado Frozen" data-precio="80"><span>Frozen Lab ($80)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Charola de verdura" data-precio="170"><span>Charola Verdura ($170)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Charola de verdura especial" data-precio="299"><span>Charola Esp. ($299)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Extra queso amarillo" data-precio="25"><span>Extra queso ($25)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>

                <div class="section-title" style="color:var(--cafe); border-color:var(--cafe); margin-top:20px; grid-column: span 2;">Combos Especiales y Promos</div>
                    <div class="adicional-item cafe-row" data-nombre="Combo Hamburguesa" data-precio="220"><span>Combo Burguer ($220)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
                    <div class="adicional-item cafe-row" data-nombre="Combo SkyFriends" data-precio="379"><span>Combo SkyFriends ($379)</span>
                        <div class="qty-wrapper"><button type="button" class="btn-qty minus"
                                onclick="modQty(this, -1, 'C')">-</button><input type="number" class="c-qty" min="0"
                                oninput="calcularCafe()"><button type="button" class="btn-qty plus"
                                onclick="modQty(this, 1, 'C')">+</button></div>
                    </div>
`;

// Convert userProductsHTML to the new format
let newCafeProducts = userProductsHTML.replace(/<div class="adicional-item cafe-row"/g, '<div class="product-card cafe-card cafe-row"');
newCafeProducts = newCafeProducts.replace(/<span>/g, '<span style="color:#fbbf24;">');
// Update the input styling to match the new dark mode design
newCafeProducts = newCafeProducts.replace(/class="c-qty" min="0"\s*oninput="calcularCafe\(\)"/g, 'class="c-qty" min="0" oninput="calcularCafe()" style="background:#0f172a; border:none; color:white; width:40px;"');

// Replace the truncated list in cafeView with the new products
const truncatedMarker = '<!-- (Products list truncated for brevity as per instructions) -->';
let newCafeView = cafeView.replace(truncatedMarker, newCafeProducts);

// Now write out the files
fs.writeFileSync('index.html', commonHeader + showView(loginView) + commonFooter);
fs.writeFileSync('admin.html', commonHeader + showView(adminView) + commonFooter);
fs.writeFileSync('taquilla.html', commonHeader + showView(posView) + commonFooter);
fs.writeFileSync('cafeteria.html', commonHeader + showView(newCafeView) + showView(tabsCafeView) + commonFooter);

console.log("Files successfully generated!");
