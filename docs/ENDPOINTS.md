# Endpoints — ELEMENT Cotizador

Inventario de la API consumida por el frontend, ligado a las historias de usuario
y a las funcionalidades que las implementan.

Fuente única: [`src/shared/services/api.ts`](../src/shared/services/api.ts). Todo
el frontend pasa por ahí; no hay `fetch` sueltos a la API en las pantallas.

---

## 1. Datos generales

| Concepto | Valor |
|---|---|
| Base URL | `VITE_API_URL` (por defecto `http://localhost:3000/api/v1`) |
| Tienda | `VITE_SHOP_SLUG` (por defecto `elemet-haus`), se envía en la cabecera `X-Shop-Slug` |
| Autenticación | `Authorization: Bearer <access_token>` |
| Refresco | Cookie `httpOnly`; se manda con `credentials: 'include'` |

**Sobre el refresco:** ante un 401 se llama a `/auth/customer/refresh` y se
reintenta la petición. Varias peticiones que fallan a la vez comparten un único
refresco (*single-flight*). Si el refresco falla se emite el evento
`auth:expired` y la sesión se cierra.

---

## 2. Historias de usuario

| ID | Historia | Funcionalidad | Estado |
|---|---|---|---|
| HU-01 | Como profesional quiero **crear una cuenta e iniciar sesión** para acceder a mis proyectos | Registro / Login / Recuperar contraseña | ✅ |
| HU-02 | Como visitante quiero **ver la landing** para entender qué hace la plataforma | Landing pública | ✅ |
| HU-03 | Como arquitecto quiero **dibujar el plano** por pisos y habitaciones para no volver a medir | Planos de casa | ✅ |
| HU-04 | Como constructor quiero **calcular enchapes** (pisos y paredes) desde el plano | Calculadora de enchapes | ✅ |
| HU-05 | Como constructor quiero **calcular barrederas** por perímetro desde el plano | Calculadora de barrederas | ✅ |
| HU-06 | Como constructor quiero **calcular cornisas de techo** desde el plano | Calculadora de cornisas | ⚠️ Parcial |
| HU-07 | Como profesional quiero **un catálogo de materiales con precios por ferretería** para cotizar con el mejor precio | Materiales | ✅ |
| HU-08 | Como profesional quiero **cotizar un proyecto** con mis tarifas y precio en vivo | Cotizador | ✅ |
| HU-09 | Como profesional quiero **emitir cuentas de cobro** formales | Cuentas de cobro | ✅ |
| HU-10 | Como profesional quiero **planes de pago y registro de abonos** para saber quién me debe | Planes y pagos | ✅ |
| HU-11 | Como profesional quiero **configurar mis tarifas y datos de empresa** | Configuración | ✅ |

⚠️ **HU-06 (Cornisas)**: los endpoints `cornisas-projects` **no existen todavía en
el backend**. La calculadora funciona completa (elegir plano, materiales,
cálculo); solo falla "Guardar obra". Ver §3.8.

---

## 3. Endpoints por funcionalidad

### 3.1 Autenticación — HU-01

| Método | Ruta | Uso |
|---|---|---|
| POST | `/auth/customer/register` | Crear cuenta |
| POST | `/auth/customer/login` | Iniciar sesión |
| POST | `/auth/customer/select-shop` | Resolver token pendiente (sin `shop_id`) |
| GET | `/auth/me` | Datos del usuario |
| POST | `/auth/customer/logout` | Revocar refresh token |
| POST | `/auth/customer/refresh` | Renovar el access token |
| PATCH | `/customers/me` | Actualizar perfil |
| PATCH | `/auth/customer/reset-password` | Restablecer contraseña |

**Nota:** el login puede devolver un token *pendiente* sin `shop_id`. En ese caso
hay que llamar a `select-shop` para obtener el token definitivo.

### 3.2 Landing pública — HU-02

| Método | Ruta | Uso |
|---|---|---|
| GET | `/public/site-config` | Textos configurables |
| GET | `/public/landing-images` | Imágenes de la landing |

Son los únicos endpoints **sin autenticación**.

