// videos.js
// Add information for each video you want to feature on your site here.
// Make sure each 'id' is unique!

const videoData = [
    {
        id: "como-hacerte-rico-invirtiendo", // Unique ID used in URL
        youtubeId: "thWuVhSIvWo", // Extracted from your example URL
        title: "Cómo Hacerte Rico Invirtiendo",
        subtitle: "La importancia de empezar hoy — explicado de forma sencilla",
        description: `
            En este episodio hablamos sobre por qué invertir es la mejor
            decisión financiera que puedes tomar — especialmente si
            empiezas temprano. Usamos ejemplos reales y te explico cómo
            funciona el interés compuesto y por qué la mayoría pierde la
            oportunidad de hacerse rico por no entender esto.
        `,
    },
    {
        id: "como-invertir-bolsa", // Unique ID for this video
        youtubeId: "6pEY7G8lLz0", // Extracted from your provided URL
        title: "Como invertir en la bolsa",
        subtitle: "Tu guía paso a paso para empezar en la bolsa.", // *** REPLACE THIS ***
        description: `
           ¿Listo para dar el salto al mercado de valores? En esta guía te explicamos cómo empezar a invertir.
            Cubrimos los conceptos básicos: qué es un bróker, cómo elegir uno, la importancia de índices
            como el S&P 500 y los pasos prácticos para realizar tu primera inversión de forma informada.
        `, // *** REPLACE THIS ***
    },
    {
        id: "acciones-vs-etfs", // Unique ID for this video
        youtubeId: "g76PU8__M54", // Extracted from your provided URL
        title: "Acciones vs ETFs",
        subtitle:
            "¿Acciones Individuales o ETFs? ¿Cuál es la mejor opción para tu portafolio?", // *** REPLACE THIS ***
        description: `
          El mundo de la inversión ofrece distintas opciones. Aquí comparamos dos de las más populares:
            comprar acciones individuales vs invertir en ETFs (Fondos Cotizados). Analizamos las ventajas
            y desventajas de cada uno, incluyendo diversificación, riesgo, costos y facilidad de manejo,
            para ayudarte a decidir qué estrategia se adapta mejor a tus objetivos financieros.
        `, // *** REPLACE THIS ***
    },
    {
        id: "analizar-tesla", // Unique ID for this video
        youtubeId: "53PLnbR-9UQ", // Extracted from your provided URL
        title: "Como analizar una compañia - Tesla",
        subtitle: "Analizando una acción: El caso práctico de Tesla.", // *** REPLACE THIS ***
        description: `
        Aprende el proceso de análisis de una compañía usando Tesla como ejemplo real.
            Hacemos un deep dive en sus fundamentales, revisamos métricas clave, discutimos su
            posición en el mercado y te mostramos las herramientas y el enfoque que puedes usar
            para investigar a fondo cualquier acción antes de invertir.
        `, // *** REPLACE THIS ***
    },
    // --- ADD MORE VIDEOS HERE following the same format ---
    // {
    //     id: 'unique-video-id-5',
    //     youtubeId: 'YOUTUBE_ID_HERE',
    //     title: 'Título del Quinto Video',
    //     subtitle: 'Subtítulo para el quinto video',
    //     description: `
    //         Descripción detallada del quinto video...
    //     `
    // },
];

// Make the data available globally
window.allVideos = videoData;
