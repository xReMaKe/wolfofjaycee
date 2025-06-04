// video-loader.js

document.addEventListener("DOMContentLoaded", function () {
    // --- Get references to HTML elements ---
    const videoTitleEl = document.getElementById("videoTitle");
    const videoSubtitleEl = document.getElementById("videoSubtitle");
    const videoFrameEl = document.getElementById("videoFrame");
    const summaryTitleEl = document.getElementById("summaryTitle"); // Optional: could change this too
    const videoDescriptionEl = document.getElementById("videoDescription");
    // const relatedListEl = document.getElementById('relatedList'); // For related videos later
    const errorMessageEl = document.getElementById("errorMessage");

    // --- Get video ID from URL parameter ---
    const urlParams = new URLSearchParams(window.location.search);
    const requestedVideoId = urlParams.get("id"); // Get value of 'id' like ?id=que-es-la-bolsa

    // --- Find the video data ---
    let video = null;
    if (requestedVideoId && window.allVideos && window.allVideos.length > 0) {
        video = window.allVideos.find((v) => v.id === requestedVideoId);
    }

    // --- Populate the page OR show error ---
    if (video) {
        // Found the video - update the HTML elements
        document.title = `${video.title} | Aprende con WolfOfJayCee!`; // Update page title

        videoTitleEl.textContent = video.title;
        videoSubtitleEl.textContent = video.subtitle || ""; // Use subtitle or empty string
        videoDescriptionEl.innerHTML = video.description.replace(/\n/g, "<br>"); // Replace newlines with <br> for HTML

        // Update the iframe source
        if (video.youtubeId) {
            videoFrameEl.src = `https://www.youtube.com/embed/${video.youtubeId}`;
            videoFrameEl.title = video.title; // Set iframe title for accessibility
        } else {
            // Handle case where youtubeId might be missing
            videoFrameEl.style.display = "none"; // Hide the frame
            // Optionally show a message in the video area
        }

        // Optional: Populate related videos later if needed
        // if (video.relatedIds && relatedListEl) {
        //     relatedListEl.innerHTML = ''; // Clear loading text
        //     video.relatedIds.forEach(relatedId => {
        //         const relatedVideo = window.allVideos.find(v => v.id === relatedId);
        //         if (relatedVideo) {
        //             const li = document.createElement('li');
        //             const a = document.createElement('a');
        //             a.href = `video-template.html?id=${relatedVideo.id}`;
        //             a.textContent = relatedVideo.title;
        //             li.appendChild(a);
        //             relatedListEl.appendChild(li);
        //         }
        //     });
        // }
    } else {
        // Video not found or ID missing
        videoTitleEl.textContent = "Video No Encontrado";
        videoSubtitleEl.textContent = "";
        videoDescriptionEl.textContent =
            "El video que buscas no está disponible o la URL es incorrecta.";
        errorMessageEl.textContent =
            "No se pudo encontrar el video solicitado.";
        errorMessageEl.style.display = "block"; // Show error message div
        // Hide the video frame section if video not found
        const videoSection = videoFrameEl.closest(".video-section");
        if (videoSection) videoSection.style.display = "none";
        const summarySection = summaryTitleEl.closest(".summary-section");
        if (summarySection)
            summarySection.querySelector("h2").style.display = "none"; // Hide "De que trata.." h2
    }
});
