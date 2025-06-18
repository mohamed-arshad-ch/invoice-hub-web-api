# Invoice Hub API Documentation

This document provides comprehensive documentation for all the APIs created for the Invoice Hub project. All APIs use JWT (JSON Web Tokens) for authentication and POST requests with request bodies instead of slug-based parameters for better compatibility with Vercel deployment.

## Database Configuration

The project uses Neon PostgreSQL database with the following connection:
```
postgres://neondb_owner:npg_epBG9mqRuiV7@ep-jolly-brook-ab5fd13n-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

## JWT Authentication System

### Overview
The application uses JWT (JSON Web Tokens) for authentication instead of session cookies. This provides:
- **Scalability**: Stateless authentication
- **Security**: Tokens are signed and can be verified
- **Flexibility**: Easy to use across different platforms and devices
- **Role-based Access**: Support for admin, staff, and client roles

### Environment Variables Required
```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long-and-complex
NODE_ENV=production
```

### Authentication Flow
1. **Login**: User provides credentials to `/api/auth/login`
2. **Token Issued**: Server returns JWT token on successful authentication
3. **Token Storage**: Client stores token in localStorage
4. **API Requests**: Include token in Authorization header: `Bearer <token>`
5. **Token Validation**: Server validates token on each request
6. **Token Refresh**: Use `/api/auth/refresh` to get new token before expiration

### Role-Based Access Control
- **Admin**: Full access to all endpoints
- **Staff**: Limited access to staff-related endpoints
- **Client**: Access only to their own data

### Using the API Client Utility
```javascript
import { apiGet, apiPost, setAuthToken, logout } from '@/lib/api-client'

// After login, store the token
setAuthToken(loginResponse.token)

// Make authenticated requests
const response = await apiGet('/api/dashboard')
const createResponse = await apiPost('/api/clients', clientData)

// Logout
await logout()
```

## Authentication APIs

**Note:** All APIs use JWT (JSON Web Tokens) for authentication. After login, include the token in the Authorization header as `Bearer <token>` for protected endpoints.

### 1. User Registration
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "Password123!",
  "companyName": "Example Corp",
  "role": "admin" // "admin", "staff", or "client"
}
```

**Response:**
```json
{
  "success": true,
  "role": "admin",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "role": "admin",
    "firstName": "John",
    "lastName": "Doe",
    "companyName": "Example Corp"
  }
}
```

### 2. User Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "admin",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "role": "admin",
    "firstName": "John",
    "lastName": "Doe",
    "client_id": null,
    "staff_id": null
  }
}
```

### 3. User Logout
**Endpoint:** `POST /api/auth/logout`

**Headers:** `Authorization: Bearer <token>`

**Request Body:** `{}` (empty)

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully. Please remove token from client storage."
}
```

### 4. Get User Session
**Endpoint:** `GET /api/auth/session`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "userId": 1,
    "email": "john@example.com",
    "role": "admin",
    "firstName": "John",
    "lastName": "Doe",
    "client_id": null,
    "staff_id": null
  }
}
```

### 5. Refresh Token
**Endpoint:** `POST /api/auth/refresh`

**Headers:** `Authorization: Bearer <token>`

**Request Body:** `{}` (empty)

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Token refreshed successfully"
}
```

### 6. Change Password
**Endpoint:** `POST /api/auth/change-password`

