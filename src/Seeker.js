document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search-input");
    const productCards = document.querySelectorAll(".product-card");
    const noResultsMessage = document.getElementById("no-results-message");

    // Control de imágenes y estados de stock
    productCards.forEach(card => {
        const img = card.querySelector(".product-image");
        const buyBtn = card.querySelector(".btn-buy");

        // FUNCIÓN CLAVE: Si la imagen falla en cargar (ruta rota o inexistente)
        img.onerror = function () {
            img.style.display = "none"; // Oculta el icono roto y el texto ALT
            buyBtn.style.backgroundColor = "#6c757d"; // Cambia el botón a gris
            buyBtn.textContent = "Agotado - Consultar";
        };

        // Si el src viene completamente vacío desde el inicio
        if (!img.getAttribute("src") || img.getAttribute("src").trim() === "") {
            img.style.display = "none";
            buyBtn.style.backgroundColor = "#6c757d";
            buyBtn.textContent = "Agotado - Consultar";
        }
    });

    // Sistema de Búsqueda en tiempo real
    searchInput.addEventListener("input", function () {
        const searchTerm = searchInput.value.toLowerCase().trim();
        let hasResults = false;

        productCards.forEach(card => {
            const title = card.querySelector("h3").textContent.toLowerCase();
            const category = card.getAttribute("data-category").toLowerCase();

            if (title.includes(searchTerm) || category.includes(searchTerm)) {
                card.style.display = "flex";
                hasResults = true;
            } else {
                card.style.display = "none";
            }
        });

        noResultsMessage.style.display = hasResults ? "none" : "block";
    });
});