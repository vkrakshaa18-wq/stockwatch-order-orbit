# Stockwatch Order Orbit

Build a Complete Stock Management System Web Application

Create a professional, modern, fully functional, responsive Stock Management System for a college project.

The application should have a clean admin dashboard with a navy blue, white, light grey and light blue colour theme.

1. Dashboard Design

Create a professional dashboard with:

Left sidebar navigation.

Top navigation bar.

Application logo and name: Stock Management System.

User profile and logout option.

Dashboard summary cards.

Data tables and charts.

Responsive layout for desktop, tablet and mobile.

Dashboard cards:

Total Products

Total Stock Quantity

Low Stock Products

Out of Stock Products

Total Orders

Total Sales

Display recent orders, recent inventory activities and stock overview charts.

2. User Authentication

Implement:

User registration.

User login.

Secure logout.

Password validation.

Protected dashboard.

Proper error and success messages.

Users should be redirected to the dashboard after successful login.

3. Product Management

Create a complete product management page.

Features:

Add new products.

View all products.

Edit product information.

Delete products.

Search products.

Filter by category.

Product details:

Product ID

Product Name

Category

Description

Price

Quantity

Supplier

Stock Status

4. Inventory Management

Implement:

Stock-in operations.

Stock-out operations.

Update stock quantity.

Track inventory changes.

Low-stock alerts.

Out-of-stock notifications.

Inventory transaction history.

Automatically update stock quantities whenever stock-in or stock-out operations occur.

5. Supplier Management

Create a supplier management page.

Features:

Add suppliers.

View suppliers.

Edit supplier details.

Delete suppliers.

Search suppliers.

Supplier details:

Supplier ID

Supplier Name

Contact Number

Email

Address

6. Order Management

Create an order management module.

Features:

Create new orders.

Select products.

Enter product quantities.

Calculate total price automatically.

View all orders.

Update order status.

Track pending, processing and completed orders.

Maintain order history.

Automatically reduce stock when an order is confirmed. Prevent orders when sufficient stock is unavailable.

7. Reports

Create a reports page containing:

Product inventory report.

Stock-in report.

Stock-out report.

Low-stock report.

Sales report.

Order report.

Include date filters and options to export reports as CSV or PDF.

8. Database and Backend

Use Supabase for:

PostgreSQL database.

User authentication.

Persistent data storage.

Backend operations.

Create appropriate database tables:

profiles

products

categories

suppliers

inventory_transactions

orders

order_items

Establish proper relationships between the tables.

Implement Row Level Security (RLS) policies to protect user data.

Do not use local storage or temporary mock data as the main database.

9. Technical Requirements

Frontend: React + TypeScript.

Styling: Tailwind CSS.

UI components: Modern reusable components.

Backend and database: Supabase.

Authentication: Supabase Authentication.

Use clean, modular and maintainable code.

Ensure proper frontend and backend integration.

10. Important Functional Requirements

This must be a fully functional web application, not just a visual prototype.

All buttons must work.

All forms must save data.

All CRUD operations must work.

Search and filtering must work.

Dashboard statistics must update automatically.

Data must remain saved after refreshing the page.

Authentication must work correctly.

Product, inventory and order modules must be connected.

Display proper validation and error messages.

Build the complete application with a polished, professional design suitable for a college project demonstration.

First complete the dashboard, authentication, database structure and product management. Then implement the remaining modules and test the complete application.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://stockwatch-order-orbit.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2f863e90-7a5d-51d5-a660-df1fb99be38f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
