use serde::Serialize;
use ssh2::Session;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::Path;

#[derive(Serialize)]
struct ConnectionCheck {
  ok: bool,
  message: String,
  latency_ms: u128,
}

#[tauri::command]
async fn test_ssh_connection(
  host: String,
  port: u16,
  username: String,
  password: Option<String>,
  private_key: Option<String>,
  protocol: String,
) -> Result<ConnectionCheck, String> {
  tauri::async_runtime::spawn_blocking(move || {
    let started = std::time::Instant::now();
    let address = format!("{}:{}", host.trim(), port);
    let mut tcp = TcpStream::connect_timeout(
      &address.parse().map_err(|_| "Host o IP no válido".to_string())?,
      std::time::Duration::from_secs(8),
    ).map_err(|error| format!("No se pudo alcanzar el servidor: {error}"))?;
    tcp.set_read_timeout(Some(std::time::Duration::from_secs(8))).ok();
    tcp.set_write_timeout(Some(std::time::Duration::from_secs(8))).ok();

    if protocol.to_uppercase() == "FTP" {
      let mut response = [0_u8; 1024];
      let size = tcp.read(&mut response).map_err(|error| format!("No se recibió respuesta FTP: {error}"))?;
      let greeting = String::from_utf8_lossy(&response[..size]);
      if !greeting.starts_with("220") {
        return Err(format!("El servidor no respondió como FTP: {}", greeting.trim()));
      }
      let secret = password.filter(|value| !value.is_empty()).ok_or_else(|| "FTP requiere una contraseña".to_string())?;
      tcp.write_all(format!("USER {username}\r\n").as_bytes()).map_err(|error| format!("No se pudo enviar usuario FTP: {error}"))?;
      let size = tcp.read(&mut response).map_err(|error| format!("Respuesta FTP inválida: {error}"))?;
      if !String::from_utf8_lossy(&response[..size]).starts_with("331") {
        return Err("El servidor FTP rechazó el usuario".to_string());
      }
      tcp.write_all(format!("PASS {secret}\r\n").as_bytes()).map_err(|error| format!("No se pudo enviar contraseña FTP: {error}"))?;
      let size = tcp.read(&mut response).map_err(|error| format!("Respuesta FTP inválida: {error}"))?;
      let login = String::from_utf8_lossy(&response[..size]);
      if !login.starts_with("230") {
        return Err(format!("Usuario o contraseña FTP incorrectos: {}", login.trim()));
      }
      return Ok(ConnectionCheck { ok: true, message: format!("Conexión FTP validada como {username}@{host}"), latency_ms: started.elapsed().as_millis() });
    }

    let mut session = Session::new().map_err(|error| format!("No se pudo iniciar SSH: {error}"))?;
    session.set_tcp_stream(tcp);
    session.handshake().map_err(|error| format!("Handshake SSH rechazado: {error}"))?;

    if let Some(key_path) = private_key.filter(|key| !key.trim().is_empty()) {
      session.userauth_pubkey_file(&username, None, Path::new(key_path.trim()), None)
        .map_err(|error| format!("Autenticación con clave fallida: {error}"))?;
    } else if let Some(secret) = password.filter(|value| !value.is_empty()) {
      session.userauth_password(&username, &secret)
        .map_err(|error| format!("Usuario o contraseña incorrectos: {error}"))?;
    } else {
      return Err("Indica una contraseña o la ruta de una clave privada".to_string());
    }

    if !session.authenticated() {
      return Err("El servidor no aceptó las credenciales".to_string());
    }

    Ok(ConnectionCheck {
      ok: true,
      message: format!("Conexión SSH validada como {username}@{host}"),
      latency_ms: started.elapsed().as_millis(),
    })
  }).await.map_err(|error| format!("Error interno: {error}"))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![test_ssh_connection])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