### 3.3 Planos de casa — HU-03

| Método | Ruta | Uso |
|---|---|---|
| GET | `/tile-calculator/house-plans` | Listar planos |
| GET | `/tile-calculator/house-plans/:id` | Abrir un plano |
| POST | `/tile-calculator/house-plans` | Crear |
| PUT | `/tile-calculator/house-plans/:id` | Actualizar |
| DELETE | `/tile-calculator/house-plans/:id` | Eliminar |

El plano es la **plantilla maestra**: de él salen el área para enchapes y el
perímetro para barrederas y cornisas. Cada espacio guarda `nodos`, `muros`
(con `abertura` y columnas) y `puntos`.

### 3.4 Derivar plano → calculadoras — HU-04, HU-05, HU-06

| Método | Ruta | Uso |
|---|---|---|
| POST | `/tile-calculator/house-plans/:id/import-to-tiles` | Plano → proyecto de enchapes |
| POST | `/tile-calculator/house-plans/:id/import-to-guardaescobas` | Plano → proyecto de barrederas |
| POST | `/tile-calculator/house-plans/:id/import-to-cornisas` | Plano → proyecto de cornisas ⚠️ |
| POST | `/tile-calculator/house-plans/:id/sync-to-tiles/:projectId` | Re-sincronizar enchapes |
| POST | `/tile-calculator/house-plans/:id/sync-to-guardaescobas/:projectId` | Re-sincronizar barrederas |

### 3.5 Calculadora de enchapes — HU-04

| Método | Ruta | Uso |
|---|---|---|
| GET | `/tile-calculator/projects` | Listar proyectos |
| GET | `/tile-calculator/projects/:id` | Abrir proyecto |
| POST | `/tile-calculator/projects` | Crear |
| PUT | `/tile-calculator/projects/:id` | Guardar |
| DELETE | `/tile-calculator/projects/:id` | Eliminar |

**Aviso de contrato:** el frontend envía el proyecto en `snake_case`
(`tipo_acabado`, `formato_largo`, `m2_caja`, `precio_m2`) pero **acepta ambas
convenciones al leer**, porque si llegan en `camelCase` se perdían el formato y
el precio y el material quedaba inservible.

### 3.6 Calculadora de barrederas — HU-05

| Método | Ruta | Uso |
|---|---|---|
| GET | `/tile-calculator/guardaescobas-projects` | Listar |
| GET | `/tile-calculator/guardaescobas-projects/:id` | Abrir |
| POST | `/tile-calculator/guardaescobas-projects` | Crear |
| PUT | `/tile-calculator/guardaescobas-projects/:id` | Guardar (incluye materiales) |
| DELETE | `/tile-calculator/guardaescobas-projects/:id` | Eliminar |
| POST | `/tile-calculator/guardaescobas-projects/:id/calculate` | Calcular en servidor |

En el backend las barrederas se llaman **guardaescobas**.

### 3.7 Catálogo de materiales — HU-07

| Método | Ruta | Uso |
|---|---|---|
| GET | `/quote-catalog/categories` | Listar categorías |
| POST | `/quote-catalog/categories` | Crear categoría |
| DELETE | `/quote-catalog/categories/:id` | Eliminar categoría |
| GET | `/quote-catalog/products?category_id=` | Productos **de una categoría** |
| GET | `/quote-catalog/products/:id` | Detalle |
| POST | `/quote-catalog/products` | Crear |
| DELETE | `/quote-catalog/products/:id` | Eliminar |
| POST | `/quote-catalog/products/:id/prices` | Agregar precio de una ferretería |
| PATCH | `/quote-catalog/products/:pid/prices/:id` | Editar precio |
| DELETE | `/quote-catalog/products/:pid/prices/:id` | Eliminar precio |
| GET | `/quote-catalog/orders` | Listar pedidos |
| POST | `/quote-catalog/orders` | Crear pedido |

