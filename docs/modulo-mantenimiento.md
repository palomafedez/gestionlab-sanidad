# Módulo de mantenimiento preventivo – COMPLETADO

## Hojas en Sheets
- **Planes_Mantenimiento** — columnas A-G: `ID_Plan, ID_Equipo, Tipo_Intervencion, Periodicidad, Operacion, Activo, Instrucciones`
- **Registro_Mantenimientos** — columnas A-I: `ID_Registro, ID_Plan, ID_Equipo, Curso_Academico, Periodo, Fecha_Realizacion, Realizado_Por, Supervisado_Por, Observaciones`

## Lógica de periodos (mantenimiento.js)
- Curso académico: Sep–Jun, formato "YYYY-YYYY+1"
- Periodo mensual: "YYYY-MM"
- Trimestral: meses 0, 3, 6, 9 del curso
- Semestral: meses 0, 6 del curso
- Anual: el primer (o último, si `_esMomentoFin`) mes del curso
- **Bianual/Trianual: igual que Anual, pero solo en los cursos que tocan** —
  `_esCursoDebidoMultianual()` mira el último `Curso_Academico` con un registro real en
  `registro_mantenimientos` para ese `ID_Plan` y solo lo da por "debido" si han pasado 2
  (Bianual) o 3 (Trianual) cursos desde entonces. Si el plan nunca se ha registrado como
  realizado, se sigue pidiendo todos los cursos (para no perder el aviso). Aplica tanto a
  `getPeriodosEsperados` (dashboard) como a `getPeriodosCursoCompleto` dentro de
  `exportarModeloCalidad` (el Excel del plan de mantenimiento).
- Pretemporada: "pretemporada-YYYY-YYYY" (si hoy ≥ Mes_Inicio_Temporada)
- Posttemporada: "posttemporada-YYYY-YYYY" (si hoy ≥ Mes_Fin_Temporada)

## Dónde se gestiona cada cosa (centralizado 2026-09-06)

Toda la **configuración** de mantenimiento vive en la sección **Mantenimiento**; la tarjeta
del equipo es solo lectura + ejecutar.

| Cosa | Dónde se hace |
|---|---|
| Alta / edición / borrado de un **plan** | `Mantenimiento → Planes configurados` (botón "+ Plan" con selector de equipo; ✏️/🗑️ por fila). Ya **no** se crean desde la tarjeta del equipo. |
| **Meses de temporada** (`Mes_Inicio_Temporada` / `Mes_Fin_Temporada`) | Dentro del modal del plan, bloque "Temporada del equipo", visible solo si la periodicidad es Pretemporada/Posttemporada. Se **siguen guardando en la tabla `equipos`** (los escribe `gestionar-mantenimiento` en `crear_plan`/`actualizar_plan`); `gestionar-equipo` ya no los toca. Se quitaron del modal de editar equipo. |
| **Responsable / Módulos responsables / Proveedor SAT** | Modal de editar equipo (no se movió: también gobierna permisos de intervenciones). El plan no tiene responsable propio; lo que cuenta es `realizado_por` al registrar. |
| **Protocolo de uso** | Modal de editar equipo (se muestra en la sección de mantenimiento de la tarjeta). |
| **Ejecutar** un mantenimiento (checklist) | Tarjeta del equipo o `Mantenimiento → Pendientes` (mismo modal `modal-registrar-mant`). |
| **Corregir un mantenimiento ya finalizado** | `Mantenimiento → Realizados` (pestaña solo Admin/Gestor) → ✏️ Editar → `modal-registrar-mant` en modo edición (título "✏️ Editar mantenimiento", sin "Guardar progreso"). Acción `editar_registro` en `gestionar-mantenimiento`. |

### Permisos por rol en la sección Mantenimiento
- **Admin/Gestor**: todo (Pendientes, Realizados, Planes configurados, exportar Excel).
- **Profesor**: entra en la sección, pero **todo acotado a los equipos de los que es
  responsable** (`esResponsableDeEquipo`): ve/ejecuta Pendientes de sus equipos y
  crea/edita/borra Planes de sus equipos. **No** ve la pestaña Realizados ni los botones de
  exportar. El servidor (`gestionar-mantenimiento`) revalida: `requireStaff` + el nombre del
  profesor debe estar en `equipos.responsable`.
- **Alumno**: solo Pendientes marcados `Con_Alumnado` y en su período (oct–may), como antes.

## Datos
- 410 planes activos en `planes_mantenimiento` (2026-08-22; el número crece con el tiempo,
  no usar como referencia fija). Distribución de periodicidad: Anual 172, Semestral 78,
  Bianual 72, Mensual 30, Trimestral 25, Posttemporada 22, Pretemporada 9, Trianual 2.
  Los 74 planes Bianual/Trianual son casi todos revisiones/certificaciones externas
  (autoclaves, cabinas de bioseguridad, congeladores, lupas y microscopios por SAT).
- Columna "Supervisado por" se rellena automáticamente con gestores/admins activos.
- Pendiente: actualizar Ubicacion de equipos estacionales (ver pendientes en CLAUDE.md).
