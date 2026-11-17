# ServiGest Ecuador

## Descripción del producto y alcance del MVP --- P0

**Versión:** 1.0\
**Estado:** Borrador de definición funcional\
**Tipo de producto:** Plataforma web para servicios tecnológicos
gestionados y consultoría tecnológica

------------------------------------------------------------------------

## 1. Resumen ejecutivo

ServiGest Ecuador es una propuesta de empresa de servicios tecnológicos
gestionados (*Managed Services*) y consultoría tecnológica, orientada
inicialmente a pequeñas y medianas empresas que necesitan soporte,
mantenimiento y acompañamiento tecnológico, pero que no cuentan con un
departamento interno de TI o no pueden sostener un equipo técnico
permanente.

El producto digital estará compuesto por dos áreas conectadas:

1.  **Sitio web público:** presenta la empresa, sus servicios y
    modalidades de contratación. Permite que cualquier organización
    solicite asistencia o una evaluación inicial sin tener que contratar
    previamente una suscripción.
2.  **Plataforma de gestión:** centraliza la administración de clientes,
    solicitudes, asignaciones, técnicos e intervenciones. Incluye un
    portal para que los clientes registrados puedan crear y consultar
    sus solicitudes.

El modelo comercial combina:

-   **Suscripciones:** relación recurrente de soporte y mantenimiento
    con alcance y condiciones definidos.
-   **Servicios bajo demanda:** intervenciones puntuales para
    organizaciones que no tienen una suscripción.
-   **Consultoría y proyectos:** diagnósticos, mejoras, automatizaciones
    y trabajos especializados cotizados por separado.
-   **Alianzas estratégicas:** colaboración con especialistas o
    proveedores externos para ampliar la capacidad de servicio.

La plataforma no es el producto principal que se vende al cliente: es la
herramienta que permite operar, coordinar y dar trazabilidad a los
servicios de la empresa.

## 2. Problema y oportunidad

Las organizaciones pueden depender de sus equipos, redes, sistemas y
procesos tecnológicos sin contar con personal especializado que atienda
sus necesidades de forma continua.

Cuando el soporte se gestiona mediante llamadas, correos y mensajería
dispersa, pueden aparecer problemas como:

-   Solicitudes duplicadas o extraviadas.
-   Falta de visibilidad sobre el estado de una atención.
-   Dificultad para asignar técnicos según especialidad y
    disponibilidad.
-   Escaso registro de las intervenciones realizadas.
-   Ausencia de indicadores para evaluar tiempos de atención y carga de
    trabajo.
-   Mantenimiento reactivo, en lugar de preventivo.

ServiGest busca centralizar esta operación y ofrecer a las empresas
acceso a capacidades técnicas sin que necesariamente tengan que
contratar personal de planta.

## 3. Propuesta de valor

**Acceso a soporte, mantenimiento y capacidades de ingeniería sin tener
que construir un departamento tecnológico interno.**

La propuesta se concreta en tres líneas de servicio:

  -----------------------------------------------------------------------
  Línea                   Descripción             Modalidad comercial
  ----------------------- ----------------------- -----------------------
  Soporte técnico         Diagnóstico y           Por intervención o
                          resolución de           suscripción.
                          incidencias técnicas.   

  Mantenimiento y         Inspecciones y          Principalmente
  prevención              actividades             suscripción.
                          planificadas para       
                          reducir fallos.         

  Consultoría y           Evaluación de           Proyecto o
  optimización            infraestructura,        acompañamiento
                          procesos y              recurrente.
                          oportunidades de        
                          mejora.                 
  -----------------------------------------------------------------------

El alcance inicial debe enfocarse en servicios tecnológicos que la
empresa pueda prestar y coordinar de manera realista. La atención de
maquinaria industrial u otras disciplinas especializadas no se asumirá
como parte del catálogo inicial sin contar con personal o aliados
capacitados.

## 4. Modelo de atención y contratación

La plataforma debe admitir dos tipos de relación con el cliente:

### 4.1. Cliente ocasional o sin suscripción

Una organización puede solicitar asistencia desde el sitio público sin
crear una cuenta ni contratar un plan.

Flujo general:

1.  El visitante consulta los servicios disponibles.
2.  Completa un formulario de requerimiento.
3.  El sistema registra la solicitud comercial y genera un código de
    seguimiento.
4.  El equipo de ServiGest revisa la necesidad y contacta al
    solicitante.
