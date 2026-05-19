# 🪐 Ecosistema SkyZone POS - Manual de Ingeniería y Arquitectura Técnica

Bienvenido al centro de documentación técnica y de ingeniería de **SkyZone POS**, un sistema de punto de venta táctil de alto rendimiento y fidelidad visual diseñado bajo los lineamientos estéticos del **Neumorfismo 3D**. Este sistema se especializa en la gestión y control en tiempo real de boletos (Taquilla), alimentos/bebidas (Cafetería con soporte de comanda multicarrito activa) y auditoría contable/operativa en tiempo real (Panel de Administración).

---

## 🚀 1. Stack Tecnológico de Alto Rendimiento

El sistema ha sido cimentado sobre tecnologías modernas que garantizan una velocidad de procesamiento menor a 20ms en actualizaciones de UI y persistencia tolerante a fallos:

*   **Vite v8.0.13 (Entorno de Compilación y Bundler):**
    *   Sustituye a Webpack para ofrecer arranques instantáneos gracias al pre-empaquetado de dependencias con `esbuild` y recargas de módulos calientes (HMR) ultrarrápidas sobre ES Modules nativos.
*   **React v18 (Biblioteca de UI Reactiva):**
    *   Aprovecha el Virtual DOM de React para actualizar únicamente los nodos que sufren modificaciones físicas. Utiliza ganchos de estado avanzados (`useContext`, `useEffect`, `useMemo`) para mantener la coherencia del estado del carro y los saltadores.
*   **Firebase SDK v10 (Capa de Persistencia y Tiempo Real):**
    *   Utiliza **Firestore** como base de datos de documentos distribuidos.
    *   La sincronización en tiempo real se realiza mediante controladores de suscripción de bases de datos activa (`onSnapshot`), asegurando que cualquier ticket cobrado, saltador ingresado o edición administrativa se propague en menos de 100ms a todas las computadoras del local.
*   **Vanilla CSS + Custom CSS Variables (Diseño Neumórfico):**
    *   La totalidad del diseño está codificada de manera artesanal y pura, sin sobrecargar con frameworks pesados de CSS como Bootstrap o Tailwind.
    *   Utiliza variables nativas de CSS (`:root` y `[data-theme="dark"]`) para lograr un cambio de tema global y fluido mediante interpolación lineal de colores y sombras.

---

## 🎨 2. El Ecosistema de Neumorfismo y Temas Globales

El neumorfismo es un estilo visual que emula la física de extrusión de objetos en relieve. Para lograr este efecto premium en pantallas táctiles y tradicionales, el archivo `src/index.css` define matrices de sombras exactas que representan hendiduras y relieves volumétricos:

```css
:root {
  --bg-color: #e0e5ec;
  --text-main: #2d3748;
  --text-muted: #718096;
  --shadow-light: 9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255, 0.5);
  --shadow-inset: inset 6px 6px 10px 0 rgba(163,177,198, 0.7), inset -6px -6px 10px 0 rgba(255,255,255, 0.8);
}

[data-theme="dark"] {
  --bg-color: #1a1e24;
  --text-main: #f7fafc;
  --text-muted: #a0aec0;
  --shadow-light: 8px 8px 16px #101217, -8px -8px 16px #242a31;
  --shadow-inset: inset 6px 6px 10px #101217, inset -6px -6px 10px #242a31;
}
```

### Arquitectura de Controladores de Tema
1.  **`ThemeToggle.jsx` (Acceso Flotante):** Posicionado de forma fija (`position: fixed`) en el Login y en la Administración. Alterna de manera reactiva y persiste la selección del cajero en el `localStorage` del navegador.
2.  **`Sidebar.jsx` (Integración Nativa):** Implementado en los puntos de venta táctiles directamente debajo del botón Home. Utiliza un estilo neumórfico circular idéntico a las opciones del menú, garantizando coherencia visual y liberando espacio en la pantalla de cobro.

---

## ⚙️ 3. Ingeniería de Datos y Lógica Crítica

### A. Gestión de Comandas y Cuentas Abiertas (`CartContext.jsx`)
La Cafetería requiere múltiples comandas simultáneas (ej. mesas o cuentas abiertas), mientras que la Taquilla necesita un flujo simplificado e instantáneo. Para solucionar esto sin duplicar código ni acoplar las vistas, la lógica de negocio en `CartContext` maneja una estructura de diccionario de carritos independientes:

```javascript
const [carts, setCarts] = useState({
  Principal: { name: 'Principal', items: [] }
});
const [activeCartId, setActiveCartId] = useState('Principal');
```

El contexto calcula y expone las propiedades derivadas del carrito actualmente activo:
*   `cart`: Arreglo de artículos en `carts[activeCartId].items`.
*   `total`: Suma matemática de `precio * qty` de los elementos de la cuenta activa.
*   **Compatibilidad:** Dado que expone `cart` y `total` directamente, la vista de Taquilla funciona de manera transparente sin saber que existen múltiples carritos, logrando retrocompatibilidad absoluta.

