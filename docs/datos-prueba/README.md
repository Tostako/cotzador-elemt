# Datos de prueba — Presupuestos de Obra

Para ver el módulo con datos de verdad en vez de pantallas vacías.

## 1. Sembrar un proyecto completo

Crea el catálogo (27 insumos + 10 APUs con su composición) y un proyecto con
presupuesto de 10 actividades.

1. Abre la app **con la sesión iniciada**.
2. Consola del navegador (F12 → Console).
3. Pega [`../semilla-obra.js`](../semilla-obra.js) entero y pulsa Enter.
4. Ejecuta `await sembrar()`.

Al terminar imprime el id del proyecto y su URL. Para borrarlo: `await limpiar()`
(manda el proyecto a la papelera; el catálogo se queda, es reutilizable).

Es **idempotente**: si lo ejecutas dos veces no duplica insumos ni APUs, los
busca por descripción antes de crearlos.

### Qué debería salir

Si el backend calcula bien, el proyecto —85 m², remodelación, AIU 15/3/5 sin
IVA— tiene que dar exactamente esto:

| | |
|---|---|
| Costo directo | $33.145.040 |
| AIU (23 %) | $7.623.359 |
| **Total** | **$40.768.399** |
| Por m² | $479.628 |

Y algunos valores unitarios para comprobar la composición de los APUs:

| APU | V. unitario |
|---|---|
| Mampostería en bloque n.º 5 | $104.805 /m² |
| Enchape de piso en porcelanato 60x60 | $125.310 /m² |
| Estuco y pintura sobre muro | $37.970 /m² |
| Punto eléctrico tomacorriente doble | $128.700 /und |

Si tus números no cuadran con estos, el fallo está en cómo el servidor
multiplica rendimiento × precio o en cómo suma la cascada — no en los datos.

> Los valores unitarios de esta tabla los calculé yo a partir de los
> rendimientos del script. **No los ha confirmado el backend todavía**: son
> justamente lo que hay que contrastar.

## 2. Probar la importación (HU-13)

En Base de APUs y en Insumos, botón **Importar**.

| Archivo | Para qué |
|---|---|
| [`insumos.csv`](insumos.csv) | 30 filas, todas válidas |
| [`apus.csv`](apus.csv) | 12 filas, todas válidas |
| [`insumos-con-errores.csv`](insumos-con-errores.csv) | 10 filas: 4 entran, 6 se rechazan |

**Columnas de cada tipo:**

| Tipo | Columnas |
|---|---|
| Insumos | `descripcion`, `unidad`, `grupo`, `valorUnitario` — todas obligatorias |
| APUs | `descripcion`, `unidad`, `capitulo` obligatorias; `codigo` opcional |

En los APUs, el **capítulo se escribe por nombre o por código** (`Estructura` o
`EST`) y tiene que existir ya en el catálogo: la app lo traduce al UUID que
espera el servidor y rechaza la fila si no lo encuentra. El `codigo` del APU es
obligatorio para el servidor (máx. 30 caracteres); si el CSV no trae esa
columna se genera desde la descripción.

Los APUs importados así entran **sin composición**: quedan creados y hay que
abrirlos para añadirles insumos y rendimientos.

El de errores sirve para ver que el rechazo funciona. Debería marcar:

| Fila | Motivo |
|---|---|
| 3 | grupo `MATERIALS` no válido |
| 4 | valor unitario `abc` no es un número |
| 5 | sin descripción |
| 6 | sin valor unitario |
| 9 | valor negativo |
| 10 | grupo `MAQUINARIA` no válido |

Y la fila 11 **sí** debe entrar, con valor `72500`: `72.500` se lee como setenta
y dos mil quinientos, que es como se escribe en Colombia, no como 72 con 5.

Ojo con el orden: primero importa los insumos, luego los APUs. Y los capítulos
del `apus.csv` (`PRELIMINARES`, `ESTRUCTURA`, `ACABADOS`, `INSTALACIONES`)
tienen que existir ya en el servidor.

## 3. Probar la cotización (HU-22)

Con el proyecto sembrado: **Presupuesto → Consolidados → Cotizar**. Trae los
materiales preseleccionados. Pon precios en dos o tres líneas y mira la
diferencia contra el presupuesto; el botón «Llevar al maestro» solo aparece en
las líneas que marques como Aprobadas.

## Nombres de grupo

En los CSV se escribe con la convención de la interfaz —`MATERIALES`,
`MANO_OBRA`, `EQUIPOS`, `TRANSPORTE`— y la app lo traduce a lo que espera el
backend (`MATERIAL`, `MANO OBRA`, `EQUIPO`, `TRANSPORTE`) al enviarlo.

El lector es tolerante: acepta singular o plural, guion bajo o espacio, y
mayúsculas o minúsculas. `mano de obra`, `MANO_OBRA` y `MANO OBRA` valen igual.
Lo que no vale es un grupo que no existe, como `MAQUINARIA`.

## Formato de los CSV

Separador `;` y codificación UTF-8, que es lo que produce Excel en español con
«Guardar como → CSV UTF-8». Las descripciones con comas o comillas van
entrecomilladas al estilo Excel (`"Triturado 3/4"""`).

Los `.xlsx` no se leen: hay que exportarlos a CSV primero.
