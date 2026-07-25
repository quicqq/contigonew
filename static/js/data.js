/* ============================================================
   ContiGO — Catálogo de contenido
   ============================================================
   AQUÍ EDITAS LOS PROFESIONALES Y LOS VIDEOS.
   Todo lo visible en la app sale de este archivo.
   ============================================================ */

/* ------------------------------------------------------------
   PROFESIONALES
   ------------------------------------------------------------
   foto: usa una URL de imagen. Opciones:
     a) Foto local  → "/static/img/maria.jpg"  (crea la carpeta static/img)
     b) Foto online → cualquier URL https://…
   Si la imagen falla, se muestran las iniciales automáticamente.
------------------------------------------------------------ */
const PROFESIONALES = [
  {
    id: "mateo",
    nombre: "Mateo Andrade",
    titulo: "Asesor Work and Travel · Visa J-1",
    foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces",
    ciudad: "Guayaquil, Ecuador",
    rating: "4.9", resenas: 87, casos: 210, anios: 5,
    desde: 30,
    respuesta: "~20 min",
    bio: "Ex participante de Work and Travel y hoy reclutador. Te acompaño en todo el proceso: elección del sponsor, aplicación al programa, preparación para la entrevista de visa J-1 en la embajada y qué esperar al llegar a Estados Unidos.",
    tags: ["Work and Travel", "Visa J-1", "Entrevista embajada", "DS-2019", "Sponsors"],
    servicios: [
      { n: "Asesoría completa Work and Travel", p: 60, t: "1-2 semanas" },
      { n: "Preparación entrevista visa J-1", p: 30, t: "2-3 días" },
      { n: "Revisión de documentos DS-2019", p: 25, t: "1 día" },
      { n: "Simulacro de entrevista consular", p: 20, t: "1 día" },
    ],
  },
  {
    id: "maria",
    nombre: "María Fernanda López",
    titulo: "Abogada · Derecho Civil y Notarial",
    foto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces",
    ciudad: "Guayaquil, Ecuador",
    rating: "4.9", resenas: 124, casos: 340, anios: 12,
    desde: 25,
    respuesta: "~45 min",
    bio: "Especialista en escrituras, poderes, herencias y declaraciones juradas. Acompaño el proceso completo desde la revisión de documentos hasta la firma en notaría.",
    tags: ["Escrituras", "Poderes", "Herencias", "Declaraciones juradas", "Compraventa"],
    servicios: [
      { n: "Elaboración de poder general", p: 45, t: "2-3 días" },
      { n: "Declaración juramentada", p: 25, t: "1 día" },
      { n: "Trámite de herencia", p: 180, t: "3-4 semanas" },
      { n: "Revisión de contrato", p: 35, t: "2 días" },
    ],
  },
  {
    id: "juan",
    nombre: "Juan Pablo Martínez",
    titulo: "Contador Público · Tributación SRI",
    foto: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=faces",
    ciudad: "Guayaquil, Ecuador",
    rating: "4.8", resenas: 98, casos: 512, anios: 9,
    desde: 20,
    respuesta: "~30 min",
    bio: "Obtención y actualización de RUC, declaraciones mensuales, facturación electrónica y contabilidad para personas naturales y pequeños negocios.",
    tags: ["RUC", "Declaraciones", "Facturación", "RIMPE", "Contabilidad"],
    servicios: [
      { n: "Obtención de RUC", p: 20, t: "1 día" },
      { n: "Declaración de IVA mensual", p: 30, t: "2 días" },
      { n: "Configurar facturación electrónica", p: 55, t: "3 días" },
      { n: "Asesoría RIMPE", p: 25, t: "1 día" },
    ],
  },
  {
    id: "ana",
    nombre: "Ana Sofía Gómez",
    titulo: "Gestora Administrativa · Tránsito",
    foto: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces",
    ciudad: "Guayaquil, Ecuador",
    rating: "4.7", resenas: 76, casos: 289, anios: 7,
    desde: 15,
    respuesta: "~1 h",
    bio: "Gestiono licencias de conducción, matriculación vehicular, transferencias de dominio y permisos de circulación. Te evito las filas y los viajes en vano.",
    tags: ["Licencias", "Matriculación", "Transferencias", "Permisos", "Revisión vehicular"],
    servicios: [
      { n: "Renovación de licencia", p: 30, t: "2-3 días" },
      { n: "Matriculación vehicular", p: 40, t: "3-5 días" },
      { n: "Transferencia de dominio", p: 75, t: "1 semana" },
      { n: "Duplicado de licencia", p: 25, t: "2 días" },
    ],
  },
  {
    id: "david",
    nombre: "David Morales",
    titulo: "Abogado · Migración y Visados",
    foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces",
    ciudad: "Quito, Ecuador",
    rating: "4.9", resenas: 112, casos: 198, anios: 11,
    desde: 30,
    respuesta: "~2 h",
    bio: "Visas de turismo, residencias temporales y permanentes, apostillas y trámites ante Cancillería. Preparo tu expediente para maximizar la aprobación.",
    tags: ["Visa turismo", "Residencia", "Apostilla", "Naturalización", "Cancillería"],
    servicios: [
      { n: "Asesoría visa de turismo", p: 60, t: "1 semana" },
      { n: "Residencia temporal", p: 250, t: "4-6 semanas" },
      { n: "Apostilla de documentos", p: 35, t: "3 días" },
      { n: "Revisión de expediente", p: 40, t: "2 días" },
    ],
  },
];