### B. Salidas y Saltadores Activos en Tiempo Real (`GuestList.jsx`)
Para llevar una auditoría exacta de los brazaletes activos dentro del parque, se realiza una consulta reactiva a la base de datos de Firestore. Un saltador se considera "activo" únicamente si su hora programada de salida es posterior al segundo actual:

```javascript
const q = query(
  collection(db, "ventas"),
  where("exitTimestamp", ">", Date.now())
);
```

Dentro del componente, un intervalo de actualización de 1 segundo recalcula el tiempo restante para cada registro en minutos, eliminando de pantalla visual al brazalete tan pronto expira su tiempo de forma automática y reactiva.

---

## 📂 4. Distribución del Workspace y Código Fuente

A continuación se presenta un plano detallado de la distribución de componentes técnicos para facilitar el mantenimiento futuro:

```bash
c:\Users\david\OneDrive\Documentos\SKYZONE
├── docs/                        # Recursos de documentación interactiva
│   └── img/                     # Capturas de pantalla físicas y reales del sistema
│       ├── login_page.png       # Vista del portal de acceso neumórfico
│       ├── pos_light.png        # Interfaz de cobro en Modo Claro
│       ├── pos_dark.png         # Interfaz de cobro en Modo Oscuro (Cyber Dark)
│       ├── pos_cafeteria.png    # Interfaz táctil de Cafetería con menú completo
│       └── admin_panel.png      # Vista analítica y tabla CRUD del administrador
├── src/
│   ├── components/              # Componentes de UI modulares de presentación
│   │   ├── CartSidebar.jsx      # Barra de compra plegable con soporte multicuenta
│   │   ├── GuestList.jsx        # Lista activa y reactiva de saltadores
│   │   ├── PaymentModal.jsx     # Selector de tipo de cobro (Efectivo/Tarjeta)
│   │   ├── ProductCard.jsx      # Tarjeta interactiva de producto y precio abierto
│   │   ├── Sidebar.jsx          # Barra de navegación neumórfica con tema integrado
│   │   ├── ThemeToggle.jsx      # Control flotante de tema claro/oscuro
│   │   └── TicketImpresion.jsx  # Maqueta en HTML/CSS optimizada para impresoras térmicas
│   ├── config/
│   │   └── firebase.js          # Inicialización del cliente SDK de Firebase Firestore
│   ├── context/
│   │   ├── AuthContext.jsx      # Control de sesiones de cajeros y roles de usuario
│   │   └── CartContext.jsx      # Ecosistema de control y persistencia del carrito
│   ├── data/
│   │   └── products.js          # Catálogo unificado de alimentos, bebidas y boletos
│   ├── pages/
│   │   ├── AdminDashboard.jsx   # Auditoría, métricas diarias e interfaz de edición
│   │   ├── Login.jsx            # Portal de acceso restringido
│   │   ├── PosCafeteria.jsx     # Terminal táctil de Cafetería
│   │   └── PosTaquilla.jsx      # Terminal de venta de entradas y Locker
│   ├── App.jsx                  # Ruteador central y ruteo protegido
│   └── index.css                # Hoja de estilos central y variables de tema
```

---

## 🛠️ 5. Despliegue, Construcción e Instalación en Producción

### A. Preparación en Red Local (Computadoras en Establecimiento)
Si deseas que ambas computadoras de cobro operen de manera local sin subir la aplicación a internet:

1.  **Compilar la aplicación estática:** Ejecuta en la terminal de la computadora principal:
    ```bash
    npm run build
    ```
    Esto creará una carpeta `dist/` ultra optimizada con todo el JS y CSS minificados.
2.  **Lanzar servidor local de alta velocidad:** Instala globalmente la herramienta `serve` e inicialízala apuntando a la carpeta de compilación:
    ```bash
    npm install -g serve
    serve -s dist -l 5000
    ```
3.  **Enlazar terminal secundaria:**
    *   Abre una terminal y teclea `ipconfig` para conocer la IP local de la computadora principal (ej. `192.168.1.50`).
    *   En la segunda computadora, accede al navegador web e ingresa a `http://192.168.1.50:5000`.

### B. Despliegue en la Nube (Vercel / Firebase Hosting)
Para habilitar actualizaciones automáticas mediante integración continua:

*   **Vercel:** Conecta tu repositorio de GitHub a tu cuenta de Vercel. Selecciona el proyecto `taquillasantafe` y haz clic en **Deploy**. Cada `git push` actualizará automáticamente las computadoras del establecimiento en tiempo real.
*   **Firebase Hosting:** Ejecuta los siguientes comandos desde la carpeta raíz del proyecto:
    ```bash
    npm install -g firebase-tools
    firebase login
    firebase init hosting
    # Selecciona tu base de datos y define "dist" como directorio público
    npm run build
    firebase deploy
    ```
