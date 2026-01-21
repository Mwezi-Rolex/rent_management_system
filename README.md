# Rent Management System (RMS)

A progressive web application tailored for the Kenyan rental market to streamline interactions between landlords and tenants. It replaces informal, manual record-keeping with a transparent digital ledger.

### Key Features
* **Automated Invoicing:** Landlords can generate and send monthly rent invoices directly to tenants via the platform.
* **M-Pesa Integration:** Seamless payment processing using the M-Pesa Daraja API, allowing tenants to pay via mobile money and automatically updating the system records.
* **Maintenance Requests:** Tenants can submit property maintenance reports, which landlords can review and update in real-time.
* **Financial Reports:** Auto-generated receipts and payment history logs to reduce disputes and enhance transparency.

### Technical Implementation
* **Architecture:** Object-Oriented Analysis and Design (OOAD) utilizing an Incremental Development Model for modular scalability.
* **Security:**
    * **JWT (JSON Web Tokens):** Implemented for secure, stateless user authentication.
    * **Bcrypt.js:** Used for hashing and salting user passwords to ensure data protection.
* **Backend Logic:** Built with Node.js and Express.js, adhering to RESTful API standards for efficient data exchange.

### Tech Stack
* **Frontend:** React.js
* **Backend:** Node.js, Express.js
* **Database:** MySQL with phpMyAdmin
* **Payments:** Safaricom M-Pesa Daraja API
* **Tools:** Visual Studio Code, Postman (API Testing)

### My Contribution
I focused on the Backend Development and Security Architecture:
* Implemented the M-Pesa API integration for handling STK Push transactions.
* Designed the MySQL database schema to handle complex relationships between Landlords, Tenants, and Properties.
* Developed the REST API endpoints for invoice generation and maintenance requests.
