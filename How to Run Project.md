# Rent Management System

A full-stack application for managing rental properties, tenants, and payments.

## Features

- User authentication (Admin, Landlord, Tenant)
- Property management
- Maintenance request tracking
- Invoice generation
- Payment processing
- Notifications

## Tech Stack

### Frontend
- React 19
- TypeScript
- React Router v7
- React Bootstrap
- Axios

### Backend
- Node.js
- Express
- MySQL
- JSON Web Tokens (JWT)

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- MySQL

### Backend Setup
1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure your database in `server/config/db.js`

4. Initialize the database:
   ```
   node utils/init-db.js
   ```

5. Start the server:
   ```
   npm start
   ```

### Frontend Setup
1. Navigate to the client directory:
   ```
   cd client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the client:
   ```
   npm start
   ```

## Environment Variables

Create a `.env` file in the server directory with the following variables:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=rent_management
JWT_SECRET=your_jwt_secret
PORT=5000
```

## Project Structure

The project is organized into two main directories:
- `client/` - React frontend with TypeScript
- `server/` - Node.js/Express backend

## Features

- **User Management**
  - Registration/Login with JWT authentication
  - Role-based access control (tenant, landlord, admin)
  - Profile management

- **Property Management**
  - Property listings
  - Tenant-property assignments
  - Lease management

- **Invoice & Payment**
  - Monthly invoice generation
  - M-Pesa payment integration
  - Receipt generation

- **Maintenance Requests**
  - Request creation and tracking
  - Status updates
  - Comments

- **Notifications**
  - In-app notifications
  - Email/SMS alerts

- **Dashboard & Analytics**
  - Landlord dashboard
  - Tenant dashboard

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Authentication**: JWT, bcrypt
- **Frontend**: React.js with TypeScript
- **UI Framework**: Bootstrap, React Bootstrap

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- npm or yarn

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/rent-management-system.git
cd rent-management-system
```

2. **Install all dependencies (root, server, and client)**

```bash
npm run install-all
```

Alternatively, you can install dependencies separately:

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

3. **Database Configuration**

The database configuration is hardcoded in the application:
- Host: localhost
- User: root
- Password: pass123
- Database: rent_management

Make sure your MySQL server is running and accessible with these credentials.

4. **Initialize the database**

```bash
npm run init-db
```

## Running the Application

1. **Development mode (with hot reloading)**

```bash
# Run backend and frontend concurrently
npm run dev

# Run backend only
npm run server

# Run frontend only
npm run client
```

2. **Production mode**

```bash
# Build the React frontend
cd client
npm run build
cd ..

# Start the server
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/logout` - Logout user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password

### Properties
- `GET /api/properties` - Get all properties
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create new property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property
- `GET /api/properties/landlord/:id` - Get properties by landlord
- `POST /api/properties/:id/assign` - Assign tenant to property

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get single invoice
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/tenant/:id` - Get invoices by tenant
- `GET /api/invoices/property/:id` - Get invoices by property
- `POST /api/invoices/generate-monthly` - Generate monthly invoices

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get single payment
- `POST /api/payments` - Create new payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment
- `GET /api/payments/invoice/:id` - Get payments by invoice
- `GET /api/payments/:id/receipt` - Generate receipt for payment
- `POST /api/payments/mpesa/initiate` - Initiate M-Pesa payment
- `POST /api/payments/mpesa/callback` - M-Pesa callback

### Maintenance
- `GET /api/maintenance` - Get all maintenance requests
- `GET /api/maintenance/:id` - Get single maintenance request
- `POST /api/maintenance` - Create new maintenance request
- `PUT /api/maintenance/:id` - Update maintenance request
- `DELETE /api/maintenance/:id` - Delete maintenance request
- `POST /api/maintenance/:id/comments` - Add comment to maintenance request
- `GET /api/maintenance/:id/comments` - Get comments for maintenance request

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread/count` - Get unread notification count
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read/all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications` - Create notification (admin only)
- `POST /api/notifications/email` - Send email notification (admin only)
- `POST /api/notifications/sms` - Send SMS notification (admin only)

## Default Admin User

- **Email**: admin@rentmanagement.com
- **Password**: admin123

## License

MIT 
