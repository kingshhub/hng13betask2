Country Currency & Exchange API

A RESTful API built with Node.js, TypeScript, Express, and TypeORM (MySQL) that caches country and exchange rate data from external sources, computes estimated GDP, and provides CRUD operations with filtering and sorting.

Stack

Runtime: Node.js

Language: TypeScript

Framework: Express.js

Database: MySQL

ORM: TypeORM

HTTP Client: Axios

Image Generation: Node-Canvas

Local Setup Instructions

Prerequisites

Node.js (LTS version recommended)

MySQL Server (Local or remote access)

1. Database Setup

Create a new MySQL database named country_cache_db (or whatever you define in your .env file). The tables (countries and status) will be automatically created by TypeORM upon application startup (synchronize: true).

2. Environment Variables

Create a file named .env in the project root based on the provided .env.example template, and fill in your database credentials:

# .env file content
PORT=3000

# Database Config (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=country_cache_db

# External API URLs
COUNTRIES_API_URL=[https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies](https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies)
EXCHANGE_RATE_API_URL=[https://open.er-api.com/v6/latest/USD](https://open.er-api.com/v6/latest/USD)


3. Installation and Run

Install dependencies:

npm install


Start the server in development mode (using ts-node and nodemon):

npm run dev


The server will start on http://localhost:3000 (or the port defined in .env).

API Documentation

The API uses application/json for all requests and responses.

1. Refresh Cache

Fetches data from external APIs, processes it, and updates the MySQL cache. Also generates cache/summary.png.

Endpoint

Method

Description

/countries/refresh

POST

Fetches, computes, and caches all country and exchange data.

Success Response: 200 OK

{ "message": "Country cache successfully refreshed and summary image generated." }


Error Response (External API Failure): 503 Service Unavailable

{ "error": "External data source unavailable", "details": "Could not fetch data from [API name]" }


2. Get Countries

Retrieves all cached countries with support for filtering and sorting.

Endpoint

Method

Description

/countries

GET

Get all countries from the cache.

Query Parameters:

Parameter

Example

Description

region

?region=Africa

Filters countries by region (case-insensitive partial match).

currency

?currency=NGN

Filters countries by currency code.

sort

?sort=gdp_desc

Sorts the result. Supports: gdp_asc, gdp_desc, name_asc, name_desc, population_asc, population_desc.

3. Get Single Country

Endpoint

Method

Description

/countries/:name

GET

Get one country by its full name (case-insensitive).

Error Response (Not Found): 404 Not Found

{ "error": "Country 'Atlantis' not found" }


4. Delete Country

Endpoint

Method

Description

/countries/:name

DELETE

Deletes a country record by name (case-insensitive).

5. Get Status

Endpoint

Method

Description

/status

GET

Shows the total number of cached countries and the last refresh timestamp.

Success Response: 200 OK

{
  "total_countries": 250,
  "last_refreshed_at": "2025-10-22T18:00:00.000Z"
}