**⚠️ Importante — el filtro por categoría:**
`GET /quote-catalog/products` **sin** `category_id` devuelve *todas* las
categorías mezcladas (barrederas, cornisas, enchapes, herramientas…). Las
calculadoras **vuelven a filtrar por `category_id` en el cliente** para que un
fallo del filtro del servidor no meta materiales de una calculadora en otra.

Cada calculadora usa su propia categoría, buscada **por nombre**:
`Barrederas`, `Cornisas`, `Enchapes`.

**Formato de `description`** — es donde las calculadoras guardan los datos del
material, y de donde los reconstruyen al leer:

| Origen | Formato |
|---|---|
| Barrederas (metro) | `aluminio · por metro · altura 10 cm` |
| Barrederas (cerámica) | `aluminio · cerámica 50 cm · 3 tira(s)/cerámica` |
| Cornisas (metro) | `poliuretano · por metro · desarrollo 7.5 cm` |
| Cornisas (tira) | `poliuretano · tira de 600 cm · desarrollo 7.5 cm` |
| Enchapes | `Cerámica · Formato 120×120×0.2 cm · Uso: Ambos · Marca: X` |

El precio se toma de `lowest_price` (el más barato entre las ferreterías).
El nombre del producto es `Nombre - Color`.

### 3.8 Calculadora de cornisas — HU-06 ⚠️

| Método | Ruta | Estado |
|---|---|---|
| GET | `/tile-calculator/cornisas-projects` | ❌ No existe |
| GET | `/tile-calculator/cornisas-projects/:id` | ❌ No existe |
| POST | `/tile-calculator/cornisas-projects` | ❌ No existe |
| PUT | `/tile-calculator/cornisas-projects/:id` | ❌ No existe |
| DELETE | `/tile-calculator/cornisas-projects/:id` | ❌ No existe |
| POST | `/tile-calculator/house-plans/:id/import-to-cornisas` | ❌ No existe |

**Pendiente de backend.** Son un espejo exacto de los de guardaescobas (§3.6).
Mientras no existan, "Guardar obra" en Cornisas devuelve error; el resto de la
calculadora funciona.

### 3.9 Cotizaciones — HU-08

| Método | Ruta | Uso |
|---|---|---|
| GET | `/quotes` | Listar |
| GET | `/quotes/:id` | Detalle |
| POST | `/quotes` | Crear |
| PATCH | `/quotes/:id` | Actualizar |
| DELETE | `/quotes/:id` | Eliminar |
| POST | `/quotes/:id/select-plan` | Asignar plan de pago |

### 3.10 Planes de pago y abonos — HU-10

| Método | Ruta | Uso |
|---|---|---|
| GET | `/payment-plans` | Listar planes |
| GET | `/payment-plans/:id` | Detalle |
| POST | `/payment-plans` | Crear |
| PUT | `/payment-plans/:id` | Actualizar |
| DELETE | `/payment-plans/:id` | Eliminar |
| PATCH | `/payment-plans/:id/default` | Marcar como predeterminado |
| GET | `/quotes/:id/payments` | Abonos de una cotización |
| POST | `/quotes/:id/payments` | Registrar abono |
| DELETE | `/quotes/:id/payments/:paymentId` | Eliminar abono |

### 3.11 Configuración — HU-11

| Método | Ruta | Uso |
|---|---|---|
| GET | `/customer-config/me` | Leer configuración (tarifas, datos de empresa, firma) |
| PUT | `/customer-config/me` | Guardar configuración |

---

## 4. Formato de respuesta

Las respuestas vienen envueltas en `data`:

```json
{ "data": [ ... ] }
```

El frontend usa `extractData()` (en `api.ts`), que devuelve `res.data` si existe
y si no la respuesta tal cual — así tolera ambas formas.

---

## 5. Presupuestos de Obra (APU)

Módulo aparte, publicado bajo **`/api/v1/costos/…`**. Se define en el
documento DOC-05 de la carpeta de análisis y cubre las fases 1 y 2.

**Dos diferencias respecto al resto de la API:**

1. **No lleva `shop_slug`.** El tenant se resuelve desde el JWT. `api()` excluye
   estas rutas del parámetro que añade automáticamente a todo lo demás.
