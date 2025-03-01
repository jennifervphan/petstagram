require('dotenv').config();

const express = require('express');
const app = express();
const hbs = require('hbs');
const path = require('path')
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const uploadCloud = require('./cloudinary');

app.set('view engine', 'hbs')
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'))

app.use(express.static(path.join(__dirname, 'public')));

//hbs helper if_eq
hbs.registerHelper('if_eq', function(a, b, opts) {
    if (a == b)
        return opts.fn(this);
    else
        return opts.inverse(this);
});


//connection to the database
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true })
    .then((x) => {
        console.log(`database name: ${x.connections[0].name}`);
    }).catch(err => {
        console.log('error', err);
    });

//uploading files
const myStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/images/userPhotos')
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname)
    }
})
const upload = multer({ storage: myStorage });

//setting the session cookie
app.use(session({
    secret: "basic-auth-secret",
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({
        ttl: 24 * 60 * 60,
        url: process.env.MONGODB_URI
    })
}));


//accessControl with session
let accessControl = (req, res, next) => {
    if (req.session.user) {
        // console.log(req.session)
        next();
    } else {
        res.redirect('/login')
    }
}

app.use(function(req, res, next) {
    if (req.session.user) res.locals.user = req.session.user;
    // console.log(res.locals.user)
    next();
})

const login = require('./routes/login')
app.use('/', login);
const signup = require('./routes/signup')
app.use('/', signup);
const index = require('./routes/index')
app.use('/', accessControl, index);
const create = require('./routes/create')
app.use('/', accessControl, uploadCloud.single('image'), create);
const profilepage = require('./routes/profilepage')
app.use('/', accessControl, uploadCloud.single('profileImg'), profilepage);
const logout = require('./routes/login')
app.use('/', accessControl, logout);
const changepassword = require('./routes/changepassword')
app.use('/', accessControl, changepassword);
const updateInfo = require('./routes/updateInfo')
app.use('/', accessControl, uploadCloud.single('image'), updateInfo);
const deletepost = require('./routes/delete')
app.use('/', accessControl, deletepost);
const comment = require('./routes/comment')
app.use('/', accessControl, comment);

app.listen(process.env.PORT, () => { console.log(`app listening on port ${process.env.PORT}`) })