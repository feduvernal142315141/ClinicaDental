# Encuesta Para Especialista: Definicion Funcional Del Modulo De Odontograma

## Objetivo
Definir con el especialista las reglas clinicas y de negocio que aun faltan para cerrar el comportamiento del odontograma, el modal por pieza y el impacto visual de cada dato registrado.

## Contexto Resumido Del Modulo Actual
- La vista principal muestra ambas arcadas con 3 vistas por pieza.
- El modelo actual trabaja con estas superficies: `mesial`, `distal`, `facial`, `lingual` y `oclusal`.
- En dientes anteriores, la UI ya renombra visualmente `facial` como `labial`, `lingual` como `palatino` y `oclusal` como `incisal`, pero el modelo interno sigue guardando `oclusal`.
- El modal de pieza permite registrar: superficies, ICDAS, tipo de caries, actividad, lesiones no cariosas, estado pulpar/periapical, pruebas de vitalidad, evidencia, plan y realizado.
- El odontograma hoy si refleja eventos de `diagnosis`, `plan`, `performed`, `endo`, `ausente` e `implante`.
- Aun faltan reglas de negocio cerradas para varios campos visibles del modal, sobre todo para saber si son obligatorios, si modifican el odontograma y si deben disparar acciones automaticas.

## Preguntas Bloqueantes
1. En incisivos y caninos, la superficie central debe mostrarse y registrarse como `incisal` en lugar de `oclusal`?
Respuesta esperada: confirmar si es solo cambio visual o si debe existir como superficie distinta en el modelo.

2. En dientes anteriores, debe mantenerse la vista central en ambas arcadas o prefieren que solo se muestren superficies labial/lingual y proximales?
Respuesta esperada: confirmar si la vista triple actual es clinicamente correcta para anteriores.

3. Cuando se asigna un ICDAS `5` o `6`, que campos son obligatorios antes de guardar?
Respuesta esperada: indicar si ademas de ICDAS se exige tipo de caries, actividad, notas, pulpar/periapical, evidencia o plan.

4. `Tipo de caries` y `actividad` aplican solo desde ICDAS `3-6` o tambien en ICDAS `1-2`?
Respuesta esperada: definir desde que nivel deben pedirse y si alguna opcion es obligatoria.

5. Las `lesiones no cariosas` son complementarias al ICDAS o pueden existir solas sin caries?
Respuesta esperada: definir si son un diagnostico independiente, un complemento o ambos.

6. Despues de completar el modal de diagnostico, cual debe ser la accion normal del especialista?
Respuesta esperada: `guardar y cerrar`, `guardar e ir al siguiente diente`, `ir a plan`, `ir a realizado` u otra regla.

7. Que bloques del modal deben cambiar visualmente el odontograma y cuales solo deben quedar como registro clinico?
Respuesta esperada: indicar impacto visual esperado para ICDAS, lesiones no cariosas, pulpar/periapical, vitalidad y evidencia.

## Cuestionario Detallado

### 1. Anatomia Y Nomenclatura
8. Para dientes anteriores, que terminologia debe usar la interfaz?
Respuesta esperada: `labial/palatino`, `vestibular/lingual` o regla diferente segun arcada.

9. Si se confirma `incisal` para anteriores, debe usarse solo en la etiqueta o tambien en reportes, historiales y reglas de negocio?
Respuesta esperada: definir alcance del cambio.

10. La caries radicular necesita una zona propia como `cervical` o `radicular`, o debe registrarse sobre las superficies ya existentes?
Respuesta esperada: confirmar si el modelo actual de superficies es suficiente.

11. Existe alguna superficie o zona clinica que hoy no este representada y sea indispensable para el uso real del odontograma?
Respuesta esperada: listar zonas faltantes si aplica.

### 2. Diagnostico Por Superficie
12. Cuando el especialista selecciona una superficie, ICDAS siempre es obligatorio o la superficie puede quedar solo como observacion o seguimiento?
Respuesta esperada: definir regla de guardado minima por superficie.

13. Una misma superficie puede tener mas de un hallazgo activo en la misma visita?
Respuesta esperada: ejemplos como `caries + fractura`, `caries + abrasion` o `desgaste + fisura`.

14. Se pueden marcar varias lesiones no cariosas a la vez en una misma superficie?
Respuesta esperada: confirmar si se admite seleccion multiple y si hay combinaciones no validas.

15. Si una superficie tiene ICDAS `0` pero presenta atricion, abrasion, erosion, hipoplasia, fisura o fractura, como debe verse en el odontograma?
Respuesta esperada: definir color, icono, simbolo o si solo queda en detalle clinico.

16. `Notas breves` son opcionales o obligatorias en algun escenario?
Respuesta esperada: indicar en que diagnosticos o severidades deben exigirse.

17. Es clinicamente correcto aplicar un mismo diagnostico a varias superficies en un solo paso?
Respuesta esperada: confirmar si el flujo `aplicar a todas` es valido y en que casos no lo es.

### 3. Diagnostico A Nivel De Pieza
18. Estado pulpar es obligatorio siempre o solo cuando hay sintomas, caries profunda o sospecha endodontica?
Respuesta esperada: definir cuando debe completarse.

19. Estado periapical es obligatorio siempre o solo cuando hay evidencia clinica o radiografica?
Respuesta esperada: definir cuando debe completarse.

