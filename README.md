# WhatsApp Clone

A full-stack WhatsApp clone built with React, Node.js, Express, MongoDB, and Socket.IO. Features real-time chat, image/file attachments, online status, typing indicators, message seen status, user authentication, profile management, and a modern WhatsApp Web-like UI. Mobile responsive and ready for deployment.

---

## 🚀 Features
- Real-time 1-to-1 chat (Socket.IO)
- Online/offline status
- Typing indicator (three dots)
- Message seen/delivered status
- Image and file attachments
- User authentication (JWT)
- Profile management (avatar, name)
- Responsive WhatsApp Web-like UI (Material UI)
- Session management and secure routes

---

## 🛠️ Tech Stack
- **Frontend:** React, Material UI, Socket.IO-client, Axios
- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.IO, Multer
- **Authentication:** JWT

---

## 📦 Project Structure
```
whatsapp-clone/
  client/   # React frontend
  server/   # Node.js backend
```

---

## ⚙️ Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/whatsapp-clone.git
cd whatsapp-clone
```

### 2. Backend Setup
```bash
cd server
npm install
```
- Create a `.env` file in `server/`:
  ```
  MONGO_URI=mongodb://localhost:27017/whatsapp-clone
  JWT_SECRET=your_jwt_secret_here
  PORT=5000
  ```
- Start MongoDB (locally or use MongoDB Atlas)
- Start the backend:
  ```bash
  npm run dev
  # or
  npm start
  ```

### 3. Frontend Setup
```bash
cd ../client
npm install
```
- Create a `.env` file in `client/`:
  ```
  VITE_BACKEND_URL=http://localhost:5000
  ```
- Start the frontend:
  ```bash
  npm run start
  ```
- Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌐 Environment Variables
- **Backend (`server/.env`)**
  - `MONGO_URI` - MongoDB connection string
  - `JWT_SECRET` - Secret for JWT tokens
  - `PORT` - Backend port (default: 5000)
- **Frontend (`client/.env`)**
  - `VITE_BACKEND_URL` - URL of your backend API (e.g., `http://localhost:5000` or your production URL)

---

## 📸 Screenshots
_Add screenshots here to showcase the UI_

---

## 📄 License
This project is licensed under the MIT License.
