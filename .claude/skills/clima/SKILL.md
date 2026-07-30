---
name: clima
description: Consulta la climatología actual de una ciudad. Si el usuario no especifica ciudad, usa Zaragoza por defecto.
---

# Skill: clima

Devuelve la climatología actual de una ciudad usando el servicio público `wttr.in` (no requiere API key).

## Uso

El usuario puede invocar esta skill con o sin argumento:

- `/clima` → usa **Zaragoza** como ciudad por defecto.
- `/clima Madrid` → usa la ciudad indicada (`Madrid`).

## Pasos a seguir

1. Determinar la ciudad: si `args` está vacío, usar `Zaragoza`; si no, usar el texto de `args` tal cual (respetar espacios, sustituyéndolos por `+` en la URL).
2. Ejecutar con la herramienta Bash:

   ```bash
   curl -s "wttr.in/<CIUDAD>?format=%l:+%C+%t+(sensacion+%f)+%h+humedad+%w+viento&lang=es"
   ```

   Sustituir `<CIUDAD>` por la ciudad determinada en el paso 1 (espacios como `+`).

3. Si `curl` falla o no hay red, informar al usuario en una frase que no se pudo obtener el dato, sin inventar cifras.
4. Mostrar el resultado devuelto por `wttr.in` tal cual, en una frase breve en español.

## Notas

- No se requiere clave de API ni configuración adicional.
- No hacer llamadas adicionales ni pedir confirmación: es una consulta de solo lectura sin efectos secundarios.
