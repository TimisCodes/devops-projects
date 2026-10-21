
const statusElement = document.getElementById("status");
const gadgetList = document.getElementById("gadget-list");
const refreshButton = document.getElementById("refresh-button");
const searchInput = document.getElementById("gadget-search");
const categoryFilters = document.getElementById("category-filters");

const authForms = document.getElementById("auth-forms");
const accountPanel = document.getElementById("account-panel");
const accountUsername = document.getElementById("account-username");
const accountEmail = document.getElementById("account-email");

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
];

let currentUser = null;
let loadingGadgets = false;
let availableGadgets = [];
let selectedCategory = "all";

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        ...options
    });

    const contentType = response.headers.get("content-type") || "";
    let result = {};

    if (contentType.includes("application/json")) {
        result = await response.json();
    }

    if (!response.ok) {
        throw new Error(
            result.error || result.message || `Request failed (${response.status}).`
        );
    }

    return result;
}

function setAuthStatus(id, message) {
    document.getElementById(id).textContent = message;
}

function showAccount(user) {
    currentUser = user;

    authForms.hidden = Boolean(user);
    accountPanel.hidden = !user;

    if (user) {
        accountUsername.textContent = user.username || user.email;
        accountEmail.textContent = user.email || "";
    }
}

async function checkSession() {
    try {
        const result = await apiRequest("/api/auth/me");
        showAccount(result.user || result);
    } catch (error) {
        if (error.message.includes("401") ||
            error.message.toLowerCase().includes("unauthorized")) {
            showAccount(null);
            return;
        }

        // If the session endpoint is unavailable, don't assume a user is logged in.
        showAccount(null);
        console.error("Could not verify the session:", error);
    }
}

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = registerForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setAuthStatus("register-status", "Creating your account...");

    const formData = new FormData(registerForm);

    try {
        const result = await apiRequest("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: formData.get("username").trim(),
                email: formData.get("email").trim(),
                password: formData.get("password")
            })
        });

        // The API may automatically sign the new user in.
        if (result.user) {
            showAccount(result.user);
            registerForm.reset();
            setAuthStatus("register-status", "Account created successfully.");
            await loadGadgets();
        } else {
            setAuthStatus(
                "register-status",
                "Account created. Please sign in."
            );
        }
    } catch (error) {
        setAuthStatus("register-status", error.message);
    } finally {
        button.disabled = false;
    }
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setAuthStatus("login-status", "Signing in...");

    const formData = new FormData(loginForm);

    try {
        const result = await apiRequest("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: formData.get("email").trim(),
                password: formData.get("password")
            })
        });

        const user = result.user || result;
        showAccount(user);
        loginForm.reset();
        setAuthStatus("login-status", "Signed in successfully.");
        await loadGadgets();
    } catch (error) {
        setAuthStatus("login-status", error.message);
    } finally {
        button.disabled = false;
    }
});

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    document.getElementById("account-status").textContent = "Signing out...";

    try {
        await apiRequest("/api/auth/logout", { method: "POST" });
        showAccount(null);
        document.getElementById("account-status").textContent =
            "You have signed out.";
        await loadGadgets();
    } catch (error) {
        document.getElementById("account-status").textContent = error.message;
    } finally {
        logoutButton.disabled = false;
    }
});

async function loadGadgets() {
    if (loadingGadgets) return;

    loadingGadgets = true;
    statusElement.textContent = "Loading gadgets...";
    refreshButton.disabled = true;

    try {
        availableGadgets = await apiRequest("/api/gadgets");
        renderCategoryFilters();
        renderGadgets();
    } catch (error) {
        statusElement.textContent =
            "Unable to load gadgets. Check the backend and database.";
        console.error(error);
    } finally {
        refreshButton.disabled = false;
        loadingGadgets = false;
    }
}

function renderCategoryFilters() {
    const categories = [...new Set(
        availableGadgets
            .map((gadget) => gadget.category)
            .filter(Boolean)
    )].sort((first, second) => first.localeCompare(second));

    categoryFilters.replaceChildren();
    ["all", ...categories].forEach((category) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "filter-chip";
        button.dataset.filter = category;
        button.textContent = category === "all" ? "Everything" : category;
        button.setAttribute("aria-pressed", String(category === selectedCategory));
        button.classList.toggle("active", category === selectedCategory);
        categoryFilters.appendChild(button);
    });
}

function renderGadgets() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const filteredGadgets = availableGadgets.filter((gadget) => {
        const matchesCategory = selectedCategory === "all" ||
            gadget.category?.toLowerCase() === selectedCategory.toLowerCase();
        const searchableText = `${gadget.name} ${gadget.category}`.toLowerCase();
        return matchesCategory && searchableText.includes(searchTerm);
    });

    gadgetList.replaceChildren();
    filteredGadgets.forEach((gadget) => {
        gadgetList.appendChild(createGadgetCard(gadget));
    });

    if (availableGadgets.length === 0) {
        statusElement.textContent = "No gadgets in the collection yet.";
    } else if (filteredGadgets.length === 0) {
        statusElement.textContent = "No gadgets match this search.";
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-message";
        emptyMessage.textContent = "Try another name or category.";
        gadgetList.appendChild(emptyMessage);
    } else {
        statusElement.textContent = `${filteredGadgets.length} ${filteredGadgets.length === 1 ? "piece" : "pieces"} in the collection`;
    }
}

categoryFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;

    selectedCategory = button.dataset.filter;
    renderCategoryFilters();
    renderGadgets();
});

searchInput.addEventListener("input", renderGadgets);

