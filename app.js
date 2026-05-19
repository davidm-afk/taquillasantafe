const scriptURL = 'https://script.google.com/macros/s/AKfycbw8q6RdD1E7n-l9tCG9FnGgxsRLxuzuzs1WNAGRnu0nGkMDDXLLQq6v9-feKlo_a4d8/exec';

        const usuariosPermitidos = {
            "Yunn": { pin: "2701", rol: "Taquilla" },
            "Tania": { pin: "tania", rol: "Taquilla" },
            "Monse": { pin: "3312", rol: "Cafeteria" },
            "Sandy": { pin: "0312", rol: "Admin" }
        };

        const hoy = new Date();
        const hoyStr = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');

        let maquillajeVendidos = [];
        let vasosTaqVendidos = [];
        let customProductsTaq = [];

        let vasosCafeVendidos = [];
        let refillAguaVendidos = [];
        let jarraAguaVendidas = [];

        let activeTabId = null;

        // Caché del DOM para cálculos rápidos
        let entradaItemsCache = [];
        let adicionalRowsCache = [];
        let cafeRowsCache = [];

        window.onload = () => {
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            const cajeroGuardado = localStorage.getItem('cajeroActivo');
            const rolGuardado = localStorage.getItem('rolActivo');

            if (cajeroGuardado && rolGuardado) {
                enrutarUsuario(cajeroGuardado, rolGuardado);
            } else if (currentPage !== 'index.html' && currentPage !== '') {
                window.location.href = 'index.html';
                return;
            }

            if (document.getElementById('reportDate')) {
                document.getElementById('reportDate').value = hoyStr;
            }

            // Inicializar caché del DOM
            entradaItemsCache = Array.from(document.querySelectorAll('.entrada-item')).map(item => ({
                el: item,
                nombre: item.getAttribute('data-nombre'),
                precio: parseFloat(item.getAttribute('data-precio')),
                incCalc: parseInt(item.getAttribute('data-inc-calcetas')) || 0,
                inputQty: item.querySelector('.t-qty'),
                inputCalc: item.querySelector('.t-calc')
            }));
            adicionalRowsCache = Array.from(document.querySelectorAll('.adicional-row')).map(item => ({
                el: item,
                nombre: item.getAttribute('data-nombre'),
                precio: parseFloat(item.getAttribute('data-precio')),
                inputQty: item.querySelector('.a-qty')
            }));
            cafeRowsCache = Array.from(document.querySelectorAll('.cafe-row')).map(item => ({
                el: item,
                nombre: item.getAttribute('data-nombre'),
                precio: parseFloat(item.getAttribute('data-precio')),
                inputQty: item.querySelector('.c-qty')
            }));

            if(document.getElementById('displayTotal')) calcular(); 
            if(document.getElementById('displayTotalCafe')) calcularCafe();

            const pinInput = document.getElementById('pinInput');
            if (pinInput) {
                pinInput.addEventListener('keypress', function (e) {
                    if (e.key === 'Enter') {
                        iniciarSesion();
                    }
                });
            }
        };

        function modQty(btn, delta, area) {
            const input = btn.parentElement.querySelector('input[type="number"]');
            let val = parseInt(input.value) || 0;
            val += delta;
            if (val < 0) val = 0;
            input.value = val === 0 ? '' : val;
            if (area === 'C') calcularCafe(); else calcular();
        }

        function abrirCustomProductModal() {
            document.getElementById('cpName').value = '';
            document.getElementById('cpPrice').value = '';
            document.getElementById('cpSocks').value = '0';
            document.getElementById('customProductModal').style.display = 'flex';
        }
        function cerrarCustomProductModal() {
            document.getElementById('customProductModal').style.display = 'none';
        }
        function guardarCustomProduct() {
            let name = document.getElementById('cpName').value.trim();
            let price = parseFloat(document.getElementById('cpPrice').value);
            let socks = parseInt(document.getElementById('cpSocks').value) || 0;
            if (!name) return alert("Ingresa un nombre para el producto.");
            if (isNaN(price) || price < 0) return alert("Ingresa un precio válido.");
            customProductsTaq.push({ name: name, price: price, socks: socks });
            renderCustomProducts();
            cerrarCustomProductModal();
            calcular();
        }
        function eliminarCustomProduct(index) {
            customProductsTaq.splice(index, 1);
            renderCustomProducts();
            calcular();
        }
        function renderCustomProducts() {
            let container = document.getElementById('customProductsContainer');
            let html = '';
            customProductsTaq.forEach((cp, index) => {
                let text = `${cp.name} ($${cp.price})`;
                if (cp.socks > 0) text += ` [+${cp.socks} calcetas]`;
                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:8px; border-radius:8px; margin-bottom:5px;">
                        <span style="font-size:0.8rem; color:var(--txt);">${text}</span>
                        <button type="button" style="background:var(--err); color:white; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;" onclick="eliminarCustomProduct(${index})">X</button>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

        function agregarMaquillaje() {
            let p = prompt("Ingresa el precio cobrado por el maquillaje:");
            if (!p || isNaN(p) || p < 0) return;
            maquillajeVendidos.push(parseFloat(p));
            document.getElementById('qtyMaquillaje').value = maquillajeVendidos.length;
            calcular();
        }
        function quitarMaquillaje() {
            if (maquillajeVendidos.length > 0) {
                maquillajeVendidos.pop();
                document.getElementById('qtyMaquillaje').value = maquillajeVendidos.length || '';
                calcular();
            }
        }
        function agregarVasoTaq() {
            let p = prompt("Ingresa el precio cobrado por el Vaso SkyZone:");
            if (!p || isNaN(p) || p < 0) return;
            vasosTaqVendidos.push(parseFloat(p));
            document.getElementById('qtyVasoTaq').value = vasosTaqVendidos.length;
            calcular();
        }
        function quitarVasoTaq() {
            if (vasosTaqVendidos.length > 0) {
                vasosTaqVendidos.pop();
                document.getElementById('qtyVasoTaq').value = vasosTaqVendidos.length || '';
                calcular();
            }
        }
        function agregarVasoCafe() {
            let p = prompt("Ingresa el precio cobrado por el Vaso SkyZone:");
            if (!p || isNaN(p) || p < 0) return;
            vasosCafeVendidos.push(parseFloat(p));
            document.getElementById('qtyVasoCafe').value = vasosCafeVendidos.length;
            calcularCafe();
        }
        function quitarVasoCafe() {
            if (vasosCafeVendidos.length > 0) {
                vasosCafeVendidos.pop();
                document.getElementById('qtyVasoCafe').value = vasosCafeVendidos.length || '';
                calcularCafe();
            }
        }
        function agregarRefillAgua() {
            let p = prompt("Ingresa el precio cobrado por el Refill de Agua:");
            if (!p || isNaN(p) || p < 0) return;
            refillAguaVendidos.push(parseFloat(p));
            document.getElementById('qtyRefillAgua').value = refillAguaVendidos.length;
            calcularCafe();
        }
        function quitarRefillAgua() {
            if (refillAguaVendidos.length > 0) {
                refillAguaVendidos.pop();
                document.getElementById('qtyRefillAgua').value = refillAguaVendidos.length || '';
                calcularCafe();
            }
        }
        function agregarJarraAgua() {
            let p = prompt("Ingresa el precio cobrado por la Jarra de Agua:");
            if (!p || isNaN(p) || p < 0) return;
            jarraAguaVendidas.push(parseFloat(p));
            document.getElementById('qtyJarraAgua').value = jarraAguaVendidas.length;
            calcularCafe();
        }
        function quitarJarraAgua() {
            if (jarraAguaVendidas.length > 0) {
                jarraAguaVendidas.pop();
                document.getElementById('qtyJarraAgua').value = jarraAguaVendidas.length || '';
                calcularCafe();
            }
        }

        function iniciarSesion() {
            const cajero = document.getElementById('cajeroSelect').value;
            const pin = document.getElementById('pinInput').value;
            let rol = null;
            if (usuariosPermitidos[cajero] && usuariosPermitidos[cajero].pin === pin) {
                rol = usuariosPermitidos[cajero].rol;
            }
            if (rol) {
                localStorage.setItem('cajeroActivo', cajero); localStorage.setItem('rolActivo', rol);
                document.getElementById('loginError').style.display = 'none'; enrutarUsuario(cajero, rol);
            } else {
                document.getElementById('loginError').style.display = 'block';
            }
        }

        function enrutarUsuario(cajero, rol) {
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            
            if (rol === "Admin") {
                if (currentPage !== 'admin.html') window.location.href = 'admin.html';
                else {
                    cargarResumen();
                }
            } else if (rol === "Cafeteria") {
                if (currentPage !== 'cafeteria.html') window.location.href = 'cafeteria.html';
                else {
                    document.getElementById('nombreCajeroHeaderCafe').innerText = cajero;
                    document.getElementById('cajeroFinal_cafe').value = cajero;
                }
            } else if (rol === "Taquilla") {
                if (currentPage !== 'taquilla.html') window.location.href = 'taquilla.html';
                else {
                    document.getElementById('nombreCajeroHeader').innerText = cajero;
                    document.getElementById('cajeroFinal_taq').value = cajero;
                }
            }
        }

        function cerrarSesion() {
            localStorage.removeItem('cajeroActivo'); localStorage.removeItem('rolActivo');
            window.location.href = 'index.html';
        }

        function prepararGuardarCuenta() {
            let total = parseFloat(document.getElementById('totalFinal_cafe').value);
            if (total === 0 || isNaN(total)) return alert("El carrito está vacío. Agrega productos primero.");
            let cafeTabs = JSON.parse(localStorage.getItem('cafeTabs')) || {};
            let listContainer = document.getElementById('existingTabsList');
            let html = '';
            if (Object.keys(cafeTabs).length === 0) {
                html = '<span style="color:var(--dim); font-size:0.8rem;">No hay cuentas previas.</span>';
            } else {
                for (let tabId in cafeTabs) {
                    html += `<button type="button" class="btn-tab-list" onclick="abonarCuentaExistente('${tabId}')">👉 ${cafeTabs[tabId].name} ($${cafeTabs[tabId].total.toLocaleString('es-MX', { minimumFractionDigits: 2 })})</button>`;
                }
            }
            listContainer.innerHTML = html;
            document.getElementById('newTabName').value = '';
            document.getElementById('saveTabModal').style.display = 'flex';
        }

        function cerrarModalTabs() { document.getElementById('saveTabModal').style.display = 'none'; }

        function guardarEnCuentaNueva() {
            let name = document.getElementById('newTabName').value.trim();
            if (!name) return alert("Por favor escribe un nombre para la cuenta.");
            procesarGuardadoTab(Date.now().toString(), name);
        }

        function abonarCuentaExistente(tabId) { procesarGuardadoTab(tabId, null); }

        function procesarGuardadoTab(tabId, newName) {
            let cafeTabs = JSON.parse(localStorage.getItem('cafeTabs')) || {};
            let tab = newName ? { id: tabId, name: newName, items: {}, total: 0 } : cafeTabs[tabId];
            cafeRowsCache.forEach(item => {
                const nombre = item.nombre;
                const precio = item.precio;
                const inputQty = item.inputQty;
                let qty = inputQty && inputQty.value ? parseInt(inputQty.value) : 0;
                if (qty > 0) {
                    if (!tab.items[nombre]) tab.items[nombre] = { qty: 0, price: precio };
                    tab.items[nombre].qty += qty;
                    tab.total += (qty * precio);
                }
            });
            vasosCafeVendidos.forEach(p => {
                let name = `Vaso SkyZone ($${p})`;
                if (!tab.items[name]) tab.items[name] = { qty: 0, price: p };
                tab.items[name].qty += 1; tab.total += p;
            });
            refillAguaVendidos.forEach(p => {
                let name = `Refill de Agua ($${p})`;
                if (!tab.items[name]) tab.items[name] = { qty: 0, price: p };
                tab.items[name].qty += 1; tab.total += p;
            });
            jarraAguaVendidas.forEach(p => {
                let name = `Jarra de Agua ($${p})`;
                if (!tab.items[name]) tab.items[name] = { qty: 0, price: p };
                tab.items[name].qty += 1; tab.total += p;
            });
            cafeTabs[tabId] = tab;
            localStorage.setItem('cafeTabs', JSON.stringify(cafeTabs));
            cerrarModalTabs(); limpiarCafe();
            alert(`Guardado en la cuenta: ${tab.name}`);
        }

        function abrirVistaCuentas() {
            document.getElementById('cafeView').style.display = 'none';
            document.getElementById('tabsCafeView').style.display = 'block';
            renderTabsCafe();
        }

        function volverACafeteria() {
            document.getElementById('tabsCafeView').style.display = 'none';
            document.getElementById('cafeView').style.display = '';
        }

        function renderTabsCafe() {
            let cafeTabs = JSON.parse(localStorage.getItem('cafeTabs')) || {};
            let container = document.getElementById('tabsListContainer');
            if (Object.keys(cafeTabs).length === 0) {
                container.innerHTML = '<p style="color:var(--dim); text-align:center; margin-top:30px;">No hay cuentas abiertas.</p>';
                return;
            }
            let html = '';
            for (let tabId in cafeTabs) {
                let tab = cafeTabs[tabId];
                let itemsHtml = '';
                for (let itemName in tab.items) {
                    itemsHtml += `<div style="font-size:0.85rem; color:var(--dim);">- ${tab.items[itemName].qty}x ${itemName}</div>`;
                }
                html += `
                <div class="dash-card" style="text-align:left; border-color:var(--cafe); margin-bottom:15px; background:#1e293b;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <strong style="color:var(--war); font-size:1.1rem;">${tab.name}</strong>
                        <strong style="font-size:1.3rem;">$${tab.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div style="margin-bottom:15px; border-top:1px solid #334155; padding-top:10px;">${itemsHtml}</div>
                    <div style="display:flex; gap:10px;">
                        <button type="button" class="btn-main btn-cafe" style="margin-top:0; padding:12px;" onclick="cobrarTab('${tabId}')">💰 COBRAR</button>
                        <button type="button" class="btn-main" style="margin-top:0; padding:12px; background:transparent; border:1px solid var(--err); color:var(--err);" onclick="eliminarTab('${tabId}')">🗑️</button>
                    </div>
                </div>`;
            }
            container.innerHTML = html;
        }

        function cobrarTab(tabId) {
            let cafeTabs = JSON.parse(localStorage.getItem('cafeTabs'));
            let tab = cafeTabs[tabId];
            let resumenArray = [];
            for (let itemName in tab.items) { resumenArray.push(`${tab.items[itemName].qty}x ${itemName}`); }
            document.getElementById('resumenProductos_cafe').value = resumenArray.join(" | ");
            document.getElementById('totalFinal_cafe').value = tab.total;
            abrirModalPago('CafeteriaTab', tabId);
        }

        function eliminarTab(tabId, silencioso = false) {
            if (!silencioso) { if (!confirm("¿Seguro que deseas eliminar esta cuenta?")) return; }
            let cafeTabs = JSON.parse(localStorage.getItem('cafeTabs'));
            delete cafeTabs[tabId];
            localStorage.setItem('cafeTabs', JSON.stringify(cafeTabs));
            renderTabsCafe();
        }

        function abrirModalPago(area, tabId = null) {
            modalAreaActiva = area; let total = 0;
            if (area === 'Taquilla') total = parseFloat(document.getElementById('totalFinal_taq').value);
            if (area === 'Cafeteria' || area === 'CafeteriaTab') {
                total = parseFloat(document.getElementById('totalFinal_cafe').value);
                activeTabId = tabId;
            }
            if (total === 0 || isNaN(total)) return alert("El carrito está vacío.");
            totalModal = total;
            document.getElementById('modalTotalAmount').innerText = '$' + total.toLocaleString('es-MX', { minimumFractionDigits: 2 });
            document.getElementById('modalPagoRecibido').value = '';
            document.getElementById('modalCambio').innerText = '$0.00';
            document.getElementById('radioEfectivo').checked = true;
            toggleCambioBox();
            document.getElementById('paymentModal').style.display = 'flex';
        }

        function cerrarModal() { document.getElementById('paymentModal').style.display = 'none'; }
        function toggleCambioBox() { document.getElementById('cambioContainer').style.display = document.getElementById('radioEfectivo').checked ? 'block' : 'none'; }
        function calcularCambio() {
            const recibido = parseFloat(document.getElementById('modalPagoRecibido').value) || 0;
            const cambio = recibido - totalModal;
            document.getElementById('modalCambio').innerText = '$' + (cambio > 0 ? cambio : 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });
        }

        function prepararTicketFisico() {
            document.getElementById('ticketFecha').innerText = new Date().toLocaleString('es-MX');
            document.getElementById('ticketCajero').innerText = localStorage.getItem('cajeroActivo');
            document.getElementById('ticketTotal').innerText = document.getElementById('modalTotalAmount').innerText;
            document.getElementById('ticketMetodo').innerText = document.getElementById('radioEfectivo').checked ? "Efectivo" : "Tarjeta";
            let recibido = document.getElementById('modalPagoRecibido').value;
            let totalVal = document.getElementById('modalTotalAmount').innerText;
            document.getElementById('ticketRecibido').innerText = recibido ? '$' + parseFloat(recibido).toFixed(2) : totalVal;
            document.getElementById('ticketCambio').innerText = document.getElementById('modalCambio').innerText;
            let productosArray = [];
            if (modalAreaActiva === 'Taquilla') {
                let ent = document.getElementById('resumenEntradas').value;
                let adi = document.getElementById('resumenAdicionales').value;
                if (ent && ent !== "Ninguna") productosArray = productosArray.concat(ent.split(" | "));
                if (adi && adi !== "Ninguno") productosArray = productosArray.concat(adi.split(" | "));
            } else {
                let prod = document.getElementById('resumenProductos_cafe').value;
                if (prod && prod !== "Ninguno") productosArray = productosArray.concat(prod.split(" | "));
            }
            let listaHTML = '';
            productosArray.forEach(item => { listaHTML += `<div style="font-size: 11px; margin-bottom: 2px;">- ${item}</div>`; });
            document.getElementById('ticketProductos').innerHTML = listaHTML;
        }

        function confirmarVenta() {
            const isEfectivo = document.getElementById('radioEfectivo').checked;
            if (isEfectivo && (parseFloat(document.getElementById('modalPagoRecibido').value) || 0) < totalModal) return alert("Pago insuficiente.");
            const btn = document.getElementById('btnConfirmarVenta');
            btn.disabled = true; btn.innerText = "PROCESANDO...";
            prepararTicketFisico();
            if (modalAreaActiva === 'Taquilla') {
                document.getElementById('metodoPagoFinal_taq').value = isEfectivo ? 'Efectivo' : 'Tarjeta';
                procesarFetch(document.getElementById('posForm'), 'mensajeTaq', limpiarTaquilla, btn);
            } else {
                document.getElementById('metodoPagoFinal_cafe').value = isEfectivo ? 'Efectivo' : 'Tarjeta';
                procesarFetch(document.getElementById('cafeForm'), 'mensajeCafe', (modalAreaActiva === 'CafeteriaTab' ? () => eliminarTab(activeTabId, true) : limpiarCafe), btn);
            }
        }

        function procesarFetch(formObj, msgId, limpiarFunc, btnObj) {
            fetch(scriptURL, { method: 'POST', body: new FormData(formObj) })
                .then(() => {
                    document.getElementById(msgId).style.display = 'block'; window.print();
                    limpiarFunc(); cerrarModal(); btnObj.disabled = false; btnObj.innerText = "CONFIRMAR VENTA E IMPRIMIR";
                    setTimeout(() => { document.getElementById(msgId).style.display = 'none'; }, 3000);
                }).catch(err => { alert("Error de conexión"); btnObj.disabled = false; btnObj.innerText = "CONFIRMAR VENTA E IMPRIMIR"; });
        }

        function abrirResumenCajero(area) {
            document.getElementById('cajeroSummaryModal').style.display = 'flex';
            document.getElementById('summaryAreaName').innerText = area;
            document.getElementById('cajeroSummaryLoading').style.display = 'block';
            document.getElementById('cajeroSummaryContent').style.display = 'none';
            fetch(`${scriptURL}?date=${hoyStr}&sheetType=${area}`).then(res => res.json()).then(json => {
                renderizarResumenCajero(json.data, area);
                document.getElementById('cajeroSummaryLoading').style.display = 'none';
                document.getElementById('cajeroSummaryContent').style.display = 'block';
            }).catch(err => { document.getElementById('cajeroSummaryLoading').innerText = "Error al descargar."; });
        }

        function renderizarResumenCajero(datos, area) {
            const content = document.getElementById('cajeroSummaryContent'); content.innerHTML = '';
            if (area === 'Taquilla') {
                let totalSaltadores = 0, totalCalcetas = 0;
                let categorias = {}; let catAdicionales = {};
                datos.forEach(venta => {
                    if (venta.entradas && venta.entradas !== "Ninguna") {
                        venta.entradas.split(" | ").forEach(item => {
                            const matchQty = item.match(/^(\d+)x/); const qty = matchQty ? parseInt(matchQty[1]) : 0;
                            const matchCalc = item.match(/\(\+(\d+)\s+calcetas\)/); const calcCompradas = matchCalc ? parseInt(matchCalc[1]) : 0;
                            let nombre = item.replace(/^\d+x\s+/, '').replace(/\s*\(\+\d+ calcetas\)/, '').trim();
                            if (qty > 0) {
                                totalSaltadores += qty; totalCalcetas += calcCompradas;
                                categorias[nombre] = (categorias[nombre] || 0) + qty;
                            }
                        });
                    }
                    if (venta.adicionales && venta.adicionales !== "Ninguno") {
                        venta.adicionales.split(" | ").forEach(item => {
                            const matchQty = item.match(/^(\d+)x/); const qty = matchQty ? parseInt(matchQty[1]) : 1;
                            const matchCalcAdi = item.match(/\(\+(\d+)\s+calcetas\)/); const calcAdicionales = matchCalcAdi ? parseInt(matchCalcAdi[1]) : 0;
                            let nombreAdic = item.replace(/^\d+x\s+/, '').replace(/\(\$.*\)/, '').replace(/\s*\(\+\d+ calcetas\)/, '').trim();
                            if (qty > 0) {
                                if (nombreAdic === "SkySocks") totalCalcetas += qty;
                                totalCalcetas += (calcAdicionales * qty);
                                catAdicionales[nombreAdic] = (catAdicionales[nombreAdic] || 0) + qty;
                            }
                        });
                    }
                });
                let html = `<div class="dash-card" style="margin-bottom:10px;"><span>Saltadores Hoy</span><strong>${totalSaltadores}</strong></div>`;
                html += `<div class="dash-card" style="margin-bottom:15px;"><span>Calcetas Hoy</span><strong>${totalCalcetas}</strong></div>`;
                html += `<div class="section-title">Entradas</div><div class="breakdown-list">`;
                for (const [nombre, cant] of Object.entries(categorias)) { html += `<div class="breakdown-item"><span>${nombre}</span><strong>${cant}</strong></div>`; }
                html += `</div><div class="section-title">Adicionales</div><div class="breakdown-list">`;
                for (const [nombre, cant] of Object.entries(catAdicionales)) { html += `<div class="breakdown-item"><span>${nombre}</span><strong>${cant}</strong></div>`; }
                html += `</div>`; content.innerHTML = html;
            } else {
                let totalArticulos = 0; let desgloseCafe = {};
                datos.forEach(venta => {
                    if (venta.productos && venta.productos !== "Ninguno") {
                        venta.productos.split(" | ").forEach(item => {
                            const matchQty = item.match(/^(\d+)x/); const qty = matchQty ? parseInt(matchQty[1]) : 0;
                            let nombre = item.replace(/^\d+x\s+/, '').replace(/\(\$.*\)/, '').trim();
                            if (qty > 0) {
                                totalArticulos += qty; desgloseCafe[nombre] = (desgloseCafe[nombre] || 0) + qty;
                            }
                        });
                    }
                });
                let html = `<div class="dash-card" style="margin-bottom:15px; border-color:var(--cafe);"><span>Artículos Hoy</span><strong>${totalArticulos}</strong></div>`;
                html += `<div class="section-title" style="color:var(--cafe); border-color:var(--cafe);">Desglose</div><div class="breakdown-list">`;
                for (const [nombre, cant] of Object.entries(desgloseCafe)) { html += `<div class="breakdown-item"><span>${nombre}</span><strong>${cant}</strong></div>`; }
                html += `</div>`; content.innerHTML = html;
            }
        }

        function cargarResumen() {
            document.getElementById('adminLoading').style.display = 'block';
            document.getElementById('adminContent').style.display = 'none';
            const f = document.getElementById('reportDate').value;
            const a = document.getElementById('reportArea').value;
            fetch(`${scriptURL}?date=${f}&sheetType=${a}`).then(res => res.json()).then(json => {
                procesarDatosAdmin(json.data, a);
                document.getElementById('adminLoading').style.display = 'none';
                document.getElementById('adminContent').style.display = 'block';
            }).catch(err => { document.getElementById('adminLoading').innerText = "Error de conexión."; });
        }

        function procesarDatosAdmin(datos, area) {
            let totalEfectivo = 0, totalTarjeta = 0;
            if (area === "Taquilla") {
                let totalSaltadores = 0, totalCalcetasAdquiridas = 0;
                let categorias = { "1 Hora": { qty: 0, calc: 0 }, "2 Horas": { qty: 0, calc: 0 }, "3 Horas": { qty: 0, calc: 0 }, "Apoyo": { qty: 0, calc: 0 }, "Paquete Peque Aventura": { qty: 0, calc: 0 }, "Paquete Peque Diversion": { qty: 0, calc: 0 }, "Paquete Super Aventura": { qty: 0, calc: 0 }, "Paquete familiar": { qty: 0, calc: 0 } };
                let catAdicionales = {};
                datos.forEach(venta => {
                    if (venta.metodoPago === "Efectivo") totalEfectivo += parseFloat(venta.total);
                    else totalTarjeta += parseFloat(venta.total);
                    if (venta.entradas && venta.entradas !== "Ninguna") {
                        venta.entradas.split(" | ").forEach(item => {
                            const matchQty = item.match(/^(\d+)x/); const qty = matchQty ? parseInt(matchQty[1]) : 0;
                            const matchCalc = item.match(/\(\+(\d+)\s+calcetas\)/); const calcCompradas = matchCalc ? parseInt(matchCalc[1]) : 0;
                            let nombre = item.replace(/^\d+x\s+/, '').replace(/\s*\(\+\d+ calcetas\)/, '').trim();
                            if (qty > 0) {
                                totalSaltadores += qty; totalCalcetasAdquiridas += calcCompradas;
                                if (categorias[nombre]) { categorias[nombre].qty += qty; categorias[nombre].calc += calcCompradas; }
                            }
                        });
                    }
                    if (venta.adicionales && venta.adicionales !== "Ninguno") {
                        venta.adicionales.split(" | ").forEach(item => {
                            const matchQty = item.match(/^(\d+)x/); const qty = matchQty ? parseInt(matchQty[1]) : 1;
                            const matchCalcAdi = item.match(/\(\+(\d+)\s+calcetas\)/); const calcAdicionales = matchCalcAdi ? parseInt(matchCalcAdi[1]) : 0;
                            let nombreAdic = item.replace(/^\d+x\s+/, '').replace(/\(\$.*\)/, '').replace(/\s*\(\+\d+ calcetas\)/, '').trim();
                            if (qty > 0) {
                                if (nombreAdic === "SkySocks") totalCalcetasAdquiridas += qty;
                                totalCalcetasAdquiridas += (calcAdicionales * qty);
                                catAdicionales[nombreAdic] = (catAdicionales[nombreAdic] || 0) + qty;
                            }
                        });
                    }
                });
                document.getElementById('dashTotalGlobal').innerText = '$' + (totalEfectivo + totalTarjeta).toLocaleString('es-MX', { minimumFractionDigits: 2 });
                document.getElementById('dashEfectivo').innerText = '$' + totalEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2 });
                document.getElementById('dashTarjeta').innerText = '$' + totalTarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2 });
                document.getElementById('dashSaltadores').innerText = totalSaltadores;
                document.getElementById('dashCalcetas').innerText = totalCalcetasAdquiridas;
                const listEntradas = document.getElementById('dashBreakdown'); listEntradas.innerHTML = '';
                for (const [nombre, datosCat] of Object.entries(categorias)) {
                    if (datosCat.qty > 0) {
                        let d = datosCat.calc > 0 ? `<span class="breakdown-detail">Incluye ${datosCat.calc} calcetas</span>` : '';
                        listEntradas.innerHTML += `<div class="breakdown-item"><div><span>${nombre}</span>${d}</div><strong>${datosCat.qty}</strong></div>`;
                    }
                }
                const listAdicionales = document.getElementById('dashAdicionales'); listAdicionales.innerHTML = '';
                for (const [nombre, cantidad] of Object.entries(catAdicionales)) { listAdicionales.innerHTML += `<div class="breakdown-item"><span>${nombre}</span><strong>${cantidad}</strong></div>`; }
            } else {
                let totalArticulos = 0; let desgloseCafe = {};
                datos.forEach(venta => {
                    if (venta.metodoPago === "Efectivo") totalEfectivo += parseFloat(venta.total);
                    else totalTarjeta += parseFloat(venta.total);
                    if (venta.productos && venta.productos !== "Ninguno") {
                        venta.productos.split(" | ").forEach(item => {
                            const matchQty = item.match(/^(\d+)x/); const qty = matchQty ? parseInt(matchQty[1]) : 0;
                            let nombre = item.replace(/^\d+x\s+/, '').replace(/\(\$.*\)/, '').trim();
                            if (qty > 0) { totalArticulos += qty; desgloseCafe[nombre] = (desgloseCafe[nombre] || 0) + qty; }
                        });
                    }
                });
                document.getElementById('dashTotalGlobal').innerText = '$' + (totalEfectivo + totalTarjeta).toLocaleString('es-MX', { minimumFractionDigits: 2 });
                document.getElementById('dashEfectivo').innerText = '$' + totalEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2 });
                document.getElementById('dashTarjeta').innerText = '$' + totalTarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2 });
                document.getElementById('dashArticulosCafe').innerText = totalArticulos;
                const listProdCafe = document.getElementById('dashProductosCafe'); listProdCafe.innerHTML = '';
                for (const [nombre, cantidad] of Object.entries(desgloseCafe)) { listProdCafe.innerHTML += `<div class="breakdown-item"><span>${nombre}</span><strong>${cantidad}</strong></div>`; }
            }
        }

        function calcular() {
            let granTotal = 0; let resumenEnt = []; let resumenAdi = [];
            entradaItemsCache.forEach(item => {
                const nombre = item.nombre; const precio = item.precio;
                const incCalc = item.incCalc;
                const inputQty = item.inputQty; const inputCalc = item.inputCalc;
                let qty = inputQty && inputQty.value ? parseInt(inputQty.value) : 0;
                let qtyCalc = inputCalc && inputCalc.value ? parseInt(inputCalc.value) : 0;
                if (qty > 0) {
                    if (inputCalc && qtyCalc > qty) { qtyCalc = qty; inputCalc.value = qty; }
                    granTotal += (qty * precio);
                    let texto = `${qty}x ${nombre}`;
                    if (incCalc > 0) texto += ` (+${qty * incCalc} calcetas)`;
                    else if (qtyCalc > 0) { texto += ` (+${qtyCalc} calcetas)`; granTotal += (qtyCalc * 59); }
                    resumenEnt.push(texto);
                }
            });
            customProductsTaq.forEach(cp => {
                granTotal += cp.price;
                let cpText = `1x ${cp.name} ($${cp.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })})`;
                if (cp.socks > 0) cpText += ` (+${cp.socks} calcetas)`;
                resumenAdi.push(cpText);
            });
            maquillajeVendidos.forEach(precio => { granTotal += precio; resumenAdi.push(`1x Maquillaje ($${precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })})`); });
            vasosTaqVendidos.forEach(precio => { granTotal += precio; resumenAdi.push(`1x Vaso SkyZone ($${precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })})`); });
            adicionalRowsCache.forEach(item => {
                const nombre = item.nombre; const precio = item.precio;
                const inputQty = item.inputQty; let qty = inputQty && inputQty.value ? parseInt(inputQty.value) : 0;
                if (qty > 0) { granTotal += (qty * precio); resumenAdi.push(`${qty}x ${nombre}`); }
            });
            document.getElementById('displayTotal').innerText = '$' + granTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 });
            document.getElementById('resumenEntradas').value = resumenEnt.length > 0 ? resumenEnt.join(" | ") : "Ninguna";
            document.getElementById('resumenAdicionales').value = resumenAdi.length > 0 ? resumenAdi.join(" | ") : "Ninguno";
            document.getElementById('totalFinal_taq').value = granTotal;
        }

        function limpiarTaquilla() {
            entradaItemsCache.forEach(i => { if(i.inputQty) i.inputQty.value=''; if(i.inputCalc) i.inputCalc.value=''; });
            adicionalRowsCache.forEach(i => { if(i.inputQty) i.inputQty.value=''; });
            maquillajeVendidos = []; vasosTaqVendidos = []; customProductsTaq = [];
            document.getElementById('qtyMaquillaje').value = ''; document.getElementById('qtyVasoTaq').value = '';
            document.getElementById('customProductsContainer').innerHTML = ''; calcular();
        }

        function calcularCafe() {
            let granTotal = 0; let resumenCafe = [];
            cafeRowsCache.forEach(item => {
                const nombre = item.nombre; const precio = item.precio;
                const inputQty = item.inputQty; let qty = inputQty && inputQty.value ? parseInt(inputQty.value) : 0;
                if (qty > 0) { granTotal += (qty * precio); resumenCafe.push(`${qty}x ${nombre}`); }
            });
            vasosCafeVendidos.forEach(precio => { granTotal += precio; resumenCafe.push(`1x Vaso SkyZone ($${precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })})`); });
            refillAguaVendidos.forEach(precio => { granTotal += precio; resumenCafe.push(`1x Refill de Agua ($${precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })})`); });
            jarraAguaVendidas.forEach(precio => { granTotal += precio; resumenCafe.push(`1x Jarra de Agua ($${precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })})`); });
            document.getElementById('displayTotalCafe').innerText = '$' + granTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 });
            document.getElementById('resumenProductos_cafe').value = resumenCafe.length > 0 ? resumenCafe.join(" | ") : "Ninguno";
            document.getElementById('totalFinal_cafe').value = granTotal;
        }

        function limpiarCafe() {
            cafeRowsCache.forEach(i => { if(i.inputQty) i.inputQty.value=''; });
            vasosCafeVendidos = []; refillAguaVendidos = []; jarraAguaVendidas = [];
            document.getElementById('qtyVasoCafe').value = ''; document.getElementById('qtyRefillAgua').value = '';
            document.getElementById('qtyJarraAgua').value = ''; calcularCafe();
        }