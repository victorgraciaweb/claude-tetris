# CLAUDE.md

Tetris en JavaScript vanilla + Canvas 2D. Tres archivos: `index.html`, `style.css`, `game.js`.

## Ejecutar

No hay build, ni dependencias, ni tests, ni `package.json`. Se verifica abriendo el juego en el navegador:

```bash
open index.html                 # directo
python3 -m http.server 8000     # o servidor estático
```

## Arquitectura

Todo el juego vive en `game.js` como funciones de nivel superior sobre variables globales del módulo (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `dropAccum`, `animId`). No hay clases ni módulos ES.

- `init()` es a la vez arranque y reinicio: resetea todo el estado, cancela el `animId` anterior y relanza el loop. El botón de reinicio llama directamente a `init`.
- `loop(ts)` (`requestAnimationFrame`) acumula `dt` en `dropAccum` y baja una fila cuando supera `dropInterval`; dibuja en cada frame.
- `board` es matriz `ROWS × COLS` de enteros: `0` = vacío, `1..N` = índice de pieza, que es también el índice en `COLORS`.
- Pausa/game over cancelan el `rAF`; despausar reinicia `lastTime` antes de volver a `loop` para no acumular un `dt` gigante.

## Invariantes al modificar

**Añadir o quitar una pieza requiere 3 ediciones coordinadas** (`game.js`):
1. Entrada en `COLORS` en la misma posición del array.
2. Entrada en `PIECES` cuya matriz se rellena con ese mismo índice (la pieza `+` usa `8` en todas sus celdas porque es la posición 8).
3. El literal en `randomPiece()`: `Math.random() * 8` — hay que actualizar el `8` al nuevo número de piezas. Es la fuente de errores más fácil de olvidar.

**Las dimensiones del canvas están duplicadas en HTML.** `<canvas id="board" width="300" height="600">` debe ser `COLS * BLOCK` × `ROWS * BLOCK`. Si se cambian `COLS`, `ROWS` o `BLOCK`, hay que editar `index.html` también.

`drawNext()` asume una cuadrícula 4×4 con bloques de 30px (`#next-canvas` es 120×120) y centra la pieza con ese supuesto; piezas mayores de 4 celdas se saldrían.

`clearLines()` muta `board` con `splice`/`unshift` y hace `r++` tras eliminar para reevaluar el mismo índice de fila. No cambiar a un recorrido sin ese ajuste.

## Convenciones

- Texto visible al usuario en español (overlay, botón, README). Identificadores y comentarios de código, mezcla es/en; seguir el estilo del archivo.
- `'use strict'`, ES6+, sin transpilación. Indentación de 2 espacios, sin punto y coma omitidos.