2. **Mezcla convenciones de nombres.** El proyecto usa `snake_case`
   (`area_m2`, `tipo_obra`) pero el AIU usa el prefijo delante
   (`pctAdministracion`, `pctIva`). La traducción vive en
   [`mapeo.ts`](../src/features/presupuestos/mapeo.ts) y las lecturas aceptan
   ambas formas, para que un cambio de contrato no pierda campos en silencio.

### 5.1 Proyectos de obra — HU-01, HU-03

| Método | Ruta | Uso |
|---|---|---|
| GET | `/costos/projects` | Listar (`?estado=` `?page=` `?per_page=`) |
| GET | `/costos/projects/:id` | Detalle |
| POST | `/costos/projects` | Crear (el AIU va anidado) |
| PATCH | `/costos/projects/:id` | Editar (admite `If-Match: <version>`) |
| DELETE | `/costos/projects/:id` | Borrado lógico → papelera |
| POST | `/costos/projects/:id/restaurar` | Restaurar |
| GET | `/costos/projects/paperera` | Listar papelera |

⚠️ **Riesgo de orden de rutas:** `/projects/paperera` debe declararse **antes**
que `/projects/:id`, o el router interpretará `paperera` como un id.

### 5.2 Presupuesto — HU-04, HU-05, HU-06, HU-07

| Método | Ruta | Uso |
|---|---|---|
| GET | `/costos/projects/:id/budget` | Presupuesto por capítulos |
| POST | `/costos/projects/:id/budget/items` | Agregar actividad desde un APU |
| PATCH | `/costos/projects/:id/budget/items/:itemId` | Cambiar cantidad (solo ese campo) |
| DELETE | `/costos/projects/:id/budget/items/:itemId` | Eliminar actividad |
| POST | `/costos/undo/:undoToken` | Deshacer (token válido 10 s) |

### 5.3 APU de una actividad — HU-11 (decisión H-07)

Los dos alcances son endpoints distintos **a propósito**, con permisos distintos:

| Método | Ruta | Alcance |
|---|---|---|
| GET | `/costos/projects/:id/budget/items/:itemId/apu` | Instantánea del proyecto |
| PUT | `/costos/projects/:id/budget/items/:itemId/apu` | **Solo este proyecto** |
| POST | `/costos/projects/:id/budget/items/:itemId/apu/promote` | **Catálogo global** (`?dryRun=true` primero) |

El cuerpo del `PUT` lleva **solo rendimientos**; los precios los pone el
servidor desde el maestro de insumos.

### 5.4 Catálogo — HU-09, HU-10, HU-12, HU-14

| Método | Ruta | Uso |
|---|---|---|
| GET | `/costos/catalog/apus` | Buscar (`?q=` `?capituloId=` `?limit=`) |
| GET | `/costos/catalog/apus/:id` | Detalle con composición |
| POST | `/costos/catalog/apus` | Crear APU (origen Personalizado) |
| PATCH | `/costos/catalog/apus/:id` | Editar el catálogo (admin) |
| GET | `/costos/catalog/apus/:id/impact` | A quién afectaría editarlo |
| POST | `/costos/catalog/apus/:id/duplicate` | Duplicar (nombre distinto obligatorio) |
| GET | `/costos/catalog/chapters` | Capítulos |
| GET | `/costos/catalog/supplies` | Insumos (`?q=` `?grupo=`) |
| POST | `/costos/catalog/supplies` | Alta de insumo |
| POST | `/costos/catalog/supplies/:id/prices` | Nuevo precio — **escribe siempre** |
| GET | `/costos/catalog/supplies/:id/prices` | Serie histórica de precios |
| GET | `/costos/catalog/supplies/:id/usage` | Dónde se usa |

⚠️ **El patrón de dos fases del DOC-05 no existe en el backend real.**

`CreatePriceDto` acepta `{ valor }` obligatorio y `vigente_desde`, `usuario`,
`motivo`, `origen` opcionales. **No hay `dryRun` ni `confirmationToken`.**

Consecuencias, ya corregidas en el frontend:

