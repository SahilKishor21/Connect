
# Live Chat Application

This is a real-time chat application that supports text and file messaging, allowing users to interact through private and group chats. The application allows users to send text messages, upload files (images, documents, etc.), and manage chat conversations. It utilizes **Node.js**, **Express**, **MongoDB**, **Mongoose**, and **Socket.io** for real-time communication and message storage.

## Features

- User authentication and authorization
- Real-time chat functionality (text and file messages)
- File upload (support for images, documents, etc.)
- Chat history with message population (sender, receiver, chat details)
- Latest message tracking in chat rooms
- Error handling for all operations
- Secure file upload and storage

## Tech Stack

- **Frontend**: React (with Tailwind CSS or other styling libraries)
- **Backend**: Node.js with Express
- **Database**: MongoDB (using Mongoose for schema modeling)
- **Real-time Communication**: Socket.io (for real-time messaging)
- **File Storage**: Multer (for handling file uploads)
- **Authentication**: JWT (JSON Web Tokens) for secure login

## Setup Instructions

### Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **MongoDB** (locally or through MongoDB Atlas)
- **npm** or **yarn**

### Clone the Repository

```bash
git clone https://github.com/yourusername/live-chat-app.git
cd live-chat-app
```

### Install Dependencies

Run the following command to install the necessary packages:

```bash
npm install
```

or if you prefer `yarn`:

```bash
yarn install
```

### Environment Variables

Create a `.env` file in the root of the project and add the following variables:

```bash
MONGO_URI=mongodb://localhost:27017/liveChatDB  # MongoDB connection URI
JWT_SECRET=your_jwt_secret_key
PORT=5000  # Backend server port
```

If using MongoDB Atlas for the database, replace `localhost:27017` with your MongoDB Atlas URI.

### File Upload Directory

Ensure you have a directory for storing file uploads (you can change the upload location in your multer configuration):

```bash
mkdir uploads
```

### Run the Application

To start the backend server, run:

```bash
npm run dev
```

This will start the backend server on `http://localhost:5000`. The frontend (if separately set up) should be able to communicate with it for handling chat functionality.

## API Endpoints

### 1. Get All Messages for a Chat

**GET** `/messages/:chatId`

Fetches all messages for a specific chat.

#### Example Request:

```bash
GET http://localhost:5000/messages/605c72ef1532072b1f1c1e9d
```

### 2. Send Text Message

**POST** `/messages`

Sends a new text message in a chat.

#### Example Request Body:

```json
{
  "content": "Hello, how are you?",
  "chatId": "605c72ef1532072b1f1c1e9d"
}
```

### 3. Upload File in Chat

**POST** `/messages/upload`

Handles file uploads (images, documents) and sends them as a message.

#### Example Form-Data Request:

```bash
POST http://localhost:5000/messages/upload
Content-Type: multipart/form-data
Authorization: Bearer <JWT Token>
```

Body:

- `file` (file input)
- `chatId`: ID of the chat to which the file belongs

### 4. User Authentication

- **POST** `/api/users/login` for logging in and receiving a JWT token
- **POST** `/api/users/register` for registering a new user

## Project Structure

```bash
├── backend/
│   ├── controllers/        # Message and user controllers
│   ├── middleware/         # Authentication, file upload middlewares
│   ├── models/             # Mongoose models (User, Chat, Message)
│   ├── routes/             # Express routes for user and message operations
│   ├── .env                # Environment variables
│   ├── server.js           # Main server file
├── uploads/                # Directory for storing uploaded files
├── README.md               # Project documentation
└── package.json            # Project dependencies and scripts
```

## File Uploads

File uploads are handled using `multer` middleware, and files are stored in memory as `Buffer`. The content is saved as part of the message model in MongoDB.

## Testing and Debugging

1. Make sure MongoDB is running.
2. Test each API endpoint using tools like **Postman** or **Insomnia**.
3. Ensure JWT tokens are correctly sent in the Authorization header for protected routes.

## Troubleshooting

If you encounter any errors, here are some common steps to troubleshoot:

1. **MongoDB Connection Issues**: Ensure MongoDB is running and the correct URI is used in the `.env` file.
2. **File Upload Problems**: Check if the `uploads/` directory exists and has proper permissions.
3. **JWT Errors**: Ensure the JWT token is correctly included in the `Authorization` header when calling protected routes.

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -am 'Add feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Create a new Pull Request.

## License

This project is licensed under the MIT License.
