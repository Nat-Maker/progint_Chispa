let retoActual = {};
const bloqueados = new Set();

function pintarReto(reto) {
  const contenedor = document.getElementById("reto");
  contenedor.replaceChildren();

  for (const [tipo, contenido] of Object.entries(reto)) {
    const linea = document.createElement("div");
    linea.className = "linea";

    const etiqueta = document.createElement("span");
    etiqueta.className = "etiqueta";
    etiqueta.textContent = tipo;
    linea.appendChild(etiqueta);

    const valor = document.createElement("div");
    valor.className = "valor";

    if (tipo === "Paleta") {
      valor.classList.add("paleta");
      for (const hex of contenido.split(",")) {
        const color = document.createElement("span");
        color.className = "color";
        color.style.backgroundColor = hex;
        color.title = hex;
        valor.appendChild(color);
      }
    } else {
      valor.textContent = contenido;
    }
    linea.appendChild(valor);

    const bloqueo = document.createElement("label");
    bloqueo.className = "bloqueo";
    bloqueo.title = "Bloquear";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = bloqueados.has(tipo);
    check.addEventListener("change", () => {
      if (check.checked) {
        bloqueados.add(tipo);
      } else {
        bloqueados.delete(tipo);
      }
    });

    bloqueo.append(check);
    linea.appendChild(bloqueo);

    contenedor.appendChild(linea);
  }
}

//IAAAA
async function generarIA() {
  const mensaje = document.getElementById("mensaje");
  const boton = document.getElementById("generarBtn");
  const peticion = document.getElementById("peticion").value.trim();

  if (!peticion) {
    mensaje.textContent = "Escribe qué reto quieres";
    return;
  }

  mensaje.textContent = "Generando...";
  boton.disabled = true;

  try {
    const response = await fetch("/api/retos/ia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peticion }),
    });

    if (response.status === 401) {
      location.href = "/static/pages/auth.html";
      return;
    }

    const respuesta = await response.json();

    if (!response.ok) {
      mensaje.textContent = respuesta.error;
      return;
    }

    retoActual = respuesta;
    pintarReto(respuesta);
    mensaje.textContent = "";
  } catch (error) {
    console.error(error);
    mensaje.textContent = "No se pudo conectar con el servidor";
  } finally {
    boton.disabled = false;
  }
}

document.getElementById("generarBtn").addEventListener("click", generarIA);

//copiar texto wuu
document.getElementById("copiarBtn").addEventListener("click", async () => {
  const mensaje = document.getElementById("mensaje");

  if (Object.keys(retoActual).length === 0) {
    mensaje.textContent = "Primero genera un reto";
    return;
  }

  const texto = Object.entries(retoActual)
    .map(([tipo, contenido]) => tipo + ": " + contenido)
    .join("\n");

  try {
    await navigator.clipboard.writeText(texto);
    mensaje.textContent = "Reto copiado";
  } catch (error) {
    console.error(error);
    mensaje.textContent = "No se pudo copiar";
  }
});