**Request Body:**
```json
{
  "email": "john@example.com",
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

## Client APIs

### 1. Get All Clients
**Endpoint:** `GET /api/clients`

**Headers:** `Authorization: Bearer <token>`

**Role Access:** Admin, Staff

**Response:**
```json
{
  "success": true,
  "clients": [
    {
      "id": 1,
      "client_id": "CLT-1234",
      "business_name": "Client Corp",
      "contact_person": "Jane Smith",
      "email": "jane@clientcorp.com",
      "phone": "+1234567890",
      "total_spent": 5000.00,
      "status": true
    }
  ]
}
```

### 2. Create Client
**Endpoint:** `POST /api/clients`

**Headers:** `Authorization: Bearer <token>`

**Role Access:** Admin only

**Request Body:**
```json
{
  "businessName": "New Client Corp",
  "contactPerson": "John Client",
  "email": "john@newclient.com",
  "phone": "+1234567890",
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zip": "10001",
  "paymentSchedule": "monthly",
  "paymentTerms": "net30",
  "status": true,
  "notes": "Important client"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Client created successfully",
  "clientId": 1
}
```

### 3. Get Client by ID
**Endpoint:** `POST /api/clients/get-by-id`

**Headers:** `Authorization: Bearer <token>`

**Role Access:** Admin, Staff, Client (own data only)

**Request Body:**
```json
{
  "id": 1
}
```

**Response:**
```json
{
  "success": true,
  "client": {
    "id": 1,
    "client_id": "CLT-1234",
    "business_name": "Client Corp",
    // ... other client fields
  }
}
```

### 4. Update Client
**Endpoint:** `POST /api/clients/update`

**Headers:** `Authorization: Bearer <token>`

**Role Access:** Admin only

**Request Body:**
```json
{
  "id": 1,
  "businessName": "Updated Client Corp",
  "contactPerson": "John Updated",
  // ... other fields to update
}
```

**Response:**
```json
{
  "success": true,
  "message": "Client updated successfully"
}
```

### 5. Delete Client
**Endpoint:** `POST /api/clients/delete`

**Request Body:**
```json
{
  "id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Client deleted successfully"
}
```

### 6. Create Client Portal Access
**Endpoint:** `POST /api/clients/create-portal-access`

**Request Body:**
```json
{
  "clientId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Portal access activated successfully. The default password is 'Mcodev@123'. Please advise the user to change it upon first login.",
  "password": "Mcodev@123"
}
```

### 7. Get Client Transactions
**Endpoint:** `POST /api/clients/transactions`

**Request Body:**
```json
{
  "clientId": 1
}
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": 1,
      "transactionId": "INV-2024-1234",
      "date": "2024-01-15",
      "dueDate": "2024-02-15",
      "amount": 1000.00,
      "status": "paid",
      "description": "Service",
      "referenceNumber": "REF-001"
    }
  ]
}
```

## Staff APIs

### 1. Get All Staff
**Endpoint:** `GET /api/staff`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Staff",
      "email": "john@company.com",
      "position": "Developer",
      "role": "support",
      "status": "active",
      "payment_rate": 50.00,
      "join_date": "2024-01-01"
    }
  ]
}
```

### 2. Create Staff
**Endpoint:** `POST /api/staff`

**Request Body:**
```json
{
  "name": "Jane Staff",
  "email": "jane@company.com",
  "position": "Designer",
  "role": "support",
  "status": "active",
  "paymentRate": 45.00,
  "joinDate": "2024-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Jane Staff",
    // ... other staff fields
  }
}
```

### 3. Get Staff by ID
**Endpoint:** `POST /api/staff/get-by-id`

**Request Body:**
```json
{
  "id": 1
}
```

### 4. Update Staff
**Endpoint:** `POST /api/staff/update`

**Request Body:**
```json
{
  "id": 1,
  "name": "John Updated",
  "email": "john.updated@company.com",
  // ... other fields
}
```

### 5. Delete Staff
**Endpoint:** `POST /api/staff/delete`

**Request Body:**
```json
{
  "id": 1
}
```

### 6. Search Staff
**Endpoint:** `POST /api/staff/search`

**Request Body:**
```json
{
  "query": "john"
}
```

### 7. Filter Staff
**Endpoint:** `POST /api/staff/filter`

**Request Body:**
```json
{
  "roleFilter": "support",
  "statusFilter": "active"
}
```

### 8. Create Staff Portal Access
**Endpoint:** `POST /api/staff/create-portal-access`

**Request Body:**
```json
{
  "staffId": 1
}
```

## Staff Payments APIs

### 1. Staff Payment Operations
**Endpoint:** `POST /api/staff/payments`

