CREATE TABLE IF NOT EXISTS gadgets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

INSERT INTO gadgets (name, category, price)
VALUES
    ('iPhone 16', 'Smartphone', 799.99),
    ('MacBook Air', 'Laptop', 1099.99),
    ('Samsung Galaxy Tab', 'Tablet', 499.99),
    ('Sony WH-1000XM5', 'Headphones', 349.99);