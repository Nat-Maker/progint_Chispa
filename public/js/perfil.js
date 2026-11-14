const mensaje = document.getElementById("mensaje");

function mostrarVista(logueado) {
  document.getElementById("vistaAuth").hidden = logueado;
  document.getElementById("vistaPerfil").hidden = !logueado;
}

async function enviar(url, datos) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  const respuesta = await response.json();
  return { ok: response.ok, respuesta };
}

document
  .getElementById("formRegistro")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const { ok, respuesta } = await enviar("/api/auth/registro", {
        nombre: document.getElementById("regNombre").value,
        correo: document.getElementById("regCorreo").value,
        contra: document.getElementById("regContra").value,
      });
      mensaje.textContent = ok ? respuesta.message : respuesta.error;
    } catch (error) {
      console.error(error);
      mensaje.textContent = "No se pudo conectar con el servidor";
    }
  });

document.getElementById("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const { ok, respuesta } = await enviar("/api/auth/login", {
      correo: document.getElementById("logCorreo").value,
      contra: document.getElementById("logContra").value,
    });
    mensaje.textContent = ok ? respuesta.message : respuesta.error;
  } catch (error) {
    console.error(error);
    mensaje.textContent = "No se pudo conectar con el servidor";
  }
});

async function cargarRetos() {
  const contenedor = document.getElementById("misRetos");
  contenedor.replaceChildren();

  try {
    const response = await fetch("/api/retos");

    if (response.status === 401) {
      mostrarVista(false);
      return;
    }

    mostrarVista(true);
    const retos = await response.json();

    if (retos.length === 0) {
      contenedor.textContent = "Todavía no has guardado retos.";
      return;
    }

    for (const reto of retos) {
      const tarjeta = document.createElement("div");

      const titulo = document.createElement("h3");
      titulo.textContent = reto.titulo + " (" + reto.categoria + ")";
      tarjeta.appendChild(titulo);

      const info = document.createElement("p");
      info.textContent =
        reto.estado +
        " · hasta " +
        new Date(reto.fechaFinal).toLocaleDateString();
      tarjeta.appendChild(info);

      for (const el of reto.elementos) {
        const linea = document.createElement("p");
        linea.textContent =
          el.tipoElemento + ": " + el.contSelect + (el.block ? " 🔒" : "");
        tarjeta.appendChild(linea);
      }

      contenedor.appendChild(tarjeta);
    }
  } catch (error) {
    console.error(error);
    contenedor.textContent = "No se pudieron cargar los retos.";
  }
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  document.getElementById("misRetos").replaceChildren();
  document.getElementById("mensaje").textContent = "Sesión cerrada";
  mostrarVista(false);
});

cargarRetos();