**Request Body for Get Payments:**
```json
{
  "staffId": 1,
  "action": "get-payments"
}
```

**Request Body for Get Total Paid:**
```json
{
  "staffId": 1,
  "action": "get-total-paid"
}
```

**Request Body for Get Stats:**
```json
{
  "staffId": 1,
  "action": "get-stats"
}
```

**Request Body for Record Payment:**
```json
{
  "staffId": 1,
  "action": "record-payment",
  "amount": 1000.00,
  "datePaid": "2024-01-15",
  "notes": "Monthly salary"
}
```

### 2. Delete Staff Payment
**Endpoint:** `POST /api/staff/payments/delete`

**Request Body:**
```json
{
  "paymentId": 1
}
```

## Transaction APIs

### 1. Get All Transactions
**Endpoint:** `GET /api/transactions`

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": 1,
      "transactionId": "INV-2024-1234",
      "clientId": 1,
      "clientName": "Client Corp",
      "transactionDate": "2024-01-15",
      "dueDate": "2024-02-15",
      "status": "paid",
      "totalAmount": 1000.00,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### 2. Create Transaction
**Endpoint:** `POST /api/transactions`

**Request Body:**
```json
{
  "clientId": 1,
  "transactionDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "referenceNumber": "REF-001",
  "notes": "Service invoice",
  "terms": "Net 30",
  "paymentMethod": "bank_transfer",
  "status": "pending",
  "subtotal": 900.00,
  "taxAmount": 100.00,
  "totalAmount": 1000.00,
  "lineItems": [
    {
      "productId": 1,
      "description": "Web Development Service",
      "quantity": 1,
      "unitPrice": 900.00,
      "taxRate": 10.00,
      "total": 1000.00
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "INV-2024-1234",
  "message": "Transaction created successfully"
}
```

### 3. Get Transaction by ID
**Endpoint:** `POST /api/transactions/get-by-id`

**Request Body:**
```json
{
  "transactionId": "INV-2024-1234"
}
```

### 4. Update Transaction
**Endpoint:** `POST /api/transactions/update`

**Request Body:**
```json
{
  "transactionId": "INV-2024-1234",
  "clientId": 1,
  "transactionDate": "2024-01-15",
  // ... other fields to update
  "lineItems": [
    // ... updated line items
  ]
}
```

### 5. Delete Transaction
**Endpoint:** `POST /api/transactions/delete`

**Request Body:**
```json
{
  "transactionId": "INV-2024-1234"
}
```

### 6. Transaction Payment Management
**Endpoint:** `POST /api/transactions/payments`

**Description:** Comprehensive payment management system for transactions. This API handles recording, updating, retrieving, and deleting payments for transactions. It automatically manages transaction status updates, creates corresponding ledger entries, and maintains payment history.

---

#### 6.1 Get Payments for Transaction
**Action:** `get-payments`

**Description:** Retrieves all payments associated with a specific transaction, including payment summary and remaining balance calculations.

**Request Body:**
```json
{
  "action": "get-payments",
  "transactionId": "INV-2024-1234"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "payments": [
      {
        "id": 4,
        "transaction_id": 65,
        "amount": 1000,
        "payment_date": "2025-06-17",
        "payment_method": "UPI",
        "reference_number": "UPI-REF-123456",
        "notes": "First installment payment",
        "created_by": 9,
        "created_at": "2025-06-18T06:30:30.728Z",
        "updated_at": "2025-06-18T06:30:30.728Z"
      },
      {
        "id": 3,
        "transaction_id": 65,
        "amount": 1000,
        "payment_date": "2025-06-17",
        "payment_method": "UPI",
        "reference_number": "UPI-REF-789012",
        "notes": "Second installment payment",
        "created_by": 9,
        "created_at": "2025-06-18T06:22:01.677Z",
        "updated_at": "2025-06-18T06:22:01.677Z"
      }
    ],
    "totalPaid": 2000,
    "remainingAmount": 2000,
    "transactionTotal": 4000
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Transaction not found"
}
```

