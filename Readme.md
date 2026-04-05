# 🛒 PayKart – Full Stack E-Commerce Platform

PayKart is a full-stack e-commerce web application built with modern technologies, featuring secure authentication, product management, cart functionality, and seamless user experience.

---

## 🚀 Live Demo

* 🌐 Frontend: [https://your-vercel-app.vercel.app](https://pay-kart-frontend-y6zo.vercel.app/)
* 🔗 Backend API: https://paykart-backend-1.onrender.com

---

## 🧰 Tech Stack

### Frontend

* React.js (Vite)
* Tailwind CSS
* Axios
* React Router

### Backend

* Node.js
* Express.js
* MongoDB (Atlas)
* JWT Authentication
* Cloudinary (for image upload)

### Deployment

* Frontend: Vercel
* Backend: Render

---

## ✨ Features

* 🔐 User Authentication (JWT-based)
* 🔑 Access & Refresh Token System
* 🛍️ Product Listing & Details
* 🛒 Add to Cart Functionality
* 👤 User Profile Management
* ☁️ Image Upload using Cloudinary
* 🌍 Fully Responsive UI
* 🔄 Secure API Communication

---

## 🔐 Environment Variables

### Backend (`.env`)

```
PORT=7000
MONGODB_URI=your_mongodb_uri
ACCESS_TOKEN_SECRET=your_access_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRY=10d
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

---

### Frontend (`.env`)

```
VITE_API_URL=https://paykart-backend-1.onrender.com
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```
git clone https://github.com/your-username/paykart.git
cd paykart
```

---

### 2️⃣ Setup Backend

```
cd backend
npm install
npm run dev
```

---

### 3️⃣ Setup Frontend

```
cd frontend
npm install
npm run dev
```

---

## 🔄 API Base URL

```
https://paykart-backend-1.onrender.com/api/v1
```

---

## 📦 Folder Structure

```
PayKart/
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middlewares/
│   ├── utils/
│   └── app.js
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── App.jsx
```

---

## 🛡️ Security Practices

* Sensitive data stored in `.env`
* JWT-based authentication
* Protected routes using middleware
* CORS configured for secure communication

---

---

## 📈 Future Improvements

* 💳 Payment Gateway Integration (Stripe/Razorpay)
* 📦 Order Management System
* ⭐ Product Reviews & Ratings
* 🔍 Advanced Search & Filters

---

## 👨‍💻 Author

**Anand Patidar**

* GitHub: [https://github.com/your-username](https://github.com/Anand-Patidar03)
* LinkedIn: [https://linkedin.com/in/your-profile](https://www.linkedin.com/in/anand-patidar-aa7424307/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BytXBilE9TPOYFdJBEQlOWA%3D%3D)

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!

---
