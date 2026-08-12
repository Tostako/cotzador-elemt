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

⚠️ **El servidor importa XLSX, no CSV.** Estos `.csv` son la plantilla: ábrelos
en Excel y usa «Guardar como → Libro de Excel (.xlsx)». Hay que **renombrar la
hoja** para que coincida con lo que el servidor busca.

| Tipo | Hoja | Cabeceras exactas |
|---|---|---|
| APUs | `APUs` | `codigo` · `descripcion` · `unidad` · `capitulo` · `componentes` |
| Insumos | `Insumos` | `descripcion` · `unidad` · `grupo` · `valorUnitario` |

La columna **`componentes`** lleva los insumos separados por `;`, cada uno como
`nombre:rendimiento`:

```
Cemento gris uso general 50 kg:0.35;Oficial de construcción:0.28
```

El nombre tiene que coincidir **exactamente** con la descripción del insumo en
el maestro, así que importa primero `insumos.csv` y después `apus.csv`. Los 50
componentes de la plantilla están comprobados contra `insumos.csv`.

En el CSV esa celda va entrecomillada, porque su `;` interno chocaría con el
separador de columnas. Al pasar a XLSX el problema desaparece: es una celda.

> El de insumos no está confirmado: el endpoint comparte controlador, pero no
> tengo documentadas su hoja ni sus cabeceras. Si falla, el error del servidor
> dirá qué espera.

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
