# Álbum de Fotos API con NestJS y PostgreSQL

API REST para gestionar fotos y álbumes, con persistencia en PostgreSQL mediante TypeORM, validación de entradas con DTOs y manejo de errores de base de datos. El proyecto está organizado en módulos, controladores, servicios y entidades, y todas las rutas comienzan con `/api`.

## Novedades

- CRUD de álbumes con nombre único y consulta de sus fotos.
- DTOs para crear, actualizar y filtrar fotos, con validación global y mensajes en español.
- Creación y edición de fotos mediante `albumId` y etiquetas como texto, normalizadas y sin duplicados.
- Actualización parcial con `PartialType`: los campos omitidos conservan su valor y las etiquetas enviadas reemplazan las asociaciones anteriores.
- Filtro de errores de PostgreSQL: duplicados responden `409` y referencias inexistentes responden `400`.
- Pruebas de integración para validar el CRUD, las relaciones, las transacciones y las consultas de las versiones anteriores.

Se conservan las relaciones de álbumes y etiquetas, los filtros por calificación, título y etiqueta, la paginación y el orden por calificación. Al eliminar un álbum, sus fotos permanecen con la relación en `null`.

## Versiones del proyecto

El proyecto se ha desarrollado en tres entregas, cada una con su documento de pruebas. Este README describe la tercera versión, que amplía las anteriores.

| Versión | Funcionalidad | Documento de pruebas |
| --- | --- | --- |
| 1. Backend inicial | API de fotos con NestJS, operaciones CRUD y persistencia en PostgreSQL | [Pruebas del backend](Pruebas%20-%20Taller_NestJS-Backend.pdf) |
| 2. Relaciones | Álbumes y etiquetas, relaciones 1:N y N:M, filtros, paginación y orden del listado de fotos | [Pruebas de relaciones](Pruebas%20-%20Taller_NestJS-Backend-Relaciones.pdf) |
| 3. CRUD, validación y errores | DTOs, validación global, fotos con álbum y etiquetas, manejo de errores de PostgreSQL y CRUD de álbumes con nombre único | [Pruebas de CRUD, validación y errores](Pruebas%20-%20Taller_NestJS-Backend-CRUD.pdf) |

## Tecnologías

- Node.js, NestJS 12 y TypeScript 6.
- PostgreSQL, TypeORM y el controlador `pg`.
- class-validator, class-transformer y @nestjs/mapped-types para validar los DTOs.
- ES Modules: las importaciones relativas utilizan la extensión `.js`.
- Vitest y Supertest para pruebas; Oxlint y Prettier para revisión y formato.

## Estructura

```text
backend/
├── src/
│   ├── albumes/
│   │   ├── dto/                  # CreateAlbumDto y UpdateAlbumDto
│   │   ├── entities/album.entity.ts
│   │   ├── albumes.controller.ts
│   │   ├── albumes.service.ts
│   │   └── albumes.module.ts
│   ├── fotos/
│   │   ├── dto/                  # CreateFotoDto, UpdateFotoDto y QueryFotosDto
│   │   ├── entities/
│   │   │   ├── foto.entity.ts
│   │   │   └── etiqueta.entity.ts
│   │   ├── fotos.controller.ts
│   │   ├── fotos.service.ts
│   │   └── fotos.module.ts
│   ├── common/typeorm-exception.filter.ts
│   ├── configure-app.ts           # Prefijo, validación global y filtro de errores
│   ├── app.controller.ts          # Controlador de ejemplo para la prueba unitaria
│   ├── app.controller.spec.ts
│   ├── app.service.ts
│   ├── app.module.ts              # Conexión a PostgreSQL y módulos de la API
│   ├── main.ts                    # Prefijo /api e inicio del servidor
│   └── seed.ts                    # Reinicio y carga de datos de ejemplo
├── test/app.e2e-spec.ts
├── test/metadata-plugin.ts        # Metadatos de decoradores para Vitest
├── api.http                      # Peticiones para REST Client
├── vitest.config.ts
├── vitest.config.e2e.ts
├── .gitattributes
├── .oxlintrc.json
├── .prettierrc
└── package.json
```

## Modelo de datos

La entidad `Foto` contiene `id`, `titulo`, `descripcion`, `calificacion`, `ruta`, `fotografo`, `creadoEn` y `actualizadoEn`, además de las relaciones `album` y `etiquetas`. La descripción y el fotógrafo son opcionales. La base conserva el valor predeterminado `0` para la calificación, pero el DTO de creación exige enviarla entre `0` y `5`.

