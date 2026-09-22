# QR Studio — Plan de proyecto

Generador de códigos QR personalizables, con soporte para exportación en formato **3D** (impresión 3D / visor interactivo), construido con **Astro** + **Tailwind CSS**.

## 1. Objetivo

Crear una web app donde cualquier usuario pueda:
1. Generar un QR a partir de una URL, texto, WiFi, vCard, etc.
2. Personalizarlo visualmente (colores, forma de los módulos, logo central, marco, degradados).
3. Descargarlo en formatos 2D estándar (PNG, SVG, PDF).
4. Convertirlo en un modelo **3D** (QR en relieve/extruido), previsualizarlo en un visor interactivo y exportarlo en STL/GLB/OBJ para impresión 3D.

## Estado actual (MVP construido)

Editor en vivo (sin botón "generar"), con el panel organizado en secciones plegables
al estilo de QRCode Monkey: **Contenido · Colores · Logo · Diseño · Modelo 3D**.

**Formas.** Cuerpo (cuadrado, redondo, punto, rombo, hoja, classy), marco del ojo
(cuadrado, redondo, classy, hoja) y pupila (cuadrado, redondo, círculo, classy).
Una sola definición en `src/lib/qr/outline.ts` alimenta el SVG y la geometría 3D,
así las dos vistas no pueden divergir.

**Colores.** Sólido o degradado (lineal con ángulo, o radial), fondo, y color propio
opcional para marco y pupila. En 3D el degradado se aplica por instancia.

**Logo.** Galería de 24 marcas (WhatsApp, Facebook, X, YouTube…) más subida propia de
PNG/JPG/WebP (máx. 1.5 MB). Tamaño ajustable, despeje opcional de los módulos de
debajo, y subida automática a ECC H. Se renderiza en el SVG y como plano texturizado
en la escena 3D.

Los glifos vienen de `simple-icons` (CC0) y se generan a `src/lib/qr/brands.ts` con
`node scripts/gen-brands.mjs`; `simple-icons` es sólo dependencia de desarrollo. Al
elegir una marca se rasteriza su baldosa a PNG, así una marca de la galería recorre
exactamente el mismo camino que una imagen subida. LinkedIn no está porque
simple-icons lo retiró a petición de la marca.

**Modelo 3D.** La figura aplica al **objeto entero**, no a cada módulo: placa, cubo,
pirámide, cilindro, hexágono o cúpula. El cuerpo se lofta hacia abajo desde la cara
del código; los módulos son siempre prismas sobre él. Los cuerpos redondos y
hexagonales ensanchan más allá del span para no recortar la zona de silencio, y el
escalado a milímetros usa esa anchura real, no la del código.

**Transición 2D→3D.** La vista 2D *es* la escena 3D vista desde arriba con los módulos
a altura cero. Al pulsar 3D, una sola interpolación de 1.1s los sube con stagger desde
el centro mientras la cámara orbita. Respeta `prefers-reduced-motion`.

**Exportación.** SVG y PNG en 2D; STL binario en milímetros reales en 3D (el logo es
textura, no va en la malla).

### Verificación de escaneabilidad

La app decodifica su propia salida con jsQR y avisa si el código no se lee. Dos cosas
que costó descubrir y conviene no volver a romper:

- **La fiabilidad de jsQR no es monótona con la resolución** (su binarizador trabaja en
  bloques de 8×8 px): 12 px/módulo lee, 14 falla. El verificador prueba varias escalas
  y acepta la primera que lee.
- **`willReadFrequently: true` cambia el backend de rasterizado** y difumina las formas
  finas lo bastante como para fallar códigos que sí escanean. No usarlo aquí.

Formas y valores calibrados contra el decodificador: el rombo necesita alcanzar 0.62
(a 0.5 no lee), el marco de ojo circular no lee a ningún radio y la pupila en rombo
tampoco, por eso no se ofrecen. Las 96 combinaciones de formas que sí se ofrecen
decodifican, igual que los degradados y el logo hasta 32% con ECC H.

Pendiente: tipos de contenido (WiFi/vCard), marcos con texto, GLB/OBJ, y la Fase 3.

---

## 2. Stack técnico

