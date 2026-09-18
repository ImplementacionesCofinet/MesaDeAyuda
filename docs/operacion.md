# Cómo se opera la mesa

## Roles

| Rol | Quién | Qué puede hacer |
| --- | --- | --- |
| **Solicitante** | Cualquier persona de un área | Registrar requerimientos, ver los de su área, comentar y confirmar entregas |
| **Datos y TI** | El equipo del área | Todo lo anterior sobre cualquier ticket, más gestionar estado, etapa, responsable, prioridad y fechas |
| **Administrador** | Quien lidera el área | Además: áreas, categorías, roles y acuerdos de tiempo |

Qué ve cada quien: el equipo de Datos y TI ve todos los tickets. Una persona de
un área ve los suyos, los de su área y las iniciativas internas de Datos y TI
(están en el mismo tablero justamente para que se vea la carga real). Las
**notas internas** nunca salen del equipo.

## Estados

| Estado | Qué significa para el área |
| --- | --- |
| Nuevo | Registrado, pendiente de revisión por Datos y TI |
| En análisis | Estamos entendiendo el requerimiento y dimensionando el trabajo |
| En desarrollo | El trabajo está en construcción |
| En pruebas | Terminado y en validación antes de entregar |
| En espera | Detenido a la espera de un tercero o de información del área |
| Entregado | Entregado al área, pendiente de confirmación |
| Cerrado | Confirmado y cerrado |
| Cancelado | No continúa |

La mesa no permite saltos que dejarían el historial sin sentido (por ejemplo,
de *Nuevo* directo a *Cerrado*). Un ticket cerrado o cancelado se puede reabrir
volviéndolo a *En análisis*.

**Estado** responde "en qué punto va"; **etapa del proceso** lo dice en
palabras concretas ("Validando el reporte con Contabilidad"); **qué falta**
nombra la actividad pendiente y de quién depende. Los tres juntos evitan la
pregunta "¿cómo va lo mío?".

## Prioridades y acuerdos de tiempo

| Nivel | Criterio |
| --- | --- |
| Alta | Operación detenida o riesgo directo en despachos y cierres |
| Media | Mejora necesaria que no bloquea la operación diaria |
| Baja | Optimización o desarrollo planificado sin urgencia |

El área propone la prioridad al registrar; Datos y TI puede ajustarla y el
cambio queda en el historial.

Los tiempos objetivo se configuran en **Administración → Acuerdos de tiempo**.
Mientras un nivel no esté marcado como *Acordado*, la mesa muestra **"Por
acordar"** y no compromete fechas automáticas — tal como quedó en la propuesta.
Una vez pactados, al registrar un requerimiento la mesa calcula la fecha
estimada de cierre en **jornada hábil** (lunes a viernes, 8:00 a 17:00 por
omisión, configurable en `.env`): un requerimiento registrado el viernes a las
16:00 con un acuerdo de 4 horas vence el lunes a las 11:00, no el sábado.

El responsable puede mover esa fecha cuando la realidad cambia. Cada
movimiento le llega por correo al solicitante: el compromiso es visible y su
cambio también.

## Ciclo de un requerimiento

1. **El área registra**: asunto, descripción, categoría y prioridad. Recibe un
   código (`MA-2026-0001`) y un correo de acuse. El equipo recibe el aviso.
2. **Datos y TI lo toma**: asigna responsable, pone estado y etapa, y — si hay
   acuerdo de tiempo — confirma la fecha estimada de cierre.
3. **Avanza**: cada cambio de estado, etapa, pendiente o fecha queda en el
   historial y le avisa al área lo que le corresponde saber.
4. **Se entrega**: el ticket pasa a *Entregado* y el área recibe el aviso.
5. **El área confirma**: al confirmar la entrega, el ticket queda *Cerrado*. Si
   algo no quedó bien, lo escribe como comentario en vez de confirmar.

## Correos que envía la mesa

| Cuándo | A quién |
| --- | --- |
| Se registra un requerimiento | Al equipo de Datos y TI, y acuse al solicitante |
| Cambia el estado | Al solicitante |
| Se asigna responsable | A quien queda responsable |
| Cambia la fecha estimada de cierre | Al solicitante |
| Hay un comentario público | A la contraparte (área ↔ responsable) |

Las notas internas no generan correo al área.

## Recomendaciones para que la mesa funcione

- **Un canal, sin excepciones.** Lo que llega por chat o pasillo se registra
  igual; si no está en la mesa, no existe para el seguimiento.
- **Etapa y pendiente al día.** Es lo que evita la pregunta "¿cómo va lo mío?".
  Un ticket con estado correcto pero etapa vieja no sirve de nada.
- **Las iniciativas internas también se cargan.** Si no están, la carga del
  área se ve más liviana de lo que es y priorizar se vuelve injusto.
- **La fecha se mueve, pero se comunica.** Mover la fecha estimada con una nota
  cuesta menos que una fecha incumplida en silencio.