/* ------------------------------------------------------------
   VIDEOS / GUÍAS
   ------------------------------------------------------------
   COMO EMBEBER UN VIDEO DE YOUTUBE:

   1. Abre tu video en YouTube y copia el link. Ejemplos:
        https://www.youtube.com/watch?v=dQw4w9WgXcQ
        https://youtu.be/dQw4w9WgXcQ

   2. El VIDEO_ID es lo que va después de "v=" o después de "youtu.be/":
        dQw4w9WgXcQ

   3. Pega ese ID en el campo "yt" de abajo:
        yt: "dQw4w9WgXcQ"

   4. La miniatura se genera SOLA desde YouTube. No tienes que hacer nada más.

   Si dejas yt: "" el video muestra un placeholder.
------------------------------------------------------------ */
const VIDEOS = [
  {
    id: "wat",
    titulo: "Cómo prepararte para la entrevista de visa J-1 (Work and Travel)",
    entidad: "Work and Travel", dur: "5:48",
    yt: "mOIsyj0p9kY",   // ← pon aquí el VIDEO_ID de YouTube
    thumb: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=310&fit=crop",
    desc: "Qué preguntan en la embajada, qué documentos llevar y cómo responder con confianza para tu programa Work and Travel.",
  },
  {
    id: "ruc",
    titulo: "Cómo obtener tu RUC por primera vez",
    entidad: "SRI", dur: "4:35",
    yt: "",   // ← pon aquí el VIDEO_ID de YouTube
    thumb: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=500&h=310&fit=crop",
    desc: "Requisitos, formulario y pasos en la web del SRI para sacar tu RUC sin ir a ventanilla.",
  },
  {
    id: "licencia",
    titulo: "Renovar tu licencia de conducción",
    entidad: "ANT", dur: "3:54",
    yt: "I_g75LBN09Q",
    thumb: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=500&h=310&fit=crop",
    desc: "Turno en línea, exámenes requeridos y qué llevar el día de la cita.",
  },
  {
    id: "antecedentes",
    titulo: "Certificado de antecedentes penales",
    entidad: "Ministerio del Interior", dur: "4:19",
    yt: "YNH2r0q9Nwg",
    thumb: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=500&h=310&fit=crop",
    desc: "Cómo descargarlo en línea en menos de 10 minutos y validarlo.",
  },
  {
    id: "visa",
    titulo: "Preparar tu solicitud de visa de turismo",
    entidad: "Cancillería", dur: "11:09",
    yt: "pK8DW8E-hm8",
    thumb: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&h=310&fit=crop",
    desc: "Documentos de respaldo, prueba de solvencia y errores frecuentes que causan negativas.",
  },
];

/* ------------------------------------------------------------
   TIPOS DE TRÁMITE del formulario de solicitud
------------------------------------------------------------ */
const TIPOS_TRAMITE = [
  "Work and Travel / Visa J-1",
  "RUC / Impuestos (SRI)",
  "Licencia de conducción",
  "Matriculación vehicular",
  "Certificado de antecedentes",
  "Visa / Migración",
  "Trámite notarial (poder, escritura)",
  "Herencia / Sucesión",
  "Registro de marca / Negocio",
  "Otro (lo explico abajo)",
];

/* ------------------------------------------------------------
   DOCUMENTOS que el experto puede pedir con un clic
------------------------------------------------------------ */
const DOCS_FRECUENTES = [
  "Cédula (ambas caras)",
  "Certificado de votación",
  "Foto tamaño carné",
  "Planilla de servicio básico",
  "Certificado médico",
  "Matrícula del vehículo",
  "Título de propiedad",
  "Pasaporte vigente",
  "Comprobante de pago",
  "RUC actualizado",
];
