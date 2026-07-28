# CLAUDE.md

Tetris en JavaScript vanilla + Canvas 2D. Tres archivos: `index.html`, `style.css`, `game.js`.

## Ejecutar

No hay build, ni dependencias, ni tests, ni `package.json`. Se verifica abriendo el juego en el navegador:

```bash
open index.html                 # directo
python3 -m http.server 8000     # o servidor estático
```

## Arquitectura

- Pausa/game over cancelan el `rAF`; despausar reinicia `lastTime` antes de volver a `loop` para no acumular un `dt` gigante.

## Invariantes al modificar

**Añadir o quitar una pieza requiere 3 ediciones coordinadas** (`game.js`):
1. Entrada en `COLORS` en la misma posición del array.
2. Entrada en `PIECES` cuya matriz se rellena con ese mismo índice (la pieza `+` usa `8` en todas sus celdas porque es la posición 8).
3. El literal en `randomPiece()`: `Math.random() * 9` — hay que actualizar el `9` al nuevo número de piezas. Es la fuente de errores más fácil de olvidar.

Hay 9 piezas: las 7 estándar (I, O, T, S, Z, J, L) más `+` (8) y `L larga` (9).

**Las dimensiones del canvas están duplicadas en HTML.** `<canvas id="board" width="300" height="600">` debe ser `COLS * BLOCK` × `ROWS * BLOCK`. Si se cambian `COLS`, `ROWS` o `BLOCK`, hay que editar `index.html` también.

`drawNext()` asume una cuadrícula 4×4 con bloques de 30px (`#next-canvas` es 120×120) y centra la pieza con ese supuesto; piezas mayores de 4 celdas se saldrían.

`clearLines()` muta `board` con `splice`/`unshift` y hace `r++` tras eliminar para reevaluar el mismo índice de fila. No cambiar a un recorrido sin ese ajuste.

## Convenciones

- Texto visible al usuario en español (overlay, botón, README). Identificadores y comentarios de código, mezcla es/en; seguir el estilo del archivo.
- `'use strict'`, ES6+, sin transpilación. Indentación de 2 espacios, sin punto y coma omitidos.
