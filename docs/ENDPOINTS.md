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

## 5. Resumen

| Área | Endpoints | Estado |
|---|---|---|
| Autenticación | 8 | ✅ |
| Landing pública | 2 | ✅ |
| Planos de casa | 5 | ✅ |
| Derivar plano | 5 | ⚠️ falta `import-to-cornisas` |
| Enchapes | 5 | ✅ |
| Barrederas | 6 | ✅ |
| Cornisas | 6 | ❌ Pendientes |
| Catálogo | 12 | ✅ |
| Cotizaciones | 6 | ✅ |
| Planes y pagos | 9 | ✅ |
| Configuración | 2 | ✅ |
| **Total** | **66** | **60 disponibles · 6 pendientes** |
