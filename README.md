# SinfonIA - Sistema Web de Lectura, Traducción y Partituras en PDF por Instrumento

¡Bienvenido a **SinfonIA**! Un sistema web autónomo y profesional diseñado para leer canciones, transcribir y separar los instrumentos de la música, traducir las notas a nombres fáciles de leer (Do, Re, Mi...) y generar partituras descargables en formato **PDF** de alta resolución listas para imprimir.

---

## 🚀 ¿Cómo abrir y utilizar el sistema?

No necesitas instalar Python, Node.js ni ningún programa adicional. Todo funciona 100% en tu navegador web:

1. Ve a la carpeta del proyecto:
   `c:\Users\expedicion\Desktop\NO TOCAR HERNAN\PRUEBA\`
2. Haz doble clic en el archivo **`index.html`** (o clic derecho > *Abrir con* > Google Chrome / Microsoft Edge / Firefox / Brave).
3. ¡La aplicación se abrirá de inmediato lista para usar!

---

## 🎼 Características Principales

### 1. Carga Fácil y Versátil
* **Subir archivos de Audio (MP3, WAV, OGG, M4A)**:
  Arrastra tu canción a la zona de carga. El motor acústico Web Audio procesa la forma de onda, detecta las frecuencias y transcribe las notas musicales.
* **Archivos MIDI (.mid, .midi)**:
  Separa automáticamente cada pista de instrumento con precisión milimétrica (Piano, Bajo, Guitarra, Cuerdas, Vientos, etc.).
* **Cargar por URL**:
  Pega el enlace web directo a cualquier archivo de música o audio y pulsa el botón **"Cargar"**.
* **Canciones de Demostración**:
  Incluye obras clásicas y modernas listas para probar en 1 clic:
  - *Para Elisa (Beethoven)*
  - *Balada Jazz & Blues*
  - *Canon en Re Mayor (Pachelbel)*

### 2. Separación de Instrumentos
El sistema organiza la música en pestañas independientes:
* 🥁 **Batería / Percusión**: Pentagrama con clave neutral de percusión (`clef=perc`) con notación para Bombo, Caja/Tarola, Hi-Hat/Charles, Platos (Crash/Ride) y Toms.
* 🎼 **Melodía / Voz Principal**: Clave de Sol (agudos y voces solistas).
* 🎹 **Piano / Acompañamiento**: Pentagrama armónico y acordes.
* 🎸 **Línea de Bajo**: Clave de Fa (bajos y frecuencias graves).
* 📜 **Partitura General Orquestal**: Muestra todos los instrumentos sincronizados en un solo sistema.

### 3. Traducción Musical de Notas
Puedes cambiar la visualización de notas en tiempo real mediante el menú desplegable:
* **Español (Do, Re, Mi... / Bombo, Caja, Hi-Hat...)**:
  - En instrumentos melódicos/armónicos escribe las notas en español (**Do, Re, Mi, Fa, Sol, La, Si**).
  - En la **batería**, traduce cada golpe indicando el elemento exacto: **Bombo, Caja, Hi-Hat, Crash, Ride, Tom**.
* **Cifrado Americano (C, D, E... / Kick, Snare, Hi-Hat...)**: Notación estándar anglosajona.
* **Clásica**: Pentagrama tradicional limpio sin anotaciones de texto.

### 4. Reproductor y Exportación a PDF
* **▶️ Escuchar Partitura**: Sintetizador de audio que te permite escuchar la melodía de las notas de la partitura.
* **📄 Descargar PDF**: Genera automáticamente un archivo PDF profesional (formato A4) con membrete, título de la canción, nombre del instrumento, tempo (BPM) y pentagramas vectoriales nítidos.
* **🖨️ Imprimir**: Abre directamente el cuadro de diálogo de impresión de tu navegador con diseño optimizado para papel blanco y tinta negra.

---

## 📁 Estructura del Proyecto

```
PRUEBA/
│
├── index.html                   # Interfaz principal de la aplicación web
├── README.md                    # Manual de usuario en español
│
├── css/
│   └── styles.css               # Estilos visuales estilo estudio DAW y soporte de impresión
│
└── js/
    ├── app.js                   # Controlador general y sincronización de eventos
    ├── audio-transcriber.js     # Motor acústico Web Audio y algoritmo YIN de detección de tono
    ├── demo-songs.js            # Biblioteca de canciones de ejemplo preconfiguradas
    ├── midi-parser.js           # Lector y separador de instrumentos MIDI
    ├── notation-translator.js   # Traductor de notas (Do-Re-Mi) y motor de pentagrama ABC
    └── pdf-exporter.js          # Exportador de partituras a documentos PDF vectoriales (jsPDF)
```