5.  Se solicita información adicional o se prepara una cotización.
6.  El cliente acepta o rechaza la propuesta.
7.  Si acepta, el requerimiento se convierte en una orden o solicitud de
    servicio autorizada.
8.  Se coordina y ejecuta la intervención.
9.  Se documenta el resultado y se cierra el servicio.

El envío del formulario no implica aceptación automática del trabajo,
compromiso de resolución ni autorización para iniciar una intervención.
La prestación queda sujeta a evaluación, cotización y aceptación cuando
corresponda.

### 4.2. Cliente con contrato o suscripción

Una organización registrada puede acceder a un portal privado para crear
solicitudes y consultar sus servicios.

Al registrar una solicitud, el sistema puede consultar:

-   Contratos activos de la organización.
-   Vigencia del contrato.
-   Servicios incluidos.
-   Sedes o activos cubiertos, si están definidos.
-   Condiciones y niveles de atención aplicables.

Si la solicitud está cubierta, se procesa conforme al contrato. Si está
fuera de cobertura, puede derivarse a evaluación y cotización como
servicio adicional.

La existencia de una suscripción no significa que cualquier trabajo esté
incluido. La cobertura y los límites deben estar definidos
contractualmente.

## 5. Usuarios y actores

  -----------------------------------------------------------------------
  Actor                               Descripción y responsabilidades
  ----------------------------------- -----------------------------------
  Visitante                           Consulta información pública y
                                      envía solicitudes comerciales.

  Cliente                             Usuario autenticado que pertenece a
                                      una organización y registra o
                                      consulta solicitudes.

  Técnico                             Atiende trabajos asignados y
                                      documenta intervenciones.

  Coordinador                         Revisa solicitudes, coordina la
                                      operación, asigna técnicos y
                                      supervisa las atenciones (posiblementa automatizable).

  Administrador                       Gestiona usuarios, catálogos,
                                      clientes y parámetros generales de
                                      la plataforma.

  Gerencia                            Consulta indicadores operativos y
                                      reportes para supervisar el
                                      servicio.
  -----------------------------------------------------------------------

Para el P0, Gerencia puede utilizar permisos de consulta del rol
Administrador o Coordinador, si no se implementa un rol independiente.

Una organización puede tener varios usuarios. Para la primera versión,
los usuarios con rol Cliente pueden compartir permisos básicos dentro de
su organización. Los permisos granulares por cargo se consideran una
ampliación futura.

------------------------------------------------------------------------

# 6. Alcance del MVP

El MVP se divide en dos niveles de prioridad:

-   **P0 --- Núcleo funcional:** funcionalidades necesarias para
    demostrar el flujo principal del producto y operar el ciclo básico
    de atención.
-   **P1 --- Ampliación funcional:** capacidades comerciales y
    preventivas que completan la visión de servicios gestionados, pero
    que pueden desarrollarse después del núcleo.

Este documento desarrolla P0. P1 se mantiene como referencia de
evolución y no debe confundirse con un requisito ya implementado.

## 7. P0 --- Funcionalidades incluidas

### 7.1. Sitio web público

**Objetivo:** presentar la oferta de ServiGest y permitir que una
organización solicite asistencia sin una suscripción previa.

Páginas y secciones:

  -----------------------------------------------------------------------
  Página o sección                    Contenido / comportamiento
  ----------------------------------- -----------------------------------
  Inicio                              Propuesta de valor, resumen de
                                      servicios y llamadas a la acción.

  Servicios                           Categorías y descripciones de los
                                      servicios ofrecidos.

  Planes                              Presentación informativa de
                                      modalidades de contratación.

  Solicitar asistencia                Formulario público de requerimiento
                                      comercial.

  Contacto                            Canales de contacto y datos
                                      generales de la empresa.

  Iniciar sesión                      Acceso al portal privado.
  -----------------------------------------------------------------------

Llamadas a la acción principales:

-   **Solicitar asistencia:** dirige al formulario público.
-   **Conocer los planes:** presenta las modalidades de contratación o
    permite solicitar una cotización.

Para el P0, los planes se muestran de manera informativa. No se
implementan contratación automática, cobros ni renovación en línea.

### 7.2. Formulario público de requerimiento

**Objetivo:** captar solicitudes de potenciales clientes y registrar la
información necesaria para una primera evaluación.

