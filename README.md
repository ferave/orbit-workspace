# Orbit Workspace

Cliente de conexiones remotas multiplataforma, inspirado en herramientas profesionales como SecureCRT, con una interfaz moderna y una arquitectura preparada para SSH, SFTP y FTP.

## Ejecutar en desarrollo

```bash
npm install
npm run dev
```

Para abrir la versión de escritorio y validar SSH real:

```bash
npm run desktop
```

## Crear instalador de Windows

El archivo `.github/workflows/build-windows.yml` compila automáticamente el instalador `.msi` y `.exe` en un runner Windows. Después de subir el proyecto a GitHub, se puede iniciar desde **Actions → Build Orbit for Windows → Run workflow** y descargar el artefacto generado.

## Validar producción

```bash
npm run build
npm run preview
```

## Estado actual

Esta primera entrega es el **MVP visual interactivo**. Incluye:

- Panel lateral de conexiones con grupos, favoritos y búsqueda.
- Pestañas para múltiples sesiones.
- Terminal profesional con estado de conexión.
- Barra de comandos rápidos y modo de envío a varias sesiones.
- Formulario para crear conexiones.
- Diseño oscuro responsive para escritorio.
- Base lista para integrar la capa nativa de SSH/SFTP mediante Tauri y Rust.

La versión de escritorio ya incorpora una prueba SSH real mediante `ssh2`: valida host, puerto, usuario, contraseña o clave privada antes de guardar la conexión. El navegador solo muestra el prototipo y no puede abrir conexiones SSH por sus propias restricciones de seguridad.

Las conexiones mostradas actualmente son datos locales de demostración. La siguiente fase conectará las sesiones a SSH real, almacenará perfiles en SQLite y protegerá credenciales usando el llavero del sistema operativo.

## Arquitectura prevista

- **UI:** React + TypeScript + Vite
- **Desktop:** Tauri
- **Servicios nativos:** Rust + SSH/SFTP
- **Terminal:** xterm.js
- **Persistencia:** SQLite
- **Secretos:** Keychain (macOS), Credential Manager (Windows) y Secret Service (Linux)
