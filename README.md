# CampusSwap_Backend

How to run the backend

1. run this commnad in your root project directory: npm install

2. Configure your backend environment by creating a .env file

3. Make sure you are using the correct port and import our database file. or open campus_swap_project.sql inside the MySQL Workbench or XAMPP /phpMyAdmin and excute the script.

4. Start the backend API : npm start

it should show the listening on port 3000

Core API Endpoints:

For the users and authentication :

1.Authenticate user and issue session token - POST /api/auth/login

2.Create new student or service provider account - POST /api/auth/register

3.Fetch current logged-in user details- GET /api/users/profile

The Academia Marketplace:

1.Browse products - GET /api/products

2.List a textbook, tech gadget, or res item for sale/rent - POST /api/products

3.Checkout cart items and place an order - POST /api/orders

SafeHome Services:

1.Shows you the service provider you want by region - GET /api/services/providers

2.Request a quote - POST /api/services/quotes