20. Que estados pulpares o periapicales deben disparar una alerta, una prioridad clinica o una sugerencia de tratamiento?
Respuesta esperada: indicar reglas por estado.

21. Seleccionar `pulpitis irreversible` o `necrosis` debe solo guardar el dato, sugerir endodoncia, crear un plan automaticamente o cambiar el estado global del diente a `Endo`?
Respuesta esperada: elegir el comportamiento esperado.

22. El estado periapical debe cambiar el color del diente, crear un evento clinico propio o quedar solo como soporte diagnostico?
Respuesta esperada: definir impacto funcional y visual.

### 4. Vitalidad Y Evidencia
23. Que pruebas minimas se requieren para justificar un diagnostico pulpar o periapical?
Respuesta esperada: indicar si frio, calor, EPT, percusion y palpacion son opcionales o requeridas por caso.

24. Los resultados de las pruebas deben disparar reglas automaticas o solo quedar como soporte clinico?
Respuesta esperada: definir si alguna combinacion debe sugerir o bloquear diagnosticos.

25. El dolor `NRS 0-10` debe afectar urgencia, prioridad o plan sugerido?
Respuesta esperada: confirmar si el dolor cambia conducta del sistema.

26. La evidencia clinica es opcional u obligatoria? En que casos?
Respuesta esperada: definir si fotos, radiografias u otros adjuntos se exigen segun severidad o tipo de caso.

27. La evidencia debe asociarse a la superficie, al diente completo o a la visita?
Respuesta esperada: definir nivel correcto de vinculacion.

### 5. Flujo Clinico
28. Despues de guardar el diagnostico, cual es el siguiente paso mas frecuente en la consulta?
Respuesta esperada: `siguiente diente`, `plan`, `realizado`, `cerrar modal` u otro.

29. El boton `Aplicar y seguir` debe llevar al siguiente diente, a la siguiente superficie o al siguiente paso clinico?
Respuesta esperada: definir el recorrido real del especialista.

30. Las sugerencias de plan deben ser solo sugerencias o deben crear automaticamente procedimientos planificados?
Respuesta esperada: definir si el sistema sugiere o automatiza.

31. Cuando un plan pasa a `realizado`, que datos minimos debe completar el especialista?
Respuesta esperada: definir campos minimos de ejecucion antes de marcar como realizado.

### 6. Reglas Visuales Y Conflictos
32. Si el diente esta `Ausente` o `Implante`, debe bloquearse totalmente la seleccion de superficies y diagnosticos?
Respuesta esperada: confirmar si el bloqueo debe ser total o parcial.

33. Un diente con `Corona` puede tener caries secundaria?
Respuesta esperada: confirmar si el sistema debe permitir `corona + caries` y como debe verse.

34. Que acciones deben cambiar automaticamente el estado global del diente?
Respuesta esperada: definir reglas como `extraccion -> Ausente`, `implante colocado -> Implante`, `endo realizada -> Endo`, `corona instalada -> Corona`.

35. Si hay conflicto entre estados, cual debe tener prioridad visual?
Respuesta esperada: ordenar prioridades como `ausente`, `implante`, `endo`, `caries`, `plan`, `realizado`, `observacion`.

### 7. Historial Y Cierre Minimo
36. Cuando un diagnostico cambia en otra visita, se reemplaza el estado actual o deben convivir estado actual e historial?
Respuesta esperada: definir regla de versionado clinico.

37. Cuales son los campos minimos para considerar un diagnostico como `completo`?
Respuesta esperada: listar obligatorios por tipo de caso.

38. Cuales son los campos minimos para considerar un plan como `completo`?
Respuesta esperada: listar obligatorios por procedimiento.

39. Existen reglas distintas para denticion temporal, edad del paciente o nivel de riesgo de caries que debamos modelar ahora?
Respuesta esperada: indicar si hay variantes clinicas que cambian la captura o la visualizacion.

40. Que errores nunca debe permitir el sistema aunque el usuario intente guardarlos?
Respuesta esperada: listar combinaciones invalidas o clinicamente incoherentes.

## Matriz De Definicion Funcional
Usar esta matriz para registrar la decision final del especialista por cada bloque del modal.

| Bloque | Nivel esperado | Opcional u obligatorio | Debe cambiar el odontograma | Debe disparar alerta o plan | Observaciones |
| --- | --- | --- | --- | --- | --- |
| ICDAS | Superficie |  |  |  |  |
| Tipo de caries | Superficie |  |  |  |  |
| Actividad de caries | Superficie |  |  |  |  |
| Lesiones no cariosas | Superficie |  |  |  |  |
| Estado pulpar | Pieza |  |  |  |  |
| Estado periapical | Pieza |  |  |  |  |
| Pruebas de vitalidad | Pieza |  |  |  |  |
| Dolor NRS | Pieza |  |  |  |  |
| Evidencia clinica | Superficie / Pieza / Visita |  |  |  |  |
| Plan sugerido | Pieza / Superficie |  |  |  |  |
| Realizado | Pieza / Superficie |  |  |  |  |

## Resultado Esperado De La Reunion
- Confirmar la anatomia y nomenclatura correcta para dientes anteriores.
- Definir que campos son obligatorios, opcionales y condicionales.
- Definir que datos solo se guardan y que datos cambian la vista del odontograma.
- Definir que acciones deben disparar sugerencias, planes, alertas o cambios de estado global.
- Cerrar prioridades visuales y reglas de conflicto.
