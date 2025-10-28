HNG Backend Task 2: Country Currency & Exchange API

A robust RESTful API built with Node.js, TypeScript, and Express, designed to fetch, process, cache, and serve global country data, currency exchange rates, and computed estimated GDP values.

The application adheres to a clean, layered architecture (Controller, Service, Entity) and uses TypeORM with MySQL for persistence.

 Stack and Technologies

Runtime: Node.js

Language: TypeScript

Framework: Express.js

Database: MySQL

ORM: TypeORM

HTTP Client: Axios

Image Generation: node-html-to-image (utilizes Puppeteer/Chromium)

Testing: Jest & Supertest

🛠️ Setup and Installation

Prerequisites

Node.js (v18+ recommended)

MySQL Server (accessible locally or remotely)

node-html-to-image Requirements: If you encounter installation issues (especially related to Puppeteer downloading Chromium), you may need to set the PUPPETEER_SKIP_DOWNLOAD environment variable to true and install a compatible headless browser executable manually on your system, though the current setup is designed to be highly portable.

1. Clone the Repository

git clone <YOUR_REPO_LINK>
cd <PROJECT_DIRECTORY>


2. Install Dependencies

npm install


3. Database Configuration

Create a file named .env in the project root directory based on the .env.example file.

# .env file example
PORT=3000

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=enter_mysql_password
DB_NAME=country_cache_db

# External API URLs (Defaults)
COUNTRIES_API_URL=[https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies](https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies)
EXCHANGE_RATE_API_URL=[https://open.er-api.com/v6/latest/USD](https://open.er-api.com/v6/latest/USD)


Note: The application uses TypeORM with synchronize: true for development, so the tables (countries and status) will be created automatically on the first run.

4. Running the Application

Command

Description

npm run dev

Start the server in watch mode (using nodemon and ts-node).

npm run start

Build the project to JavaScript (tsc) and run the production build (node dist/server.js).

npm test

Run all unit and integration tests using Jest.

📋 API Endpoints and Documentation

Endpoint

Method

Description

Notes

/status

GET

Get total countries and last refresh timestamp.



/countries/refresh

POST

CRITICAL: Fetch data, compute GDP, and cache all records.

Generates cache/summary.png.

/countries/image

GET

Serve the generated summary.png image.

Returns 404 if cache hasn't been refreshed.

/countries

GET

Get all cached countries.

Supports filters: ?region=..., ?currency=....

/countries

GET

Get all cached countries.

Supports sorting: ?sort=gdp_desc (or gdp_asc, name_asc/desc, population_asc/desc).

/countries/:name

GET

Get a single country by name (case-insensitive).

Returns 404 if not found.

/countries/:name

DELETE

Delete a country record by name.

Returns 404 if not found.

Response Formats

All errors follow a consistent JSON structure:

400 Bad Request: {"error": "Validation failed", "details": "..."}

404 Not Found: {"error": "Country not found"}

503 Service Unavailable: {"error": "External data source unavailable", "details": "..."}