
const statusElement = document.getElementById("status");
const gadgetList = document.getElementById("gadget-list");
const refreshButton = document.getElementById("refresh-button");

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
];

async function loadGadgets() {
    statusElement.textContent = "Loading gadgets...";
    refreshButton.disabled = true;

    try {
        const response = await fetch("/api/gadgets");

        if (!response.ok) {
            throw new Error("Could not retrieve gadgets.");
        }

        const gadgets = await response.json();

        gadgetList.replaceChildren();
        statusElement.textContent =
            `${gadgets.length} gadget(s) found`;

        if (gadgets.length === 0) {
            statusElement.textContent = "No gadgets found.";
        }

        gadgets.forEach((gadget) => {
            gadgetList.appendChild(createGadgetCard(gadget));
        });
    } catch (error) {
        statusElement.textContent =
            "Unable to load gadgets. Check the backend and database.";

        console.error(error);
    } finally {
        refreshButton.disabled = false;
    }
}

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
            imageGallery.appendChild(imageCard);
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
    uploadLabel.textContent = "Choose an image (JPEG, PNG, WEBP or GIF; max 5 MB)";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.name = "image";
    fileInput.accept = "image/jpeg,image/png,image/webp,image/gif";
    fileInput.required = true;

    const preview = document.createElement("img");
    preview.className = "image-preview";
    preview.alt = "Selected image preview";
    preview.hidden = true;

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
            alert("Please choose a JPEG, PNG, WEBP or GIF image.");
            fileInput.value = "";
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            alert("The image must be 5 MB or smaller.");
            fileInput.value = "";
            return;
        }

        previewUrl = URL.createObjectURL(file);
        preview.src = previewUrl;
        preview.hidden = false;
    });

    const uploadButton = document.createElement("button");
    uploadButton.type = "submit";
    uploadButton.textContent = "Upload image";

    const uploadStatus = document.createElement("p");
    uploadStatus.className = "upload-status";
    uploadStatus.setAttribute("role", "status");

    uploadForm.append(
        uploadLabel,
        fileInput,
        preview,
        uploadButton,
        uploadStatus
    );

    uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();

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
            const response = await fetch(
                `/api/gadgets/${gadget.id}/images`,
                {
                    method: "POST",
                    body: formData
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Upload failed.");
            }

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
            uploadButton.disabled = false;
            fileInput.disabled = false;
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

refreshButton.addEventListener("click", loadGadgets);

loadGadgets();
