# Ricotera

Landing page interactiva para explorar la discografía de **Indio Solari** y **Patricio Rey y sus Redonditos de Ricota** usando la API de Spotify.

## Flujo de uso

1. **Discografía** — se listan todos los álbumes de ambos artistas
2. **Canciones** — al hacer clic en un álbum se muestran sus pistas
3. **Detalle** — al hacer clic en una canción se muestra info completa con popularidad

## Requisitos

- Node.js 18+
- npm 9+
- Credenciales de [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

## Configuración

1. Copiá el archivo de variables de entorno y completá tus credenciales:

```bash
cp .env.example .env
```

Editá `.env`:

```
SPOTIFY_CLIENT_ID=tu_client_id
SPOTIFY_CLIENT_SECRET=tu_client_secret
```

2. Instalá las dependencias:

```bash
make install
```

## Ejecutar en desarrollo

```bash
make dev
```

Abrí **http://localhost:5173** en tu navegador.

## Comandos disponibles

| Comando        | Descripción                          |
|----------------|--------------------------------------|
| `make install` | Instala las dependencias             |
| `make dev`     | Inicia el servidor de desarrollo     |
| `make build`   | Compila el proyecto                  |
| `make clean`   | Elimina `dist/` y `node_modules/`    |

## Arquitectura

```
misa-ricotera/
├── src/
│   ├── api.ts              # Cliente HTTP del frontend
│   ├── App.tsx             # Orquestador: estado y pasos
│   └── components/
│       ├── AlbumGrid.tsx   # Paso 1: grilla de álbumes
│       ├── TrackList.tsx   # Paso 2: lista de canciones
│       └── TrackDetail.tsx # Paso 3: detalle de canción
├── vite.config.ts          # Config de Vite + plugin que maneja /api/*
├── index.html
├── .env                    # Credenciales (no committear)
├── .env.example
├── Makefile
└── README.md
```

## API

Las rutas `/api/*` las maneja el plugin de Vite (no hay backend separado):

| Método | Endpoint                       | Descripción                                  |
|--------|--------------------------------|----------------------------------------------|
| GET    | `/api/albums`                  | Todos los álbumes de ambos artistas          |
| GET    | `/api/albums/:albumId/tracks`  | Canciones de un álbum                        |
| GET    | `/api/tracks/:trackId`         | Info completa + popularidad de una canción   |

El primer request a `/api/albums` puede tardar unos segundos. Los resultados se cachean 10 minutos en memoria.