Campos propuestos:

  ------------------------------------------------------------------------
  Campo                                  Obligatorio Descripción
  --------------------- ---------------------------- ---------------------
  Nombre de la                                    Sí Empresa o entidad
  organización                                       solicitante.

  Nombre del contacto                             Sí Persona responsable
                                                     del requerimiento.

  Correo electrónico                              Sí Medio principal de
                                                     respuesta.

  Teléfono                                        Sí Medio alternativo de
                                                     contacto.

  Categoría del                                   Sí Tipo de necesidad o
  servicio                                           servicio requerido.

  Descripción                                     Sí Problema, contexto o
                                                     resultado esperado.

  Ubicación                              Condicional Dirección o sector si
                                                     se requiere atención
                                                     presencial.

  Adjuntos                                        No Fotografías o
                                                     documentos
                                                     relevantes, sujetos a
                                                     límites de formato y
                                                     tamaño.
  ------------------------------------------------------------------------

La urgencia indicada por el visitante es información inicial y no
determina por sí sola la prioridad operativa. El coordinador podrá
revisarla.

**Comportamiento al enviar:**

1.  Validar los campos en el cliente y en el servidor.
2.  Registrar el requerimiento con estado `RECIBIDA`.
3.  Generar un identificador público no predecible o un token seguro de
    seguimiento.
4.  Mostrar una confirmación con el código de referencia.
5.  Enviar una confirmación por correo si el servicio de correo está
    configurado.
6.  Hacer visible el requerimiento en la bandeja de revisión
    administrativa.

El formulario público no debe permitir crear usuarios, contratos ni
solicitudes operativas directamente.

### 7.3. Autenticación y autorización

**Objetivo:** proteger las funciones privadas y limitar el acceso según
el rol y la organización del usuario.

Funciones P0:

-   Inicio de sesión.
-   Cierre de sesión.
-   Gestión de contraseñas mediante hash seguro.
-   Rutas privadas en el frontend.
-   Autorización aplicada en el backend para cada operación protegida.
-   Asociación del usuario Cliente con una organización.
-   Restricción de acceso a los datos de otras organizaciones.

Roles P0:

  -----------------------------------------------------------------------
  Rol                                 Acceso principal
  ----------------------------------- -----------------------------------
  Administrador                       Gestión general y configuración.

  Coordinador                         Requerimientos, solicitudes,
                                      clientes, técnicos y asignaciones.

  Técnico                             Solicitudes asignadas y registro de
                                      intervenciones.

  Cliente                             Solicitudes e información de su
                                      propia organización.
  -----------------------------------------------------------------------

La protección no debe depender únicamente de ocultar opciones en React.
El backend debe validar la identidad, el rol, la pertenencia a la
organización y la autorización sobre cada recurso.

### 7.4. Gestión de solicitudes

**Objetivo:** permitir que el equipo administrativo evalúe las
solicitudes que ingresan desde el sitio público.

Funciones:

-   Listar requerimientos recibidos.
-   Consultar su información y adjuntos.
-   Filtrar por estado, categoría y fecha.
-   Asignar un responsable comercial o coordinador.
-   Registrar observaciones internas.
-   Solicitar información adicional.
-   Registrar el resultado de la evaluación.
-   Marcar el requerimiento como aprobado (evaluar pago o suscripcion), aceptado, rechazado o
    cancelado.
-   Convertir un requerimiento aceptado en una solicitud de servicio.

Estados sugeridos:

`RECIBIDA → EN_REVISION → REQUIERE_INFORMACION → APROBADA → ACEPTADA`


Las transiciones deben validarse en el backend y quedar registradas en
el historial. El usuario público no puede modificar el estado
administrativo.


Sin pagos aun en P0
### 7.6. Gestión de solicitudes de servicio

**Objetivo:** administrar el ciclo de vida de los trabajos técnicos
autorizados.

Información principal:

-   Código único.
-   Organización solicitante.
-   Usuario que registra la solicitud.
-   Categoría del servicio.
-   Descripción.
-   Prioridad.
-   Ubicación o sede.
-   Activo afectado, si aplica.
-   Modalidad de atención.
-   Fecha de creación.
-   Responsable o técnico asignado.
-   Estado actual.
-   Fecha objetivo o plazo de atención, si aplica.
-   Historial de cambios.

Estados operativos:

`REGISTRADA → APROBADA → ASIGNADA → EN_PROCESO → RESUELTA → CERRADA`

Estados adicionales:

-   `PENDIENTE_INFORMACION`
-   `CANCELADA`

Reglas principales:

-   No se puede cerrar una solicitud sin una resolución documentada.
-   Solo usuarios autorizados pueden modificar una solicitud.
-   Un cliente solo puede consultar solicitudes de su organización.
-   Una solicitud cerrada no puede retroceder de estado sin una
    reapertura autorizada y auditada.