document.querySelectorAll(".category-links a[data-category]").forEach((link) => {
    link.addEventListener("click", () => {
        const category = availableGadgets.find((gadget) =>
            gadget.category?.toLowerCase() === link.dataset.category.toLowerCase()
        )?.category;

        if (category) {
            selectedCategory = category;
            renderCategoryFilters();
            renderGadgets();
        }
    });
});

function createGadgetCard(gadget) {
    const card = document.createElement("article");
    card.className = "gadget";

    const heading = document.createElement("h3");
    heading.textContent = gadget.name;

    const category = document.createElement("p");
    category.textContent = `Category: ${gadget.category}`;

    const price = document.createElement("p");
    price.className = "price";
    price.textContent = `Price: $${Number(gadget.price).toFixed(2)}`;

    const imageHeading = document.createElement("h4");
    imageHeading.textContent = "Gadget images";

    const imageGallery = document.createElement("div");
    imageGallery.className = "image-gallery";

    if (gadget.images?.length) {
        gadget.images.forEach((image) => {
            imageGallery.appendChild(createImageCard(gadget, image));
        });
    } else {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-message";
        emptyMessage.textContent = "No images uploaded yet.";
        imageGallery.appendChild(emptyMessage);
    }

    const uploadForm = document.createElement("form");
    uploadForm.className = "upload-form";

    const uploadLabel = document.createElement("label");
    uploadLabel.textContent =
        "Choose an image (JPEG, PNG, WEBP or GIF; max 5 MB)";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.name = "image";
    fileInput.accept = ALLOWED_TYPES.join(",");
    fileInput.required = true;
    fileInput.disabled = !currentUser;

    const preview = document.createElement("img");
    preview.className = "image-preview";
    preview.alt = "Selected image preview";
    preview.hidden = true;

    const uploadButton = document.createElement("button");
    uploadButton.type = "submit";
    uploadButton.textContent = currentUser ? "Upload image" : "Sign in to upload";
    uploadButton.disabled = !currentUser;

    const uploadStatus = document.createElement("p");
    uploadStatus.className = "upload-status";
    uploadStatus.setAttribute("role", "status");

    let previewUrl = null;

    fileInput.addEventListener("change", () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }

        preview.hidden = true;
        preview.removeAttribute("src");

        const file = fileInput.files[0];
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            uploadStatus.textContent =
                "Choose a JPEG, PNG, WEBP or GIF image.";
            fileInput.value = "";
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            uploadStatus.textContent = "The image must be 5 MB or smaller.";
            fileInput.value = "";
            return;
        }

        previewUrl = URL.createObjectURL(file);
        preview.src = previewUrl;
        preview.hidden = false;
        uploadStatus.textContent = "";
    });

    uploadForm.append(
        uploadLabel,
        fileInput,
        preview,
        uploadButton,
        uploadStatus
    );

    uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!currentUser) {
            uploadStatus.textContent =
                "Create an account or sign in before uploading.";
            return;
        }

        const file = fileInput.files[0];

        if (!file) {
            uploadStatus.textContent = "Choose an image first.";
            return;
        }

        if (!ALLOWED_TYPES.includes(file.type) ||
            file.size > MAX_FILE_SIZE) {
            uploadStatus.textContent = "Check the image format and size.";
            return;
        }

        const formData = new FormData();
        formData.append("image", file);

        uploadButton.disabled = true;
        fileInput.disabled = true;
        uploadStatus.textContent = "Uploading image...";

        try {
            await apiRequest(`/api/gadgets/${gadget.id}/images`, {
                method: "POST",
                body: formData
            });

            uploadStatus.textContent = "Image uploaded successfully!";
            fileInput.value = "";

            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                previewUrl = null;
            }

            await loadGadgets();
        } catch (error) {
            uploadStatus.textContent = error.message;
        } finally {
            uploadButton.disabled = !currentUser;
            fileInput.disabled = !currentUser;
        }
    });

    card.append(
        heading,
        category,
        price,
        imageHeading,
        imageGallery,
        uploadForm
    );

    return card;
}

function createImageCard(gadget, image) {
    const imageCard = document.createElement("div");
    imageCard.className = "image-item";

    const img = document.createElement("img");
    img.src = image.url;
    img.alt = `${gadget.name} — ${image.original_name}`;
    img.loading = "lazy";

    const fileName = document.createElement("p");
    fileName.className = "file-name";
    fileName.textContent = image.original_name;

    const downloadLink = document.createElement("a");
    downloadLink.href = `${image.url}/download`;
    downloadLink.textContent = "Download image";
    downloadLink.className = "download-link";
    downloadLink.setAttribute("download", "");

    imageCard.append(img, fileName, downloadLink);

    if (currentUser) {
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "danger-button";
        deleteButton.textContent = "Delete image";

        const deleteStatus = document.createElement("p");
        deleteStatus.className = "upload-status";
        deleteStatus.setAttribute("role", "status");

        deleteButton.addEventListener("click", async () => {
            const confirmed = window.confirm(
                `Delete "${image.original_name}"? This action cannot be undone.`
            );

            if (!confirmed) return;

            deleteButton.disabled = true;
            deleteStatus.textContent = "Deleting image...";

            try {
                // Requires a backend DELETE route and server-side permission checks.
                await apiRequest(
                    `/api/gadgets/${gadget.id}/images/${image.id}`,
                    { method: "DELETE" }
                );

                deleteStatus.textContent = "Image deleted.";
                await loadGadgets();
            } catch (error) {
                deleteStatus.textContent = error.message;
                deleteButton.disabled = false;
            }
        });

        imageCard.append(deleteButton, deleteStatus);
    }

    return imageCard;
}

refreshButton.addEventListener("click", loadGadgets);

async function initializeApp() {
    await checkSession();
    await loadGadgets();
}

initializeApp();