---

#### 6.2 Record Payment
**Action:** `record-payment`

**Description:** Records a new payment against a transaction. Automatically updates transaction status based on payment amount, creates ledger entries, and handles partial/full payment logic.

**Request Body:**
```json
{
  "action": "record-payment",
  "transactionId": "INV-2024-1234",
  "amount": 2000.00,
  "paymentDate": "2024-01-20",
  "paymentMethod": "UPI",
  "referenceNumber": "UPI-REF-123456",
  "notes": "Partial payment received via UPI"
}
```

**Field Descriptions:**
- `transactionId` (string, required): Transaction identifier
- `amount` (number, required): Payment amount (must be > 0)
- `paymentDate` (string, required): Payment date in YYYY-MM-DD format
- `paymentMethod` (string, optional): Payment method (see supported methods below)
- `referenceNumber` (string, optional): External reference number
- `notes` (string, optional): Additional notes about the payment

**Success Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Payment recorded successfully",
    "payment": {
      "id": 5,
      "transaction_id": 65,
      "amount": 2000.00,
      "payment_date": "2024-01-20",
      "payment_method": "UPI",
      "reference_number": "UPI-REF-123456",
      "notes": "Partial payment received via UPI",
      "created_by": 9,
      "created_at": "2024-01-20T10:30:00Z",
      "updated_at": "2024-01-20T10:30:00Z"
    },
    "ledgerEntry": {
      "id": 15,
      "entry_date": "2024-01-20",
      "entry_type": "income",
      "amount": 2000.00,
      "description": "Payment received for INV-2024-1234 via UPI",
      "reference_id": "TXN-PAY-5",
      "reference_type": "transaction_payment",
      "created_by": 9,
      "created_at": "2024-01-20T10:30:00Z"
    },
    "transactionUpdate": {
      "previousStatus": "pending",
      "newStatus": "partial",
      "totalPaid": 2000.00,
      "remainingAmount": 2000.00,
      "transactionTotal": 4000.00
    }
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "data": {
    "success": false,
    "error": "Payment amount exceeds remaining balance"
  }
}
```

```json
{
  "success": false,
  "data": {
    "success": false,
    "error": "Transaction not found or not in pending/partial status"
  }
}
```

---

#### 6.3 Update Payment
**Action:** `update-payment`

**Description:** Updates an existing payment record. Recalculates transaction totals and updates ledger entries accordingly.

**Request Body:**
```json
{
  "action": "update-payment",
  "paymentId": 5,
  "amount": 2500.00,
  "paymentDate": "2024-01-20",
  "paymentMethod": "bank_transfer",
  "referenceNumber": "BANK-TXN-789012",
  "notes": "Updated payment method and amount"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Payment updated successfully",
    "payment": {
      "id": 5,
      "transaction_id": 65,
      "amount": 2500.00,
      "payment_date": "2024-01-20",
      "payment_method": "bank_transfer",
      "reference_number": "BANK-TXN-789012",
      "notes": "Updated payment method and amount",
      "created_by": 9,
      "updated_at": "2024-01-20T15:45:00Z"
    },
    "transactionUpdate": {
      "status": "partial",
      "totalPaid": 2500.00,
      "remainingAmount": 1500.00,
      "transactionTotal": 4000.00
    }
  }
}
```

---

#### 6.4 Delete Payment
**Action:** `delete-payment`

**Description:** Deletes a payment record and removes associated ledger entries. Recalculates transaction status and totals.

**Request Body:**
```json
{
  "action": "delete-payment",
  "paymentId": 5
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Payment deleted successfully",
    "transactionUpdate": {
      "transactionId": "INV-2024-1234",
      "previousStatus": "partial",
      "newStatus": "pending",
      "totalPaid": 0.00,
      "remainingAmount": 4000.00,
      "transactionTotal": 4000.00
    },
    "ledgerEntryRemoved": true
  }
}
```

---

#### 6.5 Get Payment Summary
**Action:** `get-payment-summary`

**Description:** Retrieves a comprehensive summary of all payments for a transaction, including payment statistics and status information.

**Request Body:**
```json
{
  "action": "get-payment-summary",
  "transactionId": "INV-2024-1234"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "summary": {
      "transactionId": "INV-2024-1234",
      "transactionTotal": 4000.00,
      "totalPaid": 3000.00,
      "remainingAmount": 1000.00,
      "paymentCount": 3,
      "status": "partial",
      "firstPaymentDate": "2024-01-15",
      "lastPaymentDate": "2024-01-25",
      "averagePaymentAmount": 1000.00,
      "paymentMethods": [
        {
          "method": "UPI",
          "count": 2,
          "totalAmount": 2000.00
        },
        {
          "method": "bank_transfer",
          "count": 1,
          "totalAmount": 1000.00
        }
      ],
      "recentPayments": [
        {
          "id": 7,
          "amount": 1000.00,
          "payment_date": "2024-01-25",
          "payment_method": "bank_transfer",
          "reference_number": "BANK-789"
        },
        {
          "id": 6,
          "amount": 1000.00,
          "payment_date": "2024-01-20",
          "payment_method": "UPI",
          "reference_number": "UPI-456"
        }
      ]
    }
  }
}
```

---

#### 6.6 Bulk Payment Operations
**Action:** `bulk-operations`

**Description:** Perform multiple payment operations in a single request for efficiency.

**Request Body:**
```json
{
  "action": "bulk-operations",
  "operations": [
    {
      "type": "record-payment",
      "transactionId": "INV-2024-1234",
      "amount": 1000.00,
      "paymentDate": "2024-01-20",
      "paymentMethod": "cash"
    },
    {
      "type": "record-payment",
      "transactionId": "INV-2024-1235",
      "amount": 2000.00,
      "paymentDate": "2024-01-20",
      "paymentMethod": "UPI"
    }
  ]
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "results": [
      {
        "operation": 1,
        "success": true,
        "paymentId": 8,
        "transactionId": "INV-2024-1234"
      },
      {
        "operation": 2,
        "success": true,
        "paymentId": 9,
        "transactionId": "INV-2024-1235"
      }
    ],
    "summary": {
      "totalOperations": 2,
      "successful": 2,
      "failed": 0,
      "totalAmount": 3000.00
    }
  }
}
```

---

#### Payment Status Transitions

**Automatic Status Updates:**
- `pending` → `partial` (when first payment < total amount)
- `pending` → `paid` (when payment = total amount)
- `partial` → `paid` (when total payments = total amount)
- `partial` → `pending` (when all payments are deleted)
- `paid` → `partial` (when payment is deleted and remaining payments < total)

---

#### Supported Payment Methods

| Method | Code | Description |
|--------|------|-------------|
| Cash | `cash` | Physical cash payment |
| Credit Card | `credit_card` | Credit card payment |
| Debit Card | `debit_card` | Debit card payment |
| Bank Transfer | `bank_transfer` | Direct bank transfer |
| UPI | `UPI` | Unified Payments Interface |
| Cheque | `cheque` | Cheque payment |
| Online Payment | `online_payment` | Generic online payment |
| Wire Transfer | `wire_transfer` | Wire transfer |
| Mobile Payment | `mobile_payment` | Mobile wallet payment |
| Other | `other` | Other payment methods |

---

#### Business Logic & Validation Rules

1. **Payment Amount Validation:**
   - Must be greater than 0
   - Cannot exceed remaining transaction amount
   - Supports decimal precision up to 2 places

2. **Payment Date Validation:**
   - Cannot be future dated beyond current date
   - Must be in valid date format (YYYY-MM-DD)

3. **Transaction Status Logic:**
   - Payments can only be recorded for `pending` or `partial` transactions
   - `paid` transactions cannot receive additional payments
   - `cancelled` transactions cannot receive payments

4. **Ledger Integration:**
   - Every payment automatically creates an income ledger entry
   - Ledger entries are linked to payments via reference_id
   - Deleting payments removes corresponding ledger entries

5. **Concurrency Handling:**
   - Database transactions ensure data consistency
   - Prevents duplicate payments during concurrent operations

---

#### Error Codes & Messages

| Code | Message | Description |
|------|---------|-------------|
| 400 | Invalid payment amount | Amount is 0, negative, or exceeds remaining balance |
| 404 | Transaction not found | Transaction ID doesn't exist |
| 403 | Payment not allowed | Transaction status doesn't allow payments |
| 409 | Duplicate payment | Payment with same reference already exists |
| 422 | Validation failed | Required fields missing or invalid format |
| 500 | Database error | Internal server error during payment processing |

**Transaction Status Updates:**
- `pending` → `partial` (when first payment is recorded)
- `partial` → `paid` (when total payments equal transaction amount)
- `partial` → `pending` (when all payments are deleted)

**Note:** Recording a payment automatically:
1. Creates a ledger entry with type "income"
2. Updates the transaction status based on payment completion
3. Validates that payment amount doesn't exceed remaining balance
4. Ensures data consistency through database transactions

## Ledger APIs

### 1. Ledger Operations
**Endpoint:** `POST /api/ledger`

**Request Body for Get Entries:**
```json
{
  "action": "get-entries",
  "year": 2024,
  "month": 1,
  "clientId": 1,
  "staffId": null
}
```

**Request Body for Monthly Summary:**
```json
{
  "action": "get-summary-by-month",
  "year": 2024
}
```

**Request Body for Current Month Summary:**
```json
{
  "action": "get-current-month-summary"
}
```

**Request Body for Yearly Summary:**
```json
{
  "action": "get-yearly-summary"
}
```

**Request Body for Add Entry:**
```json
{
  "action": "add-entry",
  "entry_date": "2024-01-15",
  "entry_type": "income",
  "amount": 1000.00,
  "description": "Payment received",
  "reference_id": "INV-2024-1234",
  "reference_type": "client_transaction",
  "client_id": 1,
  "staff_id": null
}
```

## Error Responses

All APIs return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

## Authentication

All APIs except registration and login require authentication. The authentication is handled via HTTP-only cookies set during login. The session includes:

- `userId`: The authenticated user's ID
- `role`: User's role (admin, staff, client)
- `expires`: Session expiration timestamp

## Database Schema Requirements

The APIs expect the following database tables:

1. **users** - User authentication and profiles
2. **clients** - Client information
3. **staff** - Staff member information
4. **transactions** - Invoice/transaction records
5. **transaction_items** - Line items for transactions
6. **staff_payments** - Staff payment records
7. **ledger** - Financial ledger entries
8. **products** - Product/service catalog

## Usage Examples

### Creating a Complete Invoice Flow

1. **Create Client:**
```bash
curl -X POST /api/clients \
  -H "Content-Type: application/json" \
  -d '{"businessName": "ABC Corp", "contactPerson": "John Doe", "email": "john@abc.com", "phone": "+1234567890"}'
