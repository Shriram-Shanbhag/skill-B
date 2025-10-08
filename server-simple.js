const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Simple user model
class User {
    constructor(id, name, email, password, type) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.type = type;
        this.createdAt = new Date();
        this.lastLogin = null;
    }
}

class Course {
    constructor(id, title, description, price, mentorId, category, level, duration) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.price = price;
        this.mentorId = mentorId;
        this.category = category;
        this.level = level;
        this.duration = duration;
        this.rating = 0;
        this.students = [];
        this.createdAt = new Date();
    }
}

class Session {
    constructor(id, studentId, mentorId, date, time, status, subject, description) {
        this.id = id;
        this.studentId = studentId;
        this.mentorId = mentorId;
        this.date = date;
        this.time = time;
        this.status = status;
        this.subject = subject;
        this.description = description;
        this.createdAt = new Date();
    }
}

class Doubt {
    constructor(id, studentId, mentorId, subject, question, status) {
        this.id = id;
        this.studentId = studentId;
        this.mentorId = mentorId;
        this.subject = subject;
        this.question = question;
        this.status = status;
        this.replies = [];
        this.createdAt = new Date();
    }
}

// In-memory storage
let users = [];
let courses = [];
let sessions = [];
let doubts = [];

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-here', (err, user) => {
        if (err) {
            console.log('JWT verification error:', err);
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        console.log('Authenticated user:', user);
        req.user = user;
        next();
    });
};

// Optional authentication middleware (for some endpoints)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-here', (err, user) => {
            if (!err) {
                req.user = user;
            }
        });
    }
    next();
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/student', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

app.get('/mentor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mentor.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API Routes

// Register user
app.post('/api/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        const { name, email, password, type } = req.body;
        
        // Check if user already exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            console.log('User already exists:', email);
            return res.json({ success: false, message: 'User with this email already exists' });
        }
        
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create new user
        const id = users.length + 1;
        const user = new User(id, name, email, hashedPassword, type);
        users.push(user);
        console.log('New user created:', user);
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, type: user.type },
            process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
            { expiresIn: '24h' }
        );
        
        res.json({ 
            success: true, 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email,
                type: user.type 
            },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
});