- Llamar con `?dryRun=true` **no simulaba: creaba el precio.** El botón «Ver
  impacto» del maestro aplicaba el cambio, y el diálogo «Llevar al maestro» de
  cotizaciones lo aplicaba **con solo abrirse**, antes de confirmar nada.
- Mandar `confirmationToken` es un campo fuera del DTO: con
  `forbidNonWhitelisted` activo, 400.

Ahora la vista previa se arma con `/usage` (una lectura) y el umbral de
variación se evalúa en el cliente (25 %); el cambio se escribe una sola vez, al
confirmar.

✅ **`apu/promote` sí implementa las dos fases** (verificado en
`budget.controller.ts:58` y `budget.service.ts:484`), pero **no por el cuerpo**:
el controlador no tiene `@Body()`.

| Dato | Cómo viaja |
|---|---|
| `dryRun` | query — `?dryRun=true` (también acepta `1`) |
| Token | cabecera **`x-confirmation-token`** |

Mandar el token en el cuerpo —como se hacía— no llega al `@Headers()` y el
servicio responde **422 `CONFIRMACION_REQUERIDA`**.

El servicio devuelve el impacto **esparcido en la raíz**
(`{ dry_run, ...impacto, confirmado }`), no anidado bajo `impacto`. Si el APU
ya coincide con el global responde `sin_cambios` y no escribe.

⚠️ **El enum de `grupo` no coincide con el de la interfaz.** El validador del
backend acepta **`MATERIAL`, `MANO OBRA`, `EQUIPO`, `TRANSPORTE`** —singular, y
con espacio en «MANO OBRA»—; la interfaz usa `MATERIALES`, `MANO_OBRA`,
`EQUIPOS`, `TRANSPORTE`. Mandar el nombre de la interfaz devuelve **400**.

La traducción vive en [`mapeo.ts`](../src/features/presupuestos/mapeo.ts)
(`grupoABackend` / `grupoDesdeBackend`) y se aplica en los seis sitios donde el
grupo cruza la red: crear insumo, filtrar el maestro, importar, y leer el
maestro, el consolidado y la analítica del panel.

La lectura acepta las dos convenciones a propósito. Un grupo no reconocido no
da error visible: deja la etiqueta en blanco y saca al insumo de su sección del
consolidado — el mismo fallo silencioso que ya costó caro con los materiales de
enchapes.

### 5.5 Cierre financiero, analítica y salidas

| Método | Ruta | Historia |
|---|---|---|
| GET · PUT | `/costos/projects/:id/aiu` | HU-16 |
| GET | `/costos/projects/:id/analytics/summary` | HU-17, HU-18 |
| GET | `/costos/projects/:id/analytics/consolidated` | HU-19 |
| GET | `/costos/templates` | HU-02 |
| POST | `/costos/projects/:id/apply-template` | HU-02 (`modo` obligatorio si ya hay contenido) |
| GET · POST | `/costos/projects/:id/documents` | HU-20, HU-21 (asíncrono: 202 + id) |
| GET | `/costos/documents/:docId` | Estado del documento |

### 5.6 Memorias, cotizaciones, importación y marca — fase 3

| Método | Ruta | Historia |
|---|---|---|
| GET · PUT | `/costos/projects/:id/budget/items/:itemId/memoria` | HU-08 |
| GET · POST | `/costos/projects/:id/quotations` | HU-22 |
| PATCH | `/costos/projects/:id/quotations/:quotationId` | HU-22 |
| POST | `/costos/catalog/apus/import` | HU-13 |
| POST | `/costos/catalog/supplies/import` | HU-13 |
| GET | `/costos/catalog/imports/:jobId/errors` | HU-13 |
| POST | `/costos/catalog/imports/:jobId/confirm` | HU-13 |
| GET · PUT | `/costos/org/branding` | HU-25 |
| GET | `/costos/org/document-templates` | HU-25 |

Notas de contrato que el frontend da por supuestas:

