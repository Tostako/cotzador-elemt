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

Usa los **`.xlsx`**: son los que acepta el servidor, ya con la hoja y las
cabeceras correctas. Se suben tal cual, sin tocar nada.

| Archivo | Hoja | Para qué |
|---|---|---|
| [`insumos.xlsx`](insumos.xlsx) | `Insumos` | 30 filas, todas válidas |
| [`apus.xlsx`](apus.xlsx) | `APUs` | 10 APUs con su composición |
| [`insumos-con-errores.xlsx`](insumos-con-errores.xlsx) | `Insumos` | 10 filas: 4 entran, 6 se rechazan |

Los `.csv` del mismo nombre son la **fuente legible**: se leen y se comparan en
git, que un binario no permite. Si cambias uno, hay que regenerar el `.xlsx`
correspondiente.

**Cabeceras exactas que espera el servidor:**

| Tipo | Hoja | Columnas |
|---|---|---|
| APUs | `APUs` (o la primera) | `codigo` · `descripcion` · `unidad` · `capitulo` · `componentes` |
| Insumos | `Insumos` (o la primera) | `descripcion` · `unidad` · `grupo` |

⚠️ **El `grupo` va en la convención del backend, no en la de la app**:
`MATERIAL`, `MANO_OBRA`, `EQUIPO`, `TRANSPORTE` — en **singular** para
materiales y equipos. Tolera minúsculas, pero no `MATERIALES`, ni `EQUIPOS`, ni
`MANO DE OBRA`. Dentro de la app esa traducción la hace `mapeo.ts` al enviar;
el XLSX va directo al servidor y tiene que llevarla ya hecha.

⚠️ **La importación de insumos no trae precios**: la hoja no tiene columna de
valor, así que los insumos entran a $0 y hay que ponérselos después desde el
maestro. Si quieres catálogo con precios, usa la semilla, que hace las dos
llamadas.

Otras reglas: `descripcion` y `unidad` son obligatorias; una descripción
repetida **dentro del archivo** es un error; y si la descripción ya existe en
el shop, esa fila cuenta como *actualizada* en vez de nueva.

La columna **`componentes`** lleva los insumos separados por `;`, cada uno como
`nombre:rendimiento`:

```
Cemento gris uso general 50 kg:0.35;Oficial de construcción:0.28
```

El emparejamiento no distingue mayúsculas, pero **sí acentos, espacios y
cifras**: «Cemento gris x50kg» y «Cemento gris x50 kg» son insumos distintos.
Por eso hay que importar **primero `insumos.xlsx`, confirmar, y después
`apus.xlsx`**. Los 50 componentes están comprobados uno a uno contra el
maestro. Una celda vacía es válida: el APU queda sin componentes.

El `capitulo` se resuelve por nombre y es opcional — si no existe, el APU queda
sin capítulo en lugar de rechazarse.

En el `.csv` esa celda va entrecomillada, porque su `;` interno chocaría con el
separador de columnas. En el `.xlsx` no hay problema: es una celda.

### El archivo de errores

Sirve para ver que el rechazo por filas funciona sin bloquear al resto. La
numeración puede no coincidir con la del archivo:

| Fila | Debería | Por qué |
|---|---|---|
| 2 | entrar | correcta |
| 3 | rechazar | grupo `MATERIALES` (plural) |
| 4 | rechazar | grupo `MANO DE OBRA` (con espacios) |
| 5 | rechazar | sin descripción |
| 6 | rechazar | sin unidad |
| 7 | **entrar** | grupo `material` en minúsculas — sí se tolera |
| 8 | entrar | correcta |
| 9 | rechazar | grupo `MAQUINARIA` no existe |
| 10 y 11 | rechazar una | descripción duplicada dentro del archivo |

La fila 7 es la interesante: comprueba que las minúsculas **sí** pasan, para no
confundir «estricto con el nombre» con «estricto con las mayúsculas».

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
