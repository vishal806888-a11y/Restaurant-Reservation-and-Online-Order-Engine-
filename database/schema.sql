CREATE DATABASE IF NOT EXISTS restaurant_db;
USE restaurant_db;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  role ENUM('CUSTOMER','STAFF') NOT NULL DEFAULT 'CUSTOMER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  address VARCHAR(255),
  phone VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id INT PRIMARY KEY AUTO_INCREMENT,
  restaurant_id INT NOT NULL,
  table_number INT NOT NULL,
  capacity INT NOT NULL,
  status ENUM('AVAILABLE','MAINTENANCE') DEFAULT 'AVAILABLE',
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image VARCHAR(500),
  available BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS reservations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  restaurant_id INT NOT NULL,
  table_id INT NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  guests INT NOT NULL,
  status ENUM('PENDING','CONFIRMED','CANCELLED','COMPLETED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (table_id) REFERENCES restaurant_tables(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  restaurant_id INT NOT NULL,
  reservation_id INT NULL,

  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(150) NOT NULL,

  total_amount DECIMAL(10,2) NOT NULL,

  status ENUM(
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'COMPLETED',
    'CANCELLED'
  ) DEFAULT 'PENDING',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (reservation_id)
    REFERENCES reservations(id)
    ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

INSERT INTO restaurants (name,description,address,phone)
SELECT 'The Fork & Flame','Modern restaurant for dining, reservations and online ordering.','Chennai, Tamil Nadu','9876543210'
WHERE NOT EXISTS (SELECT 1 FROM restaurants);

INSERT IGNORE INTO categories (name) VALUES
('Starters'),('Main Course'),('Pizza'),('Burgers'),('Pasta'),('Desserts'),('Beverages');

INSERT INTO restaurant_tables (restaurant_id,table_number,capacity)
SELECT 1,1,2 WHERE NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE table_number=1);
INSERT INTO restaurant_tables (restaurant_id,table_number,capacity)
SELECT 1,2,2 WHERE NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE table_number=2);
INSERT INTO restaurant_tables (restaurant_id,table_number,capacity)
SELECT 1,3,4 WHERE NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE table_number=3);
INSERT INTO restaurant_tables (restaurant_id,table_number,capacity)
SELECT 1,4,4 WHERE NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE table_number=4);
INSERT INTO restaurant_tables (restaurant_id,table_number,capacity)
SELECT 1,5,6 WHERE NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE table_number=5);
INSERT INTO restaurant_tables (restaurant_id,table_number,capacity)
SELECT 1,6,6 WHERE NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE table_number=6);
INSERT INTO restaurant_tables (restaurant_id,table_number,capacity)
SELECT 1,7,8 WHERE NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE table_number=7);
INSERT INTO restaurant_tables (restaurant_id,table_number,capacity)
SELECT 1,8,10 WHERE NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE table_number=8);

INSERT INTO menu_items (category_id,name,description,price)
SELECT c.id,'Paneer Tikka','Grilled cottage cheese with spices',220 FROM categories c WHERE c.name='Starters'
AND NOT EXISTS (SELECT 1 FROM menu_items WHERE name='Paneer Tikka');
INSERT INTO menu_items (category_id,name,description,price)
SELECT c.id,'Chicken 65','Crispy spicy chicken starter',260 FROM categories c WHERE c.name='Starters'
AND NOT EXISTS (SELECT 1 FROM menu_items WHERE name='Chicken 65');
INSERT INTO menu_items (category_id,name,description,price)
SELECT c.id,'Butter Chicken','Creamy tomato chicken curry',320 FROM categories c WHERE c.name='Main Course'
AND NOT EXISTS (SELECT 1 FROM menu_items WHERE name='Butter Chicken');
INSERT INTO menu_items (category_id,name,description,price)
SELECT c.id,'Paneer Butter Masala','Rich creamy paneer curry',280 FROM categories c WHERE c.name='Main Course'
AND NOT EXISTS (SELECT 1 FROM menu_items WHERE name='Paneer Butter Masala');
INSERT INTO menu_items (category_id,name,description,price)
SELECT c.id,'Margherita Pizza','Classic tomato and mozzarella pizza',299 FROM categories c WHERE c.name='Pizza'
AND NOT EXISTS (SELECT 1 FROM menu_items WHERE name='Margherita Pizza');
INSERT INTO menu_items (category_id,name,description,price)
SELECT c.id,'Farmhouse Pizza','Loaded vegetable pizza',349 FROM categories c WHERE c.name='Pizza'
AND NOT EXISTS (SELECT 1 FROM menu_items WHERE name='Farmhouse Pizza');
INSERT INTO menu_items (category_id,name,description,price)
SELECT c.id,'Classic Burger','Crispy patty with fresh vegetables',249 FROM categories c WHERE c.name='Burgers'
AND NOT EXISTS (SELECT 1 FROM menu_items WHERE name='Classic Burger');
INSERT INTO menu_items (category_id,name,description,price)
SELECT c.id,'Penne Alfredo','Creamy white sauce pasta',279 FROM categories c WHERE c.name='Pasta'
AND NOT EXISTS (SELECT 1 FROM menu_items WHERE name='Penne Alfredo');
INSERT INTO menu_items (category_id,name,description,price)
SELECT c.id,'Chocolate Brownie','Warm chocolate brownie',159 FROM categories c WHERE c.name='Desserts'
AND NOT EXISTS (SELECT 1 FROM menu_items WHERE name='Chocolate Brownie');
INSERT INTO menu_items (category_id,name,description,price)
SELECT c.id,'Fresh Lime Soda','Refreshing lime drink',99 FROM categories c WHERE c.name='Beverages'
AND NOT EXISTS (SELECT 1 FROM menu_items WHERE name='Fresh Lime Soda');