- **HU-08.** El `PUT` manda `{ partes[], nota, gobiernaCantidad, total }`. Si
  `gobiernaCantidad` es cierto, el servidor debe fijar la cantidad de la
  actividad al total y devolver `tieneMemoria` y `cantidadDesdeMemoria` en el
  presupuesto: la tabla los usa para bloquear el campo y marcar las actividades
  sin soporte.
- **HU-13.** El `POST` de importación va con `{ filas[], dryRun: true }` y se
  espera `{ jobId }`; el alta real ocurre en `/confirm`. Si la respuesta **no**
  trae `jobId`, el frontend asume que la importación ya se aplicó de una vez y
  no pide confirmación.
- **HU-22.** El `PATCH` manda solo las líneas cambiadas: `{ lineas: [{ id, … }] }`.
  Llevar un precio aprobado al maestro **no** va por aquí: reutiliza
  `/catalog/supplies/:id/prices` con su patrón de dos fases.
- **HU-25.** La marca es de la organización, no del proyecto, y no puede
  repercutir en ningún cálculo.

### 5.7 Fuera de alcance

| Historia | Decisión |
|---|---|
| HU-23 · Asistente de IA en modo local | **Descartada** por decisión de producto |
| HU-24 · IA generativa | **Descartada** (dependía de HU-23) |

Los endpoints `/ai/query` y `/ai/apu-proposals` del DOC-05 **no se consumen**
y no hace falta implementarlos.

---

## 6. Resumen

### Sistema original

| Área | Endpoints | Estado |
|---|---|---|
| Autenticación | 8 | ✅ |
| Landing pública | 2 | ✅ |
| Planos de casa | 5 | ✅ |
| Derivar plano | 5 | ⚠️ falta `import-to-cornisas` |
| Enchapes | 5 | ✅ |
| Barrederas | 6 | ✅ |
| Cornisas | 6 | ❌ Pendientes |
| Catálogo de materiales | 12 | ✅ |
| Cotizaciones | 6 | ✅ |
| Planes y pagos | 9 | ✅ |
| Configuración | 2 | ✅ |
| **Subtotal** | **66** | 60 disponibles · 6 pendientes |

### Presupuestos de Obra

| Área | Endpoints | Estado |
|---|---|---|
| Proyectos | 7 | ✅ confirmado por backend |
| Presupuesto y deshacer | 5 | ⏳ en desarrollo |
| APU de actividad (2 alcances) | 3 | ⏳ en desarrollo |
| Catálogo de APUs e insumos | 11 | ⏳ en desarrollo |
| AIU, analítica, plantillas y documentos | 9 | ⏳ en desarrollo |
| Memorias, cotizaciones, importación y marca | 11 | ⏳ en desarrollo |
| **Subtotal** | **46** | |

**Estado de las fases:** las tres completas en el frontend (23 historias), menos
HU-23 y HU-24, descartadas.

Lo que queda pendiente no es de fase sino transversal:

- **Importar `.xlsx` directamente.** Hoy se pide CSV; el lector de `.xlsx`
  necesitaría una dependencia nueva en el bundle.

**Descartado a propósito:** `If-Match`/ETag para la concurrencia optimista del
presupuesto. Un presupuesto de obra lo lleva una sola persona, así que dos
ediciones simultáneas del mismo proyecto no es un escenario real. El campo
`Proyecto.version` se queda declarado por si eso cambia, pero nada lo rellena.
Si algún día hiciera falta, el trabajo es: que `api()` pueda devolver las
cabeceras de respuesta (hoy las descarta en `return await response.json()`),
arrastrar la versión al escribir y tratar el 409.

## 7. Datos de prueba

En [`datos-prueba/`](datos-prueba/) hay tres CSV para probar la importación del
catálogo (HU-13), y [`semilla-obra.js`](semilla-obra.js) crea un proyecto
completo desde la consola del navegador. Ver [`datos-prueba/README.md`](datos-prueba/README.md).

> Ninguna pantalla del módulo se ha probado contra el backend real: todo se
> verificó con respuestas simuladas según los contratos del DOC-05. Para
> comprobarlo de verdad está [`diagnostico-obra.js`](diagnostico-obra.js).
