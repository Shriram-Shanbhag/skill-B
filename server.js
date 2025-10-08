const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-here',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/skillbridge'
    }),
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// MongoDB connection with fallback
let useMongoDB = false;

// Try to connect to MongoDB, but don't crash if it fails
setTimeout(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillbridge', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 3000,
        });
        console.log('✅ Connected to MongoDB');
        useMongoDB = true;
    } catch (err) {
        console.log('⚠️  MongoDB not available, using in-memory storage');
        console.log('💡 To use MongoDB:');
        console.log('   1. Install MongoDB: https://www.mongodb.com/try/download/community');
        console.log('   2. Start MongoDB service');
        console.log('   3. Restart this server');
        useMongoDB = false;
    }
}, 1000);

// MongoDB Schemas
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    type: { type: String, enum: ['student', 'mentor', 'admin'], required: true },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    profile: {
        avatar: String,
        bio: String,
        skills: [String],
        experience: String
    }
});

const courseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    duration: { type: Number, required: true }, // in hours
    rating: { type: Number, default: 0 },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const sessionSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    subject: { type: String, required: true },
    description: String,
    createdAt: { type: Date, default: Date.now }
});

const doubtSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    subject: { type: String, required: true },
    question: { type: String, required: true },
    status: { type: String, enum: ['open', 'assigned', 'resolved'], default: 'open' },
    replies: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);
const Session = mongoose.model('Session', sessionSchema);
const Doubt = mongoose.model('Doubt', doubtSchema);

// Fallback in-memory storage
let users = [];
let courses = [];
let sessions = [];
let doubts = [];

// Simple user model for fallback
class SimpleUser {
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

class SimpleCourse {
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

class SimpleSession {
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

class SimpleDoubt {
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

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-here', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
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
        
        if (useMongoDB) {
            // MongoDB implementation
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                console.log('User already exists:', email);
                return res.json({ success: false, message: 'User with this email already exists' });
            }
            
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            const user = new User({
                name,
                email,
                password: hashedPassword,
                type
            });
            
            await user.save();
            console.log('New user created:', user);
            
            const token = jwt.sign(
                { userId: user._id, email: user.email, type: user.type },
                process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
                { expiresIn: '24h' }
            );
            
            res.json({ 
                success: true, 
                user: { 
                    id: user._id, 
                    name: user.name, 
                    email: user.email,
                    type: user.type 
                },
                token
            });
  } else {
            // In-memory implementation
            const existingUser = users.find(u => u.email === email);
            if (existingUser) {
                console.log('User already exists:', email);
                return res.json({ success: false, message: 'User with this email already exists' });
            }
            
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            const id = users.length + 1;
            const user = new SimpleUser(id, name, email, hashedPassword, type);
            users.push(user);
            console.log('New user created:', user);
            
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
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
});

// Login user
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (useMongoDB) {
            // MongoDB implementation
            const user = await User.findOne({ email });
            if (!user) {
                return res.json({ success: false, message: 'Invalid email or password' });
            }
            
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.json({ success: false, message: 'Invalid email or password' });
            }
            
            user.lastLogin = new Date();
            await user.save();
            
            const token = jwt.sign(
                { userId: user._id, email: user.email, type: user.type },
                process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
                { expiresIn: '24h' }
            );
            
            res.json({ 
                success: true, 
                user: { 
                    id: user._id, 
                    name: user.name, 
                    email: user.email,
                    type: user.type 
                },
                token
            });
        } else {
            // In-memory implementation
            const user = users.find(u => u.email === email);
            if (!user) {
                return res.json({ success: false, message: 'Invalid email or password' });
            }
            
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.json({ success: false, message: 'Invalid email or password' });
            }
            
            user.lastLogin = new Date();
            
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
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// Get all courses
app.get('/api/courses', async (req, res) => {
    try {
        if (useMongoDB) {
            const courses = await Course.find()
                .populate('mentorId', 'name email')
                .sort({ createdAt: -1 });
            res.json({ success: true, courses });
        } else {
            res.json({ success: true, courses });
        }
    } catch (error) {
        console.error('Courses fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Initialize sample data
async function initializeData() {
    try {
        if (useMongoDB) {
            // MongoDB sample data
            const adminExists = await User.findOne({ email: 'admin@skillbridge.com' });
            if (!adminExists) {
                const hashedPassword = await bcrypt.hash('admin123', 12);
                const admin = new User({
                    name: 'Admin',
                    email: 'admin@skillbridge.com',
                    password: hashedPassword,
                    type: 'admin'
                });
                await admin.save();
                console.log('✅ Admin user created');
            }
        } else {
            // In-memory sample data
            if (users.length === 0) {
                const hashedPassword = await bcrypt.hash('admin123', 12);
                const admin = new SimpleUser(1, 'Admin', 'admin@skillbridge.com', hashedPassword, 'admin');
                users.push(admin);
                
                const mentorPassword = await bcrypt.hash('password123', 12);
                const mentor = new SimpleUser(2, 'John Mentor', 'john@example.com', mentorPassword, 'mentor');
                users.push(mentor);
                
                const studentPassword = await bcrypt.hash('password123', 12);
                const student = new SimpleUser(3, 'Alice Student', 'alice@example.com', studentPassword, 'student');
                users.push(student);
                
                // Sample courses
                courses.push(new SimpleCourse(1, 'Web Development Basics', 'Learn HTML, CSS, and JavaScript from scratch.', 99.99, 2, 'Programming', 'beginner', 40));
                courses.push(new SimpleCourse(2, 'React.js Complete Guide', 'Master React.js with hooks and state management.', 149.99, 2, 'Programming', 'intermediate', 35));
                
                console.log('✅ Sample data initialized');
            }
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
    setTimeout(initializeData, 2000);
});