### Relaciones

- **Álbum y fotos (1:N):** un `Album` tiene `id`, `nombre` único y la colección `fotos`. Cada foto puede pertenecer a un álbum o tener la relación en `null`. Al eliminar un álbum, sus fotos se conservan y la relación queda en `null`.
- **Fotos y etiquetas (N:M):** una `Etiqueta` tiene `id`, `texto` único y su colección `fotos`. Una foto puede tener varias etiquetas y una etiqueta puede estar asociada a varias fotos. La tabla intermedia `foto_etiquetas` registra estas asociaciones usando las columnas `fotoId` y `etiqueta_id`.

El listado y la consulta individual de fotos cargan el álbum y las etiquetas. La consulta de fotos de un álbum devuelve el objeto del álbum con su colección `fotos`.

## Rutas de la API

| Método | Ruta | Descripción | Respuestas |
| --- | --- | --- | --- |
| `GET` | `/api/fotos` | Lista fotos con filtros y paginación | `200`, `400` |
| `GET` | `/api/fotos/:id` | Consulta una foto con su álbum y etiquetas | `200`, `400`, `404` |
| `POST` | `/api/fotos` | Crea una foto con álbum y etiquetas opcionales | `201`, `400` |
| `PATCH` | `/api/fotos/:id` | Actualiza los campos enviados | `200`, `400`, `404` |
| `DELETE` | `/api/fotos/:id` | Elimina una foto, sin cuerpo de respuesta | `204`, `400`, `404` |
| `GET` | `/api/albumes` | Lista los álbumes ordenados por `id` | `200` |
| `GET` | `/api/albumes/:id` | Consulta un álbum | `200`, `400`, `404` |
| `GET` | `/api/albumes/:id/fotos` | Consulta un álbum con sus fotos | `200`, `400`, `404` |
| `POST` | `/api/albumes` | Crea un álbum con nombre único | `201`, `400`, `409` |
| `PATCH` | `/api/albumes/:id` | Actualiza el nombre de un álbum | `200`, `400`, `404`, `409` |
| `DELETE` | `/api/albumes/:id` | Elimina un álbum y conserva sus fotos, sin cuerpo de respuesta | `204`, `400`, `404` |

Los identificadores de ruta pasan por `ParseIntPipe`: un valor como `abc` devuelve `400`. Si la foto o el álbum solicitado no existe, la API devuelve `404`.

### Validación de los cuerpos

`CreateFotoDto`, `UpdateFotoDto`, `CreateAlbumDto` y `UpdateAlbumDto` definen los datos aceptados. El `ValidationPipe` global transforma las consultas, valida las reglas y rechaza campos desconocidos con `400`. Los mensajes de validación se devuelven como una lista en español.

- Para crear una foto se necesitan `titulo` no vacío de hasta 100 caracteres, `calificacion` numérica entre `0` y `5` y `ruta` con una URL válida `http` o `https`.
- `descripcion` y `fotografo` son opcionales. `albumId` debe ser un entero positivo que corresponda a un álbum existente; se puede omitir o enviar `null` para una foto sin álbum.
- `etiquetas` recibe un arreglo de textos no vacíos de hasta 30 caracteres. Se recortan los espacios, se convierten a minúsculas y se eliminan los duplicados. Las etiquetas existentes se reutilizan y las nuevas se crean.
- En `PATCH`, `PartialType` permite omitir campos sin modificar los valores guardados. Si se envían etiquetas, reemplazan las asociaciones anteriores; `[]` las vacía. `albumId: null` quita el álbum, y `null` permite vaciar la descripción o el fotógrafo. Título, calificación, ruta y etiquetas no aceptan `null`.
- Para un álbum se requiere un nombre no vacío de hasta 80 caracteres. Se recortan sus espacios y la base impide repetirlo, tanto al crear como al editar.

La creación y edición de fotos usan transacciones: un error de referencia revierte también las etiquetas creadas durante esa petición. El filtro de PostgreSQL responde `400` si el álbum no existe y `409` si se repite un nombre de álbum.

### Filtros del listado de fotos

| Parámetro | Valor predeterminado | Comportamiento |
| --- | --- | --- |
| `min` | `0` | Calificación mínima incluida, entre `0` y `5` |
| `max` | `5` | Calificación máxima incluida, entre `0` y `5` |
| `q` | Sin filtro | Busca una coincidencia parcial en el título, sin distinguir mayúsculas y minúsculas |
| `page` | `1` | Página solicitada, entero mayor que cero |
| `limit` | `10` | Cantidad de fotos por página, entero entre `1` y `50` |
| `etiqueta` | Sin filtro | Filtra por el texto exacto de una etiqueta |
| `orden` | Por `id` ascendente | Acepta `asc` o `desc` para ordenar por calificación, con desempate por `id` ascendente |