| Capa | Tecnología | Motivo |
|---|---|---|
| Framework | **Astro** | Sitio rápido, "islands architecture": solo hidrata JS donde se necesita (el editor QR), el resto se sirve estático. |
| Estilos | **Tailwind CSS** | Utilidades para construir el editor y la landing rápido y consistente. |
| Interactividad | **React** (o Preact) como isla de Astro | El editor de personalización es un panel con mucho estado (colores, forms, preview en vivo) → conviene un framework de componentes dentro de Astro. |
| Generación QR 2D | **`qrcode`** (solo para obtener la matriz de bits) + renderizador SVG propio | Elegido sobre `qr-code-styling` porque el modo 3D necesita la matriz cruda. Una sola fuente de verdad alimenta el SVG y la geometría 3D, así ambas vistas no pueden divergir. |
| Generación 3D | `three.js` para el visor + generación de geometría propia (extrusión de cada módulo negro del QR como un `BoxGeometry`, o extrusión de un `Shape` con agujeros) | No hay que reinventar el render 3D; three.js tiene exportadores (`STLExporter`, `GLTFExporter`). |
| Exportación 3D | `three/examples/jsm/exporters/STLExporter.js`, `GLTFExporter.js` | Generar archivos descargables directamente en el navegador, sin backend. |
| Estado del editor | `nanostores` (se integra bien con Astro islands) o React state local si todo vive en un solo componente | Evita duplicar estado entre islands si el editor crece. |
| Backend (opcional, fase 2) | Endpoints de Astro (`src/pages/api/*.ts`) sobre **Vercel/Netlify functions** | Solo si se agrega: guardar diseños, QR dinámicos con analytics, cuentas de usuario. |
| Persistencia (opcional, fase 2) | Supabase (Postgres + Auth + Storage) | Para guardar QRs del usuario, códigos dinámicos y estadísticas de escaneo. |
| Hosting | Vercel o Netlify | Despliegue simple de Astro (SSR híbrido si se necesita API). |

> Nota: toda la generación (2D y 3D) puede hacerse **100% en el cliente**, sin backend — importante porque simplifica mucho el MVP y evita costos de servidor.

## 3. Funcionalidades

### 3.1 MVP (Fase 1)
- [ ] Input de contenido: URL, texto libre, WiFi (SSID/password/tipo), tarjeta de contacto (vCard), email, teléfono.
- [ ] Preview del QR en tiempo real mientras el usuario edita.
- [ ] Personalización visual:
  - Color de fondo y color de módulos (sólido).
  - Degradados (linear/radial) en los módulos.
  - Forma de los "dots": cuadrado, redondeado, punto, clásico.
  - Forma de las esquinas (ojos del QR): cuadrado, redondeado, punto.
  - Logo/imagen central con margen de seguridad automático (mantener nivel de corrección de errores alto cuando hay logo).
  - Marco/frame opcional con texto tipo "Escanéame".
- [ ] Validación en tiempo real de "escaneabilidad" (nivel de corrección de errores ECC ajustable: L/M/Q/H).
- [ ] Descarga en PNG (varias resoluciones), SVG (vectorial) y PDF.
- [ ] Diseño responsive, mobile-first.

### 3.2 Modo 3D (Fase 2)
- [ ] Botón "Convertir a 3D" dentro del mismo editor.
- [ ] Generación de geometría: cada módulo oscuro del QR se extruye como un prisma sobre una base plana (efecto "relieve"), altura configurable.
- [ ] Opciones 3D:
  - Altura de extrusión (mm).
  - Grosor de la base.
  - Modo "dos colores" (para impresión multicolor/multi-material): base de un color, relieve de otro.
  - Añadir texto o logo en relieve/grabado en la base.
  - Forma del marco exterior (cuadrado, redondeado, con orificio para llavero).
- [ ] Visor 3D interactivo (rotar, zoom, cambiar iluminación) con three.js.
- [ ] Validación de imprimibilidad básica (grosor mínimo de pared, tamaño mínimo de módulo según altura de boquilla típica).
- [ ] Exportación: **STL** (impresión 3D estándar), **GLB** (visualización/AR), **OBJ** (edición en otros softwares).

### 3.3 Extras (Fase 3, opcional)
- [ ] Cuentas de usuario + guardar diseños (Supabase Auth + DB).
- [ ] QR dinámicos (el contenido apunta a una URL corta editable después de imprimir el QR) + analytics de escaneos.
- [ ] Plantillas prediseñadas (redes sociales, restaurantes/menú, eventos, tarjetas de presentación).
- [ ] Compartir diseño vía link.
- [ ] Exportación en lote (varios QRs desde un CSV, ej. para inventario).
- [ ] Integración con servicio de impresión 3D bajo demanda (enviar el STL a un partner tipo Printful/Shapeways) o cotización de impresión.

## 4. Arquitectura y estructura de carpetas

