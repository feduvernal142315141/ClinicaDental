# Lint Debt Baseline

Fecha de corte: 2026-03-26
Comando base: `yarn lint`
Fuente: salida capturada en `/tmp/frontclinic-lint.log`

## Resumen global

| Metrica           | Valor |
| ----------------- | ----: |
| Errores           |   114 |
| Warnings          |    59 |
| Total incidencias |   173 |

## Deuda por area

| Area                           | Errores | Warnings | Total | Archivos con incidencias |
| ------------------------------ | ------: | -------: | ----: | -----------------------: |
| app                            |       6 |        0 |     6 |                        2 |
| components/features/odontogram |       6 |       10 |    16 |                        8 |
| components                     |      21 |       30 |    51 |                       30 |
| lib/odontogram                 |       4 |        3 |     7 |                        4 |
| lib                            |      77 |       16 |    93 |                       24 |

## Uso recomendado para detectar regresiones

1. Ejecutar `yarn lint > /tmp/frontclinic-lint.log 2>&1`.
2. Comparar conteos por area con esta linea base.
3. Si sube una area, revisar primero archivos del alcance tocado antes de abordar deuda historica.

## Nota

Esta linea base refleja deuda existente del repositorio en la fecha de corte y sirve como referencia para validar que cambios nuevos no introduzcan regresiones de lint.