// Login user
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.json({ success: false, message: 'Invalid email or password' });
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.json({ success: false, message: 'Invalid email or password' });
        }
        
        // Update last login
        user.lastLogin = new Date();
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, type: user.type },
            process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
            { expiresIn: '24h' }
        );
        
        res.json({ 
            success: true, 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email,
                type: user.type 
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// Get all courses
app.get('/api/courses', optionalAuth, async (req, res) => {
    try {
        res.json({ success: true, courses });
    } catch (error) {
        console.error('Courses fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get single course
app.get('/api/courses/:id', optionalAuth, async (req, res) => {
    try {
        const courseId = parseInt(req.params.id);
        const course = courses.find(c => c.id === courseId);
        
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        
        res.json({ success: true, course });
    } catch (error) {
        console.error('Course fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Create course (Mentor only)
app.post('/api/courses', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'mentor') {
            return res.status(403).json({ success: false, message: 'Mentor access required' });
        }
        
        const { title, description, price, category, level, duration } = req.body;
        const id = courses.length + 1;
        const course = new Course(id, title, description, price, req.user.userId, category, level, duration);
        
        courses.push(course);
        console.log('New course created:', course);
        res.json({ success: true, course });
    } catch (error) {
        console.error('Course creation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Enroll in course (Student only)
app.post('/api/courses/:id/enroll', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'student') {
            return res.status(403).json({ success: false, message: 'Student access required' });
        }
        
        const courseId = parseInt(req.params.id);
        const course = courses.find(c => c.id === courseId);
        
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        
        // Check if already enrolled
        if (course.students.includes(req.user.userId)) {
            return res.json({ success: false, message: 'Already enrolled in this course' });
        }
        
        // Add student to course
        course.students.push(req.user.userId);
        console.log(`Student ${req.user.userId} enrolled in course ${courseId}`);
        
        res.json({ success: true, message: 'Successfully enrolled in course' });
    } catch (error) {
        console.error('Course enrollment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update course (Mentor only - own courses)
app.put('/api/courses/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'mentor') {
            return res.status(403).json({ success: false, message: 'Mentor access required' });
        }
        
        const courseId = parseInt(req.params.id);
        const courseIndex = courses.findIndex(c => c.id === courseId);
        
        if (courseIndex === -1) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        
        const course = courses[courseIndex];
        if (course.mentorId !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Can only edit your own courses' });
        }
        
        const { title, description, price, category, level, duration } = req.body;
        
        // Update course
        courses[courseIndex] = {
            ...course,
            title: title || course.title,
            description: description || course.description,
            price: price || course.price,
            category: category || course.category,
            level: level || course.level,
            duration: duration || course.duration
        };
        
        console.log('Course updated:', courses[courseIndex]);
        res.json({ success: true, course: courses[courseIndex] });
    } catch (error) {
        console.error('Course update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete course (Mentor only - own courses)
app.delete('/api/courses/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'mentor') {
            return res.status(403).json({ success: false, message: 'Mentor access required' });
        }
        
        const courseId = parseInt(req.params.id);
        const courseIndex = courses.findIndex(c => c.id === courseId);
        
        if (courseIndex === -1) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        
        const course = courses[courseIndex];
        if (course.mentorId !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Can only delete your own courses' });
        }
        
        courses.splice(courseIndex, 1);
        console.log(`Course ${courseId} deleted by mentor ${req.user.userId}`);
        
        res.json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Course deletion error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get all users (Admin only)
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        
        const usersList = users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            type: u.type,
            createdAt: u.createdAt,
            lastLogin: u.lastLogin
        }));
        
        res.json({ success: true, users: usersList });
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get all sessions
app.get('/api/sessions', authenticateToken, async (req, res) => {
    try {
        let userSessions;
        if (req.user.type === 'student') {
            userSessions = sessions.filter(s => s.studentId == req.user.userId);
        } else if (req.user.type === 'mentor') {
            userSessions = sessions.filter(s => s.mentorId == req.user.userId);
        } else if (req.user.type === 'admin') {
            userSessions = sessions;
        }
        
        res.json({ success: true, sessions: userSessions });
    } catch (error) {
        console.error('Sessions fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Create session (Student only)
app.post('/api/sessions', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'student') {
            return res.status(403).json({ success: false, message: 'Student access required' });
        }
        
        const { mentorId, date, time, subject, description } = req.body;
        const id = sessions.length + 1;
        const session = new Session(id, req.user.userId, mentorId, date, time, 'pending', subject, description);
        
        sessions.push(session);
        res.json({ success: true, session });
    } catch (error) {
        console.error('Session creation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update session status (Mentor only)
app.put('/api/sessions/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'mentor') {
            return res.status(403).json({ success: false, message: 'Mentor access required' });
        }
        
        const { status } = req.body;
        const session = sessions.find(s => s.id == req.params.id);
        
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }
        
        if (session.mentorId !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Can only manage your own sessions' });
        }
        
        session.status = status;
        console.log(`Session ${req.params.id} status updated to ${status} by mentor ${req.user.userId}`);
        res.json({ success: true, session });
    } catch (error) {
        console.error('Session update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete session (Student or Mentor)
app.delete('/api/sessions/:id', authenticateToken, async (req, res) => {
    try {
        const sessionId = parseInt(req.params.id);
        const sessionIndex = sessions.findIndex(s => s.id === sessionId);
        
        if (sessionIndex === -1) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }
        
        const session = sessions[sessionIndex];
        
        // Check if user can delete this session
        if (session.studentId !== req.user.userId && session.mentorId !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Can only delete your own sessions' });
        }
        
        sessions.splice(sessionIndex, 1);
        console.log(`Session ${sessionId} deleted by user ${req.user.userId}`);
        
        res.json({ success: true, message: 'Session deleted successfully' });
    } catch (error) {
        console.error('Session deletion error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get all doubts
app.get('/api/doubts', authenticateToken, async (req, res) => {
    try {
        let userDoubts;
        if (req.user.type === 'student') {
            userDoubts = doubts.filter(d => d.studentId == req.user.userId);
        } else if (req.user.type === 'mentor') {
            userDoubts = doubts.filter(d => d.mentorId == req.user.userId);
        } else if (req.user.type === 'admin') {
            userDoubts = doubts;
        }
        
        res.json({ success: true, doubts: userDoubts });
    } catch (error) {
        console.error('Doubts fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Create doubt (Student only)
app.post('/api/doubts', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'student') {
            return res.status(403).json({ success: false, message: 'Student access required' });
        }
        
        const { subject, question } = req.body;
        const id = doubts.length + 1;
        const doubt = new Doubt(id, req.user.userId, null, subject, question, 'open');
        
        doubts.push(doubt);
        res.json({ success: true, doubt });
    } catch (error) {
        console.error('Doubt creation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add reply to doubt
app.post('/api/doubts/:id/replies', authenticateToken, async (req, res) => {
    try {
        const { message } = req.body;
        const doubt = doubts.find(d => d.id == req.params.id);
        
        if (!doubt) {
            return res.status(404).json({ success: false, message: 'Doubt not found' });
        }
        
        doubt.replies.push({
            userId: req.user.userId,
            message,
            timestamp: new Date()
        });
        
        res.json({ success: true, doubt });
    } catch (error) {
        console.error('Reply creation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = users.find(u => u.id == req.user.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Remove password from response
        const { password, ...userProfile } = user;
        res.json({ success: true, user: userProfile });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const userIndex = users.findIndex(u => u.id == req.user.userId);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const { name, email } = req.body;
        
        // Update user
        if (name) users[userIndex].name = name;
        if (email) users[userIndex].email = email;
        
        console.log(`Profile updated for user ${req.user.userId}`);
        
        const { password, ...userProfile } = users[userIndex];
        res.json({ success: true, user: userProfile });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete user (Admin only)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        
        const userIndex = users.findIndex(u => u.id == req.params.id);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        users.splice(userIndex, 1);
        console.log(`User ${req.params.id} deleted by admin ${req.user.userId}`);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('User deletion error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Initialize sample data
async function initializeData() {
    try {
        if (users.length === 0) {
            // Create admin user
            const adminPassword = await bcrypt.hash('admin123', 12);
            const admin = new User(1, 'Admin', 'admin@skillbridge.com', adminPassword, 'admin');
            users.push(admin);
            
            // Create sample mentor
            const mentorPassword = await bcrypt.hash('password123', 12);
            const mentor = new User(2, 'John Mentor', 'john@example.com', mentorPassword, 'mentor');
            users.push(mentor);
            
            // Create sample student
            const studentPassword = await bcrypt.hash('password123', 12);
            const student = new User(3, 'Alice Student', 'alice@example.com', studentPassword, 'student');
            users.push(student);
            
            // Create sample courses
            courses.push(new Course(1, 'Web Development Basics', 'Learn HTML, CSS, and JavaScript from scratch. Perfect for beginners who want to start their journey in web development.', 99.99, 2, 'Programming', 'beginner', 40));
            courses.push(new Course(2, 'React.js Complete Guide', 'Master React.js with hooks, state management, and modern development practices.', 149.99, 2, 'Programming', 'intermediate', 35));
            courses.push(new Course(3, 'Data Science with Python', 'Learn data analysis, machine learning, and visualization with Python.', 199.99, 2, 'Data Science', 'intermediate', 50));
            
            console.log('✅ Sample data initialized');
        }
    } catch (error) {
        console.error('❌ Error initializing sample data:', error);
    }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Skill Bridge server running on http://localhost:${PORT}`);
    console.log('📚 Professional learning platform with modern design');
    
    // Initialize sample data after a short delay
    setTimeout(initializeData, 1000);
});