Los filtros se pueden combinar. Se eliminan los espacios al inicio y al final de `q` y `etiqueta`; si quedan vacíos, no se aplican. Un rango con `min > max`, calificaciones fuera de `0` a `5`, una página menor que uno, un límite fuera de `1` a `50`, un valor numérico inválido, un campo desconocido o un `orden` distinto de `asc` y `desc` devuelve `400`.

Ejemplo:

```text
GET /api/fotos?min=3&max=5&q=Foto&page=1&limit=5&etiqueta=playa&orden=desc
```

El listado ya no devuelve un arreglo directamente. Su estructura es:

```json
{
  "data": [
    {
      "id": 1,
      "titulo": "Foto 1",
      "descripcion": null,
      "calificacion": 4.3,
      "ruta": "https://picsum.photos/id/10/600/400",
      "fotografo": null,
      "creadoEn": "2026-11-25T05:00:00.000Z",
      "actualizadoEn": "2026-11-25T05:00:00.000Z",
      "album": { "id": 1, "nombre": "Viajes" },
      "etiquetas": [{ "id": 1, "texto": "playa" }]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 5
}
```

`total` es la cantidad de fotos que cumplen los filtros antes de aplicar la paginación.

## Ejecución

1. Instalar Node.js, npm y PostgreSQL, y crear la base de datos:

   ```sql
   CREATE DATABASE album;
   ```

2. Revisar la conexión en `src/app.module.ts`. Actualmente usa `localhost`, puerto `5432`, usuario `postgres` y base de datos `album`. Ajustar el usuario y la contraseña según la instalación local. La conexión está definida directamente en ese archivo; no se carga desde `.env`.

3. Instalar las dependencias:

   ```bash
   npm ci
   ```

4. Iniciar el servidor:

   ```bash
   npm run start:dev
   ```

La API queda disponible en `http://localhost:3000/api/fotos` y `http://localhost:3000/api/albumes`. El puerto se puede cambiar mediante `PORT`. La raíz `/` responde `404`.

`autoLoadEntities: true` registra las entidades declaradas por los módulos. `synchronize: true` crea o ajusta las tablas al iniciar: esta configuración es para desarrollo, ya que puede modificar o eliminar datos. Las fotos, álbumes y relaciones se conservan al reiniciar el servidor.

### Datos de ejemplo

```bash
npm run seed
```

El script reinicia las tablas `foto_etiquetas`, `fotos`, `etiquetas` y `albumes`, incluidos sus identificadores. Después crea:

- 3 álbumes: Viajes, Guayaquil y Naturaleza.
- 6 etiquetas: playa, ciudad, noche, cielo, montaña y río.
- 20 fotos con calificación aleatoria entre `0` y `5`, imagen de Picsum, un álbum y una o dos etiquetas distintas.

**Este comando elimina los datos existentes y debe usarse únicamente para reiniciar los datos de prueba.**

## Pruebas

### Peticiones de la sesión 5

Las evidencias de las funciones nuevas están en [Pruebas de CRUD, validación y errores](Pruebas%20-%20Taller_NestJS-Backend-CRUD.pdf). El documento reúne 10 pruebas de terminal y navegador: validación de entradas, creación y edición de fotos con álbum y etiquetas, errores de referencia, nombres de álbum duplicados y conservación de fotos al eliminar un álbum.

El archivo `api.http` permite comprobar las validaciones, la creación y edición de fotos con álbum y etiquetas, los errores de referencia y el CRUD de álbumes con REST Client de VS Code. Las peticiones de creación tienen nombre y sus respuestas proporcionan los identificadores utilizados por las siguientes; se deben ejecutar en orden. También contiene consultas de regresión para los filtros anteriores.

### Consultas desde PowerShell

Con el servidor y PostgreSQL en ejecución:

