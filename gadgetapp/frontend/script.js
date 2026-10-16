async function loadGadgets() {
    const status = document.getElementById("status");
    const gadgetList = document.getElementById("gadget-list");

    try {
        const response = await fetch("/api/gadgets");

        if (!response.ok) {
            throw new Error("Could not retrieve gadgets");
        }

        const gadgets = await response.json();

        status.textContent = `${gadgets.length} gadget(s) found`;

        gadgetList.replaceChildren();

        gadgets.forEach((gadget) => {
            const card = document.createElement("article");
            card.className = "gadget";

            const name = document.createElement("h3");
            name.textContent = gadget.name;

            const category = document.createElement("p");
            category.textContent = `Category: ${gadget.category}`;

            const price = document.createElement("p");
            price.className = "price";
            price.textContent = `Price: $${Number(gadget.price).toFixed(2)}`;

            card.append(name, category, price);
            gadgetList.appendChild(card);
        });
    } catch (error) {
        status.textContent =
            "Unable to load gadgets. Check that the backend is running.";

        console.error(error);
    }
}

loadGadgets();