```

2. **Create Transaction:**
```bash
curl -X POST /api/transactions \
  -H "Content-Type: application/json" \
  -d '{"clientId": 1, "transactionDate": "2024-01-15", "dueDate": "2024-02-15", "lineItems": [{"description": "Service", "quantity": 1, "unitPrice": 1000, "total": 1000}]}'
```

3. **Check Ledger:**
```bash
curl -X POST /api/ledger \
  -H "Content-Type: application/json" \
  -d '{"action": "get-entries", "year": 2024}'
```

## Product Management APIs

### 1. Get All Products
**Endpoint:** `GET /api/products`

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "name": "Web Development Service",
      "description": "Full-stack web development",
      "category": "service",
      "price": 5000,
      "taxRate": 0.1,
      "status": "active",
      "created_by": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Create Product or Perform Operations
**Endpoint:** `POST /api/products`

**Request Body for Create Product:**
```json
{
  "action": "create",
  "name": "Web Development Service",
  "description": "Full-stack web development",
  "category": "service",
  "price": 5000,
  "taxRate": 0.1,
  "status": "active"
}
```

**Request Body for Search Products:**
```json
{
  "action": "search",
  "query": "web development"
}
```

**Request Body for Filter Products:**
```json
{
  "action": "filter",
  "categoryFilter": "service",
  "statusFilter": "active"
}
```

### 3. Get Product by ID
**Endpoint:** `POST /api/products/get-by-id`

**Request Body:**
```json
{
  "id": "1"
}
```

### 4. Update Product
**Endpoint:** `POST /api/products/update`

**Request Body:**
```json
{
  "id": "1",
  "name": "Updated Web Development Service",
  "description": "Updated full-stack web development",
  "category": "service",
  "price": 5500,
  "taxRate": 0.1,
  "status": "active"
}
```

### 5. Delete Product
**Endpoint:** `POST /api/products/delete`

**Request Body:**
```json
{
  "id": "1"
}
```

## Dashboard Statistics API

### 1. Get Dashboard Statistics
**Endpoint:** `GET /api/dashboard`

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalRevenue": 50000,
    "activeClientCount": 25,
    "pendingInvoiceCount": 5,
    "totalStaffCount": 10
  }
}
```

