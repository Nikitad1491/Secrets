//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
var findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended :true}));

// configure the session////////////////////////////////////////
app.use(session({
  secret: 'Our Little Secret',
  resave: false,
  saveUninitialized: false,
}));

// Initialize the session//////////////////////////////////////
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId:String
});

// Use plugin to use the packages on the Schema

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

// ////////////////////////////////////Create Strategy // ////////////////////////////////////
passport.use(User.createStrategy());

// ////////////////////////////////////start and end session // ////////////////////////////////////

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// ////////////////////////////////////Create Google Strategy // ////////////////////////////////////
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// ////////////////////////////////////Create Facebook Strategy // ////////////////////////////////////
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    enableProof: true

  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",function(req, res){
  res.render("home");
});
app.get("/login",function(req, res){
  res.render("login");
});
app.get("/register",function(req, res){
  res.render("register");
});

// ////////////////////////////////////Google Authentication// ////////////////////////////////////
app.get("/auth/google",
  passport.authenticate("google", { scope: ['profile'] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

// ////////////////////////////////////Facebook Authentication// ////////////////////////////////////
  app.get('/auth/facebook',
    passport.authenticate('facebook'));

    app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { successRedirect: '/secrets',failureRedirect: '/login' }));


// FOR LinkedIn you need company listed hence not created


app.post("/register",function(req,res){
User.register({username: req.body.username},req.body.password, function(err, user){
  if (err) {
      console.log(err);
      res.redirect("/register");
  } else {
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
});

});

app.get("/secrets", function(req, res){
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.post("/login",function(req, res){

  const newUser = new User({
    username: req.body.username,
    password:req.body.password
  });

  req.login(newUser, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});


app.listen(3000,function(req, res){
  console.log("Server started on port 3000");
});
