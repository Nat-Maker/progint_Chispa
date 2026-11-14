//memoria
let retoActual = {};
const bloqueados = new Set();

//usar un fetch con await dentro de un async y.json para convertir la respuesta en un arreglo
async function fetchArreglo(id = 2) {
  try {
    const response = await fetch(`/api/categorias/${id}/elementos`);
    if (!response.ok) {
      throw new Error("Error en la solicitud " + response.status);
    }
    const datos = await response.json();
    const grupos = agruparPorTipo(datos);
    const reto = sortearPorTipo(grupos);
    pintarReto(reto);
    retoActual = reto;
  } catch (error) {
    console.error("Error:", error);
  }
}

//crear el arreglo mas bonito iguess
function agruparPorTipo(lista) {
  const grupos = {};

  for (const elemento of lista) {
    const tipo = elemento.tipoElemento;

    // si todavía no existe el montón de este tipo, lo crea vacío
    if (!grupos[tipo]) {
      grupos[tipo] = [];
    }

    // pone el contenido en su montón
    grupos[tipo].push(elemento.contenido);
  }

  return grupos;
}

//random
function sortearPorTipo(grupos) {
  const resultado = {};

  Object.entries(grupos).forEach(([tipo, elementos]) => {
    if (bloqueados.has(tipo) && retoActual[tipo]) {
      resultado[tipo] = retoActual[tipo];
      return;
    }
    const indiceAleatorio = Math.floor(Math.random() * elementos.length);
    resultado[tipo] = elementos[indiceAleatorio];
  });
  return resultado;
}

//pintadO
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

//select
async function btnSelec() {
  const response = await fetch("/api/categorias");
  const categorias = await response.json();
  for (const categoria of categorias) {
    const option = document.createElement("option");
    option.value = categoria.idCat;
    option.textContent = categoria.nombre;

    document.getElementById("catSelect").appendChild(option);
    document.getElementById("catSelect").addEventListener("change", () => {
      bloqueados.clear();
      retoActual = {};
    });
  }
}

//funcionalidad
const boton = document.getElementById("sortearBtn");
boton.addEventListener("click", () => {
  const select = document.getElementById("catSelect");
  const idCategoria = select.value;
  fetchArreglo(idCategoria);
});

document.getElementById("guardarBtn").addEventListener("click", async () => {
  const mensaje = document.getElementById("mensaje");

  const elementos = Object.entries(retoActual).map(([tipo, contenido]) => ({
    tipoElemento: tipo,
    contenido: contenido,
    block: bloqueados.has(tipo),
  }));

  try {
    const response = await fetch("/api/retos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idCat: document.getElementById("catSelect").value,
        titulo: document.getElementById("titulo").value,
        descripcion: "",
        dias: document.getElementById("dias").value,
        elementos: elementos,
      }),
    });

    if (response.status === 401) {
      location.href = "/static/pages/auth.html";
      return;
    }

    const respuesta = await response.json();
    mensaje.textContent = response.ok ? respuesta.message : respuesta.error;
  } catch (error) {
    console.error(error);
    mensaje.textContent = "No se pudo conectar con el servidor";
  }
});

btnSelec();
fetchArreglo();