-   Las transiciones deben validar el estado actual y la coherencia del
    proceso.
-   Toda transición debe registrar usuario, fecha, estado anterior y
    estado nuevo.

La prioridad puede manejarse inicialmente con niveles como baja, media,
alta y crítica. Los plazos asociados deben ser definidos explícitamente
por la operación; no se deben asumir tiempos de resolución garantizados.

### 7.7. Gestión de técnicos y especialidades

**Objetivo:** mantener la información necesaria para asignar trabajos de
acuerdo con las capacidades del personal.

Funciones:

-   Registrar y actualizar técnicos.
-   Asociar especialidades.
-   Consultar técnicos activos.
-   Consultar solicitudes asignadas.
-   Visualizar carga de trabajo básica.
-   Registrar disponibilidad operativa básica.

La asignación debe validar, como mínimo:

-   Que el técnico esté activo.
-   Que tenga la especialidad requerida, cuando corresponda.
-   Que no exista una restricción de disponibilidad registrada.
-   Que la carga de trabajo respete las reglas definidas.

No se requiere para P0 un optimizador automático de asignaciones. El
coordinador puede seleccionar al técnico y el backend validar las
restricciones.

### 7.8. Asignación y seguimiento

**Objetivo:** coordinar la atención y permitir que los actores conozcan
el estado de cada trabajo.

Funciones del coordinador:

-   Consultar solicitudes pendientes de asignación.
-   Filtrar por prioridad, categoría y estado.
-   Consultar técnicos y especialidades.
-   Asignar y reasignar técnicos.
-   Registrar el motivo de una reasignación.
-   Supervisar el progreso.

Funciones del técnico:

-   Consultar sus solicitudes asignadas.
-   Consultar detalles y datos de contacto necesarios.
-   Iniciar la atención.
-   Registrar observaciones.
-   Documentar actividades realizadas.
-   Adjuntar evidencias cuando corresponda.
-   Registrar la resolución.
-   Marcar la solicitud como resuelta.

Funciones del cliente:

-   Registrar solicitudes.
-   Consultar solicitudes de su organización.
-   Consultar el estado y las fechas relevantes.
-   Consultar la información de resolución que se haya habilitado para
    el cliente.

### 7.9. Registro de intervenciones

**Objetivo:** conservar evidencia del trabajo realizado y separar la
ejecución técnica del estado general de la solicitud.

Cada intervención puede registrar:

-   Solicitud asociada.
-   Técnico responsable.
-   Fecha y hora de inicio.
-   Fecha y hora de finalización.
-   Actividades realizadas.
-   Diagnóstico.
-   Resultado o resolución.
-   Observaciones.
-   Evidencias adjuntas, si aplica.

Una solicitud puede tener más de una intervención, por ejemplo, si
requiere diagnóstico remoto y posteriormente una visita presencial.

Para P0, el registro de horas puede ser informativo. El cálculo de
costos, consumo de bolsas de horas y facturación se deja para una
versión posterior.

### 7.10. Historial y auditoría

**Objetivo:** asegurar trazabilidad de los cambios importantes.

Registrar al menos:

-   Creación de solicitudes.
-   Cambios de estado.
-   Asignaciones y reasignaciones.
-   Usuario responsable de cada cambio.
-   Fecha y hora.
-   Motivo u observación cuando corresponda.
-   Registro de resolución y cierre.

El historial de auditoría debe ser de solo lectura para los usuarios
ordinarios. No debe depender de que el frontend envíe los datos de
auditoría: el backend debe generarlos.

### 7.11. Dashboard operativo

**Objetivo:** proporcionar una visión resumida de la operación.

Indicadores P0:

-   Total de solicitudes por estado.
-   Solicitudes por prioridad.
-   Solicitudes pendientes de asignación.
-   Solicitudes próximas a vencer, si se han definido plazos.
-   Carga de trabajo por técnico.
-   Tiempo promedio de resolución.
-   Evolución de solicitudes por período.

Los indicadores deben calcularse a partir de información persistida. No
deben ser cifras estáticas o simuladas.

Los datos visibles deben respetar el rol del usuario. El cliente solo
debe consultar indicadores e información de su propia organización; los
indicadores globales corresponden a perfiles internos autorizados.

### 7.12. Notificaciones y actualización dinámica

**Objetivo:** informar a los actores cuando ocurren eventos relevantes.

Eventos P0:

