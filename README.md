# 🪐 SkyZone POS - Sistema de Punto de Venta Premium

Bienvenido a la documentación técnica oficial de **SkyZone POS**, un sistema de punto de venta premium de alta fidelidad diseñado con estética de Neumorfismo. El sistema está estructurado con React, Vite y Firebase Firestore, optimizado para operaciones en tiempo real entre múltiples terminales de cobro (Taquilla y Cafetería) y administración centralizada.

---

## 🛠️ Arquitectura y Tecnologías Clave

El proyecto está diseñado bajo un modelo ágil, modular y altamente desacoplado, garantizando respuestas rápidas y consistentes.

1. **Vite + React (ES6+)**:
   - Utilizado como motor del ecosistema SPA por su compilación ultrarrápida (HMR) y empaquetado optimizado para baja latencia en terminales físicas de punto de venta.
2. **Firebase Firestore (Base de Datos en Tiempo Real)**:
   - Base de datos orientada a documentos NoSQL que gestiona la sincronización inmediata del estado de saltadores, comisiones, ventas diarias e impresiones de tickets de forma bidireccional mediante suscripciones en tiempo real (`onSnapshot`).
3. **Vanilla CSS (Diseño Neumórfico Premium)**:
   - Implementado para otorgar una identidad visual tridimensional única, con micro-animaciones en botones táctiles, inputs inmersivos y soporte integrado de transición suave para **Modo Claro** y **Modo Oscuro** (Cyber Dark).
4. **React Router DOM**:
   - Gestor de enrutamiento del lado del cliente con protección de rutas (`ProtectedRoute`) y segmentación de accesos por roles operativos (Admin, Taquilla, Cafetería).
5. **Lucide Icons**:
   - Paquete de iconografía vectorial ligera para controles de interfaz táctil intuitiva.

---

## 📁 Estructura del Workspace

A continuación se detalla la distribución de archivos clave en la carpeta del código fuente (`src`):

```bash
c:\Users\david\OneDrive\Documentos\SKYZONE
├── docs/                        # Recursos de documentación
│   └── img/                     # Capturas de pantalla didácticas para el manual
├── src/
│   ├── assets/                  # Estilos auxiliares e imágenes estáticas
│   ├── components/              # Componentes de UI modulares y reutilizables
│   │   ├── CartSidebar.jsx      # Barra de compra con carpetas de comanda plegables
│   │   ├── GuestList.jsx        # Lista activa de saltadores en tiempo real (exit > now())
│   │   ├── PaymentModal.jsx     # Selector de forma de pago y registro directo en Firestore
│   │   ├── ProductCard.jsx      # Tarjeta interactiva de producto (soporta precio abierto)
│   │   ├── Sidebar.jsx          # Barra lateral de navegación con tema integrado
│   │   ├── ThemeToggle.jsx      # Interruptor flotante de modo claro/oscuro para login/admin
│   │   └── TicketImpresion.jsx  # Vista de ticket físico formateado en CSS para impresoras térmicas
│   ├── config/
│   │   └── firebase.js          # Inicialización y SDK de Firebase Client
│   ├── context/
│   │   ├── AuthContext.jsx      # Gestión y persistencia de sesiones de cajeros
│   │   └── CartContext.jsx      # Lógica multicarrito transparente (Cuentas Abiertas)
│   ├── data/
│   │   └── products.js          # Catálogo de productos y paquetes parametrizados
│   ├── pages/
│   │   ├── AdminDashboard.jsx   # Estadísticas del día, tabla CRUD de ventas y gestión
│   │   ├── Login.jsx            # Pantalla de acceso seguro para cajeros
│   │   ├── PosCafeteria.jsx     # POS de Cafetería con menú interactivo y producto libre
│   │   └── PosTaquilla.jsx      # POS de Taquilla enfocado a entradas y paquetes
│   ├── App.css                  # Reglas CSS específicas de la aplicación
│   ├── App.jsx                  # Ruteador central y renderizado global de componentes
│   ├── index.css                # Diseño base de Neumorfismo y variables CSS de Modo Claro/Oscuro
│   └── main.jsx                 # Punto de entrada de renderizado React
├── package.json                 # Dependencias y scripts de construcción
└── vite.config.js               # Ajustes y plugins de Vite
```

---

## ⚡ Lógica Destacada del Sistema

### 🛒 Gestión Multicarrito Transparente (`CartContext.jsx`)
Para soportar el flujo de **Cuentas Abiertas / Mesas** de la Cafetería sin alterar la simplicidad del flujo de la Taquilla, desarrollamos un mapeador en el estado de React:
```javascript
const [carts, setCarts] = useState({
  default: { name: 'Principal', items: [] }
});
const [activeCartId, setActiveCartId] = useState('default');
```
El contexto expone las variables derivadas `cart = carts[activeCartId].items` y `total`, por lo que **los módulos existentes consumen el carrito sin enterarse de que hay múltiples cuentas abiertas detrás**, logrando una compatibilidad absoluta del 100%.

### ⏰ Conteo de Saltadores e Invitados Activos (`GuestList.jsx`)
Para mostrar en el panel administrativo el número exacto de jumpers saltando dentro del parque en tiempo real, realizamos una consulta reactiva a Firebase filtrando las salidas previstas en el futuro:
```javascript
const q = query(
  collection(db, "ventas"),
  where("exitTimestamp", ">", Date.now())
);
```
El componente recalcula de forma interactiva y en tiempo real el tiempo restante de cada saltador en minutos, notificando al administrador de forma inmediata cuando el tiempo de una entrada ha finalizado.

---

## 🚀 Guía de Instalación y Ejecución Local

Sigue estos pasos sencillos para correr el proyecto en tu entorno local de desarrollo:

1.  **Clonar el repositorio e instalar dependencias:**
    ```bash
    cd c:\Users\david\OneDrive\Documentos\SKYZONE
    npm install
    ```
2.  **Iniciar Servidor de Desarrollo Local (Vite):**
    ```bash
    npm run dev
    ```
    *   Abre tu navegador en `http://localhost:5173`.
3.  **Compilar para Producción:**
    ```bash
    npm run build
    ```
    *   Esto generará una carpeta `dist` con los archivos HTML, CSS y JS ultra comprimidos listos para cualquier hosting (Vercel, Firebase Hosting, Netlify).
