# 🌉 Skill Bridge

A simple platform connecting students with mentors for learning and growth.

## Features

### For Students:
- 🔍 Search and book sessions with mentors
- 📚 Browse and purchase courses
- 📅 Track session status (Pending, Accepted, Rejected)

### For Mentors:
- ✅ Accept or reject session requests
- 📖 Create and sell virtual courses
- 📊 Manage student sessions

### For Admins:
- 👥 View all students and mentors
- 🗑️ Remove any user registration
- 📊 View platform statistics
- 📅 Monitor all sessions
- 📚 View all courses

## Tech Stack
- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Storage**: In-memory (simple arrays - no database needed!)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   ```
   http://localhost:3000
   ```

## How to Use

1. **Register** as Student, Mentor, or Admin
2. **Login** with your credentials
3. **Students** can:
   - Browse available mentors
   - Book sessions with date/time
   - Purchase courses
   - View session status
4. **Mentors** can:
   - Accept/reject session requests
   - Create new courses
   - View their course listings
5. **Admins** can:
   - View all users (students and mentors)
   - Delete any user registration
   - Monitor all platform activity
   - View comprehensive statistics

### Default Admin Account
- **Email**: admin@skillbridge.com
- **Password**: admin123

## File Structure

```
skill-bridge/
├── package.json          # Dependencies and scripts
├── server.js             # Main Express server
├── public/               # Frontend files
│   ├── index.html        # Home page
│   ├── login.html        # Login/Register page
│   ├── student.html      # Student dashboard
│   ├── mentor.html       # Mentor dashboard
│   └── style.css         # Styling
└── README.md             # This file
```

## Simple & Student-Friendly

This project is designed to be:
- ✅ Easy to understand
- ✅ No complex database setup
- ✅ Simple file structure
- ✅ Basic but functional features
- ✅ Clean and modern UI

Perfect for learning web development concepts!

## Development

For development with auto-restart:
```bash
npm run dev
```

## License

MIT License - Feel free to use this for learning and projects!