```powershell
# Listado de fotos con su álbum y sus etiquetas
curl.exe http://localhost:3000/api/fotos

# Filtro por calificación y paginación
curl.exe "http://localhost:3000/api/fotos?min=3&max=5&page=1&limit=3"

# Búsqueda parcial por título
curl.exe "http://localhost:3000/api/fotos?q=Foto%201"

# Filtro por etiqueta y orden por calificación
curl.exe "http://localhost:3000/api/fotos?etiqueta=playa"
curl.exe "http://localhost:3000/api/fotos?orden=asc"
curl.exe "http://localhost:3000/api/fotos?orden=desc"

# Álbumes y sus fotos
curl.exe http://localhost:3000/api/albumes
curl.exe http://localhost:3000/api/albumes/1/fotos

# Combinar filtros, paginación y orden
curl.exe "http://localhost:3000/api/fotos?min=3&max=5&page=1&limit=5&etiqueta=playa&orden=desc"

# Ejemplos de errores 400 y 404
curl.exe -i "http://localhost:3000/api/fotos?min=abc"
curl.exe -i "http://localhost:3000/api/fotos?min=5&max=2"
curl.exe -i http://localhost:3000/api/fotos/abc
curl.exe -i http://localhost:3000/api/fotos/999999
```

El listado de fotos permite comprobar la carga de álbumes y etiquetas, los filtros y la paginación. La consulta `/api/albumes/1/fotos` devuelve el álbum con su colección de fotos. Los valores numéricos inválidos producen un error `400`, y una foto inexistente devuelve `404`.

Los resultados dependen de los datos existentes. El seed asigna calificaciones, álbumes y etiquetas aleatoriamente, por lo que los registros y los totales pueden variar entre cargas.

### Crear, actualizar y eliminar fotos

Con la API en ejecución, se pueden comprobar las operaciones de escritura:

```powershell
# Crear una foto
$foto = @{ titulo = 'Cerro'; calificacion = 4.5; ruta = 'https://picsum.photos/id/200/600/400' } | ConvertTo-Json
$creada = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/fotos -ContentType 'application/json' -Body $foto

# Actualizar y eliminar únicamente la foto que se acaba de crear
Invoke-RestMethod -Method Patch -Uri "http://localhost:3000/api/fotos/$($creada.id)" -ContentType 'application/json' -Body '{"calificacion":2}'
Invoke-RestMethod -Method Delete -Uri "http://localhost:3000/api/fotos/$($creada.id)"
```

### Crear, actualizar y eliminar álbumes

Los álbumes aceptan un nombre único. Este ejemplo crea un álbum de prueba y utiliza el identificador devuelto para editarlo y eliminarlo:

```powershell
$datosAlbum = @{ nombre = 'Recuerdos ' + (Get-Date -Format 'yyyyMMddHHmmss') } | ConvertTo-Json
$album = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/albumes -ContentType 'application/json' -Body $datosAlbum

# Consultar y actualizar el álbum creado
Invoke-RestMethod -Uri "http://localhost:3000/api/albumes/$($album.id)"
$cambioAlbum = @{ nombre = $album.nombre + ' editado' } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "http://localhost:3000/api/albumes/$($album.id)" -ContentType 'application/json' -Body $cambioAlbum

# Eliminar únicamente el álbum de prueba
Invoke-RestMethod -Method Delete -Uri "http://localhost:3000/api/albumes/$($album.id)"
```

Repetir un nombre al crear o editar devuelve `409`. Eliminar un álbum devuelve `204`, conserva sus fotos y deja `album: null` en ellas.

### Pruebas automatizadas

| Comando | Uso |
| --- | --- |
| `npm test` | Ejecuta las pruebas unitarias con Vitest |
| `npm run test:watch` | Ejecuta las pruebas en modo observación |
| `npm run test:cov` | Ejecuta las pruebas con cobertura |
| `npm run test:e2e` | Ejecuta el archivo de pruebas de extremo a extremo |

Las pruebas unitarias comprueban el controlador de ejemplo y el filtro de errores de PostgreSQL. Las pruebas E2E verifican validaciones, CRUD de fotos y álbumes, etiquetas, transacciones y regresiones de filtros, orden y paginación.

Las E2E usan un esquema temporal `sesion5_test_<identificador>` que se elimina al terminar; no usan las tablas de desarrollo. Por defecto se conectan a la misma instalación local de PostgreSQL. Se puede elegir otra conexión con `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD` y `TEST_DB_NAME`. El usuario de pruebas debe poder crear y eliminar su esquema temporal.

## Compilación y formato

| Comando | Uso |
| --- | --- |
| `npm run build` | Compila el proyecto |
| `npm run lint` | Revisa el código con Oxlint y análisis de tipos |
| `npm run format` | Aplica Prettier a `src` y `test` |

## Autor

Proyecto desarrollado como práctica de Node.js, NestJS y PostgreSQL.
