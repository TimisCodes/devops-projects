
CREATE TABLE IF NOT EXISTS gadgets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);
<!-- Create a table to store gadget images with a foreign key reference to the gadgets table. -->

CREATE TABLE IF NOT EXISTS gadget_images (
    id SERIAL PRIMARY KEY,
    gadget_id INTEGER NOT NULL
        REFERENCES gadgets(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO gadgets (name, category, price)
SELECT seed.name, seed.category, seed.price
FROM (
    VALUES
        ('iPhone 16', 'Smartphone', 799.99::NUMERIC),
        ('MacBook Air', 'Laptop', 1099.99::NUMERIC),
        ('Samsung Galaxy Tab', 'Tablet', 499.99::NUMERIC),
        ('Sony WH-1000XM5', 'Headphones', 349.99::NUMERIC)
) AS seed(name, category, price)
WHERE NOT EXISTS (
    SELECT 1 FROM gadgets WHERE gadgets.name = seed.name
);
