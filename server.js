// los require
const env = require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const mysql = require("mysql2");
const app = express();

// ma pool
var con = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "retosCreativos",
});

const db = con.promise();

con.getConnection(function (err) {
  if (err) throw err;
  console.log("Connected!");
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Result: " + result);
  });
});

//da use
app.use("/static", express.static(path.join(__dirname, "public")));

//da use 2: sesion mas sesion que nunca
app.use(express.json());
app.use(
  session({
    secret: "miau-miau-6-7-6-7",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false },
  }),
);

//da get
app.get("/api/categorias/:id/elementos", function (req, res) {
  con.query(
    "SELECT tipoElemento, contenido FROM elemento WHERE idCat = ? OR idCat IS NULL",
    [req.params.id],
    function (err, rows) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error en la consulta" });
      }
      res.json(rows);
    },
  );
});

app.get("/api/categorias", function (req, res) {
  con.query("SELECT idCat, nombre FROM categoria", function (err, rows) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error en la consulta" });
    }
    res.json(rows);
  });
});

//da listen
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

//---PERFILES LOGIN Y TODO ESO

app.post("/api/auth/registro", async function (req, res) {
  try {
    const { nombre, correo, contra } = req.body;

    if (!nombre || !correo || !contra) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const [existentes] = await db.query(
      "SELECT idUsu FROM usuarios WHERE correo = ?",
      [correo],
    );

    const hash = await bcrypt.hash(contra, 10);

    await db.query(
      "INSERT INTO usuarios (nombre, correo, contra) VALUES (?, ?, ?)",
      [nombre, correo, hash],
    );

    res.status(201).json({ message: "Usuario registrado existosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

app.post("/api/auth/login", async function (req, res) {
  try {
    const { nombre, correo, contra } = req.body;

    if (!correo || !contra) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const [existentes] = await db.query(
      "SELECT idUsu, contra FROM usuarios WHERE correo = ?",
      [correo],
    );
    existentes.length === 0 &&
      res.status(401).json({ error: "Credenciales inválidas" });

    const coincide = await bcrypt.compare(contra, existentes[0].contra);

    if (!coincide) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    req.session.idUsu = existentes[0].idUsu;
    res.status(200).json({ message: "Login exitoso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

//------RETOOOOOOOS

app.post("/api/retos", async function (req, res) {
  try {
    if (!req.session.idUsu) {
      return res.status(401).json({ error: "Inicia sesion para guardar" });
    }

    const { titulo, descr, idCat, dias, elementos } = req.body;

    if (
      !titulo ||
      !idCat ||
      !Array.isArray(elementos) ||
      elementos.length === 0 ||
      !dias
    ) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const numDias = Number(dias);
    if (!Number.isInteger(numDias) || numDias <= 0) {
      return res.status(400).json({ error: "Días inválidos" });
    }

    const [resultado] = await db.query(
      `INSERT INTO reto (idUsu, idCat, titulo, tipoReto, estado, fechaInicio, fechaFinal)
   VALUES (?, ?, ?, 'ALEATORIO', 'PENDIENTE', NOW(), NOW() + INTERVAL ? DAY)`,
      [req.session.idUsu, idCat, titulo, descr, numDias],
    );
    const idReto = resultado.insertId;

    for (const el of elementos) {
      const [filas] = await db.query(
        `SELECT idElem FROM elemento
         WHERE tipoElemento = ? AND contenido = ? AND (idCat = ? OR idCat IS NULL)
         LIMIT 1`,
        [el.tipoElemento, el.contenido, idCat],
      );

      if (filas.length === 0) {
        continue; // ese elemento no existe en la base, se salta
      }

      await db.query(
        "INSERT INTO reto_elemento (idReto, idElem, contSelect, block) VALUES (?, ?, ?, ?)",
        [idReto, filas[0].idElem, el.contenido, el.block ? 1 : 0],
      );
    }

    res.status(201).json({ message: "Reto creado exitosamente", idReto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

app.get("/api/retos", async function (req, res) {
  try{
    if (!req.session.idUsu) {
      return res.status(401).json({error: "Inicia sesion para ver tus retos pasados"});
    }

    const [retos] = await db.query(
      'SELECT r.idReto, r.titulo, r.estado, r.fechaInicio, r.fechaFinal, c.nombre AS categoria FROM reto r JOIN categoria c ON c.idCat = r.idCat WHERE r.idUsu = ? ORDER BY r.idReto DESC', [req.session.idUsu]
    );

    if(retos.length === 0){
      return res.json([]);
    }

    const ids = retos.map((r) => r.idReto);
    const [elementos] = await db.query(`SELECT re.idReto, e.tipoElemento, re.contSelect, re.block
       FROM reto_elemento re
       JOIN elemento e ON e.idElem = re.idElem
       WHERE re.idReto IN (?)`,
      [ids]
    );

    for (const reto of retos) {
      reto.elementos = elementos.filter((el) => el.idReto === reto.idReto)
    }

    res.json(retos);
  } catch(err){
    console.error(err);
    res.status(500).json({error: "Error en el servidor"});
  }
}); 

//-----LOGOUT
app.post("/api/auth/logout", function (req, res) {
  req.session.destroy(function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "No se pudo cerrar sesión" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Sesión cerrada" });
  });
});

//--- RETOS DE IAAAAAAA
const TIPOS = ["Tema", "Paginas", "Restricciones", "Lenguaje", "Paleta", "Dificultad"];

app.post("/api/retos/ia", async function (req, res) {
  try {
    if (!req.session.idUsu) {
      return res.status(401).json({ error: "Inicia sesion para usar la IA" });
    }

    const { peticion } = req.body;
    if (!peticion || typeof peticion !== "string" || peticion.length > 300) {
      return res.status(400).json({ error: "Escribe qué reto quieres (máximo 300 caracteres)" });
    }

    const instrucciones = `Eres un generador de retos creativos para practicar programación y diseño web.
La persona te dice qué quiere. Responde SOLO con un objeto JSON con estas claves de texto:
Tema, Paginas, Restricciones, Lenguaje, Paleta, Dificultad.
- Tema: una frase corta con la idea del reto.
- Paginas: las páginas que debe tener, separadas por coma.
- Restricciones: una restricción técnica.
- Lenguaje: un lenguaje o tecnología.
- Paleta: de 3 a 6 colores en hexadecimal con #, separados por coma y sin espacios, por ejemplo #E8A87C,#C38D9E.
- Dificultad: exactamente una de estas: Facil, Intermedio, Dificil.
Responde en español. No agregues texto fuera del JSON.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instrucciones }] },
          contents: [{ parts: [{ text: peticion }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    if (response.status === 429 || response.status === 503) {
      return res.status(503).json({ error: "La IA está ocupada, intenta de nuevo en un momento" });
    }
    if (!response.ok) {
      console.error(response.status, await response.text());
      return res.status(502).json({ error: "No se pudo generar el reto" });
    }

    const datos = await response.json();
    const texto = datos.candidates?.[0]?.content?.parts?.[0]?.text;

    let reto;
    try {
      reto = JSON.parse(texto);
    } catch {
      return res.status(502).json({ error: "La IA respondió algo inválido, intenta de nuevo" });
    }

    // validar: solo tipos conocidos, textos cortos, paleta con formato correcto
    const limpio = {};
    for (const tipo of TIPOS) {
      const valor = reto[tipo];
      if (typeof valor === "string" && valor.trim() && valor.length <= 200) {
        limpio[tipo] = valor.trim();
      }
    }
    if (limpio.Paleta && !/^#[0-9A-Fa-f]{6}(,#[0-9A-Fa-f]{6})*$/.test(limpio.Paleta)) {
      delete limpio.Paleta;
    }
    if (Object.keys(limpio).length === 0) {
      return res.status(502).json({ error: "La IA no devolvió un reto válido" });
    }

    res.json(limpio);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});