-   Recepción de un requerimiento público.
-   Registro de una solicitud.
-   Asignación o reasignación de técnico.
-   Cambio de estado.
-   Solicitud de información adicional.
-   Resolución o cierre.

Canales:

-   Notificaciones dentro de la plataforma.
-   Correo electrónico para confirmaciones y eventos principales, si la
    infraestructura está disponible.
-   Actualización dinámica de al menos una vista mediante WebSocket o
    Server-Sent Events, de acuerdo con el requisito académico.

Las notificaciones no reemplazan el historial: el historial conserva la
trazabilidad y la notificación comunica el evento.

------------------------------------------------------------------------

# 8. Fuera del alcance P0

Las siguientes funcionalidades no forman parte del núcleo inicial:

-   Contratación y pago automático de suscripciones.
-   Pasarela de pagos.
-   Facturación electrónica.
-   Renovación automática de contratos.
-   Firma electrónica.
-   Cotizador automático complejo.
-   Aplicación móvil nativa.
-   Geolocalización y optimización de rutas.
-   Inventario avanzado y compras de repuestos.
-   Mantenimiento predictivo basado en sensores o IA.
-   Automatización avanzada de procesos.
-   Integraciones con sistemas ERP o CRM externos.
-   Gestión avanzada de proveedores y aliados.
-   Portal de autoservicio con permisos configurables por cargo.

------------------------------------------------------------------------

# 11. Reglas de negocio generales

1.  No se puede cerrar una solicitud sin una resolución documentada.
2.  Un técnico solo puede modificar solicitudes autorizadas y asignadas
    a su cargo.
3.  Un cliente solo puede consultar registros pertenecientes a su
    organización.
4.  Una solicitud cerrada no puede retroceder de estado sin una
    reapertura autorizada y auditada.
5.  La asignación debe validar especialidad, disponibilidad y
    restricciones de carga.
6.  Los plazos de atención se calculan en el backend mediante reglas
    explícitas.
7.  Todas las transiciones de estado generan auditoría con usuario,
    fecha y cambio.
8.  Las actualizaciones validan existencia, estado y coherencia
    transaccional.
9.  Un requerimiento público no equivale a una orden de trabajo
    autorizada.
10. La conversión de requerimiento a solicitud debe conservar la
    trazabilidad del origen.
11. La prioridad declarada por un visitante puede ser revisada por el
    coordinador.
12. La información de una organización no debe ser visible para usuarios
    de otra organización.
13. Las notificaciones no sustituyen el registro persistente de eventos
    e historial.
14. La resolución técnica debe quedar documentada antes del cierre.

# 12. Criterios de aceptación generales del P0

El P0 se considerará funcional cuando:

-   El sitio público permita consultar la oferta y enviar
    requerimientos.
-   Un visitante pueda enviar un requerimiento sin crear una cuenta.
-   El requerimiento aparezca en la plataforma administrativa.
-   El equipo interno pueda revisar y gestionar el requerimiento.
-   Un requerimiento aceptado pueda convertirse en solicitud operativa.
-   Un cliente autenticado pueda registrar y consultar solicitudes de su
    organización.
-   Los usuarios internos puedan administrar clientes y técnicos.
-   El coordinador pueda asignar y reasignar técnicos respetando las
    reglas.
-   El técnico pueda documentar una intervención y su resolución.
-   El cierre exija una resolución documentada.
-   Los cambios relevantes queden auditados.
-   Exista al menos una actualización dinámica sin recarga manual.
-   El dashboard presente indicadores calculados desde datos
    persistidos.
-   Se ejecuten pruebas unitarias de reglas críticas, pruebas de
    integración y los flujos funcionales principales.
-   La aplicación esté desplegada y documentada para su demostración.

# 13. Consideraciones técnicas iniciales

Estas decisiones son una orientación de implementación, no una
especificación cerrada.

  -----------------------------------------------------------------------
  Capa                                Propuesta
  ----------------------------------- -----------------------------------
  Frontend                            React

  Backend                             Node.js con Express o NestJS

  API                                 REST con JSON

  Base de datos                       PostgreSQL

  Actualización dinámica              WebSocket o Server-Sent Events

  Autenticación                       Sesión segura o tokens, con
                                      estrategia definida por el equipo

  Documentación API                   OpenAPI / Swagger

  Pruebas                             Unitarias, integración y flujos
                                      funcionales

  Control de versiones                Git con ramas y revisión de cambios

  Despliegue                          Entornos separados y configuración
                                      por ambiente
  -----------------------------------------------------------------------