```
qr-studio/
├── src/
│   ├── components/
│   │   ├── editor/              # Isla React: panel de personalización
│   │   │   ├── QrEditor.tsx
│   │   │   ├── ColorControls.tsx
│   │   │   ├── ShapeControls.tsx
│   │   │   ├── LogoUpload.tsx
│   │   │   ├── ContentTypeForm.tsx   # URL / WiFi / vCard / etc.
│   │   │   └── ExportPanel.tsx
│   │   ├── qr/
│   │   │   ├── QrPreview2D.tsx       # Canvas/SVG en vivo
│   │   │   └── QrPreview3D.tsx       # Canvas three.js
│   │   └── ui/                       # Botones, tabs, sliders (Tailwind)
│   ├── lib/
│   │   ├── qr/
│   │   │   ├── generateMatrix.ts     # Wrapper sobre lib de QR → matriz de bits
│   │   │   ├── styleRenderer.ts      # Matriz + estilo → SVG/canvas
│   │   │   └── contentEncoders.ts    # Arma el string correcto (wifi:, vcard, mailto, etc.)
│   │   ├── three/
│   │   │   ├── buildQrMesh.ts        # Matriz → geometría 3D
│   │   │   ├── exportSTL.ts
│   │   │   └── exportGLTF.ts
│   │   └── stores/
│   │       └── qrConfig.ts           # nanostores: estado compartido del diseño
│   ├── pages/
│   │   ├── index.astro               # Landing
│   │   ├── editor.astro              # App principal (monta la isla del editor)
│   │   └── api/                      # (Fase 2/3) endpoints opcionales
│   ├── layouts/
│   │   └── BaseLayout.astro
│   └── styles/
│       └── global.css                # Tailwind entrypoint
├── public/
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

**Separación clave:** `lib/qr` y `lib/three` son lógica pura (sin UI), fácil de testear. Los componentes React son "islands" — Astro solo las hidrata en `editor.astro`, así la landing sigue siendo 100% estática y rápida.

## 5. Flujo de datos

1. Usuario edita contenido/estilo → se actualiza `qrConfig` (store central).
2. `generateMatrix.ts` recalcula la matriz de bits del QR (solo cuando cambia el contenido o el ECC level).
3. `styleRenderer.ts` dibuja la matriz aplicando el estilo → actualiza `QrPreview2D`.
4. Si el usuario activa el modo 3D: `buildQrMesh.ts` toma la misma matriz + parámetros 3D → genera geometría three.js → `QrPreview3D` la renderiza.
5. Exportar: se reutiliza la matriz/geometría ya calculada, no se regenera nada — solo se serializa al formato pedido (PNG/SVG/PDF/STL/GLB).

## 6. Consideraciones técnicas importantes

- **Legibilidad del QR:** cualquier personalización (logo, colores, degradados) debe validarse contra el nivel de corrección de errores. Usar ECC "H" (30%) por defecto cuando hay logo, y limitar el tamaño máximo del logo (~20-25% del área).
- **Contraste de color:** validar que el contraste entre módulos y fondo sea suficiente para que un lector estándar lo escanee (advertencia en UI si el contraste es bajo).
- **Rendimiento del render 3D:** para QRs grandes (ej. versión 10+, muchos módulos), fusionar geometrías (`BufferGeometryUtils.mergeGeometries`) en vez de crear un mesh por módulo, para no matar el frame rate.
- **Tamaño de archivo STL:** limitar la resolución/cantidad de triángulos; ofrecer un preset "optimizado para impresión" vs "alta fidelidad".
- **Todo client-side en el MVP:** evita backend, cold starts y costos — importante para que el playground sea instantáneo.
- **Accesibilidad:** controles del editor con labels correctos, contraste de la UI, navegación por teclado.

## 7. Roadmap sugerido

| Fase | Contenido | Estimación |
|---|---|---|
| 0 | Setup del proyecto (Astro + Tailwind + React island), layout base, landing | 1-2 días |
| 1 | Generador QR 2D con personalización completa + exportación PNG/SVG/PDF | 1-2 semanas |
| 2 | Modo 3D: geometría, visor three.js, exportación STL/GLB | 1-2 semanas |
| 3 | Extras: cuentas, QR dinámicos, plantillas, analytics (si se decide continuar) | Variable |

## 8. Próximos pasos inmediatos

1. Confirmar alcance del MVP (¿incluye WiFi/vCard desde el día 1, o solo URL/texto?).
2. `npm create astro@latest` con template mínimo + integración de Tailwind (`astro add tailwind`) y React (`astro add react`).
3. Elegir librería de generación QR base: `qr-code-styling` (más rápido de integrar) vs. construir el render propio sobre `qrcode` (más control, más trabajo).
4. Prototipar primero la geometría 3D de un QR simple (sin editor aún) para validar que la extrusión + exportación STL funciona bien antes de construir todo el UI alrededor.

---
*Este documento es un plan vivo — se debe actualizar a medida que se tomen decisiones (ej. si se agrega backend, qué librería de QR se usa finalmente, etc.).*