## Invoice Generation APIs

### 1. Generate Invoices
**Endpoint:** `POST /api/invoices`

**Request Body for Generate Single Invoice:**
```json
{
  "action": "generate-invoice",
  "transactionId": "TXN-123",
  "clientId": 1
}
```

**Request Body for Generate Weekly Invoice:**
```json
{
  "action": "generate-weekly-invoice",
  "clientId": 1,
  "startDate": "2024-01-01",
  "endDate": "2024-01-07"
}
```

**Response:**
```json
{
  "success": true,
  "pdfBase64": "base64-encoded-pdf-data",
  "fileName": "Invoice_TXN-123.pdf"
}
```

## API Summary

This comprehensive API structure provides full CRUD operations for all major entities in the Invoice Hub system while maintaining security through proper authentication and authorization.

### Complete API Endpoints List:

**Authentication APIs:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/session` - Get current session
- `POST /api/auth/change-password` - Change user password

**Client Management APIs:**
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create new client
- `POST /api/clients/get-by-id` - Get client by ID
- `POST /api/clients/update` - Update client
- `POST /api/clients/delete` - Delete client
- `POST /api/clients/create-portal-access` - Create client portal access
- `POST /api/clients/transactions` - Get client transactions

**Staff Management APIs:**
- `GET /api/staff` - Get all staff
- `POST /api/staff` - Create new staff
- `POST /api/staff/get-by-id` - Get staff by ID
- `POST /api/staff/update` - Update staff
- `POST /api/staff/delete` - Delete staff
- `POST /api/staff/search` - Search staff
- `POST /api/staff/filter` - Filter staff
- `POST /api/staff/create-portal-access` - Create staff portal access

**Staff Payment APIs:**
- `POST /api/staff/payments` - Staff payment operations
- `POST /api/staff/payments/delete` - Delete staff payment

**Transaction APIs:**
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create new transaction
- `POST /api/transactions/get-by-id` - Get transaction by ID
- `POST /api/transactions/update` - Update transaction
- `POST /api/transactions/delete` - Delete transaction
- `POST /api/transactions/payments` - Manage transaction payments (record/update/delete/get payments)

**Product Management APIs:**
- `GET /api/products` - Get all products
- `POST /api/products` - Create/search/filter products
- `POST /api/products/get-by-id` - Get product by ID
- `POST /api/products/update` - Update product
- `POST /api/products/delete` - Delete product

**Ledger APIs:**
- `POST /api/ledger` - Ledger operations

**Dashboard APIs:**
- `GET /api/dashboard` - Get dashboard statistics

**Invoice APIs:**
- `POST /api/invoices` - Generate invoices (single/weekly) 