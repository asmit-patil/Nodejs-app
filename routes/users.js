var express = require('express')
var app = express()
var ObjectId = require('mongodb').ObjectId
var bcrypt = require('bcrypt');
var mongoose = require('mongoose')
mongoose.Promise = Promise
var MongoClient = require('mongodb').MongoClient;
//var url = 'mongodb://localhost:27017/testDB2';
//var SALT_WORK_FACTOR = 10;
// SHOW LIST OF USERS
app.get('/', function(req, res, next) {    
    // fetch and sort users collection by id in descending order
    req.db.collection('users').find().sort({"_id": -1}).toArray(function(err, result) {
        //if (err) return console.log(err)
        if (err) {
            req.flash('error', err)
            res.render('user/list', {
                title: 'User List', 
                data: ''
            })
        } else {
            // render to views/user/list.ejs template file
            res.render('user/list', {
                title: 'User List', 
                data: result
            })
        }
    })
})

// SHOW ADD USER FORM
app.get('/add', function(req, res, next){    
    // render to views/user/add.ejs
    res.render('user/add', {
        title: 'Add New User',
        name: '',
        age: '',
        email: '' ,
        password:''       
    })
})

// SHOW login FORM
app.get('/login', function(req, res, next){    
    // render to views/user/login.ejs
    res.render('user/login', {
        email: '' ,
        password:''       
    })
})





mongoose.connect('mongodb://localhost:27017/testDB2');
 
var db = mongoose.connection;
 
db.on('error', function(err){
    console.log('connection error', err);
});
 
db.once('open', function(){
    console.log('Connection to DB successful');
});
 
var Schema = mongoose.Schema;
var mySchema = new Schema({
    name:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true,
        unique:true
    },
    age:{
        type: Number,
        required: true,
    }
});
 
var User = mongoose.model('users', mySchema);
 
mySchema.pre('save', function(next){
    var user = this;
    console.log(1)
    if (!user.isModified('password')) return next();
 
    // bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt){
    //     if(err) return next(err);
    //     console.log(2)
    //     bcrypt.hash(user.password, salt, function(err, hash){
    //         if(err) return next(err);
    //         console.log(3)
    //         user.password = hash;
    //         next();
    //     });
    // });

    // if the user has modified their password, let's hash it
    bcrypt.hash(user.password, 10).then(function(hashedPassword) {
        // then let's set their password to not be the plain text one anymore, but the newly hashed password
        var temppass= user.password
        user.password = hashedPassword
        // then we save the user in the db!
        if(User.findOne({password: user.password}))
        {
            console.log(12345)
            bcrypt.hash(temppass,12).then(function(hashedPassword){
                user.password = hashedPassword
            })
        }
        next();
    }, function(err){
        // or we continue and pass in an error that has happened (which our express error handler will catch)
        return next(err)
    })
});

// now let's write an instance method for all of our user documents which will be used to compare a plain text password with a hashed password in the database. Notice the second parameter to this function is a callback function called "next". Just like the code above, we need to run next() to move on.
  function comparePassword(candidatePassword, dbpassword,next) {
    console.log(5)
    // when this method is called, compare the plain text password with the password in the database.
    bcrypt.compare(candidatePassword, dbpassword, function(err, isMatch) {
        if(err) return next(err);
        // isMatch is a boolean which we will pass to our next function
        console.log(6)
        next(null, isMatch);
    });
};
        
// ADD NEW USER POST ACTION
app.post('/add', function(req, res, next){    
    req.assert('name', 'Name is required').notEmpty()           //Validate name
    req.assert('age', 'Age should be numeric').isNumeric()             //Validate age
    req.assert('email', 'A valid email is required').isEmail()  //Validate email
    req.assert('password','Password is required').notEmpty()    //Validate password
    var errors = req.validationErrors()
    
    
    if( !errors ) {   //No errors were found.  Passed Validation!
        
        /********************************************
         * Express-validator module
         
        req.body.comment = 'a <span>comment</span>';
        req.body.username = '   a user    ';
 
        req.sanitize('comment').escape(); // returns 'a &lt;span&gt;comment&lt;/span&gt;'
        req.sanitize('username').trim(); // returns 'a user'
        ********************************************/
        
        var user = new User({
            name: req.sanitize('name').escape().trim(),
            age: req.sanitize('age').escape().trim(),
            email: req.sanitize('email').escape().trim(),
            password: req.sanitize('password').escape().trim()
        })
       //console.log(user.email)
       // req.db.collection('users').save(user, function(err, result) {
           // console.log(user.email)
           user.save(function(err,result){
            if (err) {
                req.flash('error', err)
               
                // render to views/user/add.ejs
                res.render('user/add', {
                    title: 'Add New User',
                    name: user.name,
                    age: user.age,
                    email: user.email,
                    password:user.password                    
                })
            } else {                
                req.flash('success', 'Registered successfully! Now you can Login with same')
                console.log(4)
                // redirect to user list page                
                res.render('user/login',{
                    email: '',
                    password:''  
                })
            }
        })        
    }
    else {   //Display errors to user
        var error_msg = ''
        errors.forEach(function(error) {
            error_msg += error.msg + '<br>'
        })                
        req.flash('error', error_msg)        
        
        /**
         * Using req.body.name 
         * because req.param('name') is deprecated
         */ 
        res.render('user/add', { 
            title: 'Add New User',
            name: req.body.name,
            age: req.body.age,
            email: req.body.email,
            password:req.body.password
        })
    }
})


app.post('/login', function(req, res, next){
   
    req.assert('email', 'A valid email is required').isEmail()  //Validate email
    req.assert('password','Password is required').notEmpty()    //Validate password
    var errors = req.validationErrors()
    if( !errors ) {  
           // console.log(req.body.email)
            //console.log(User.findOne({"email": "ap11@mail.com"}))
            User.findOne({email: req.body.email}).then(function(user){
               // console.log("then",user,User)
                comparePassword(req.body.password, user.password, function(err, isMatch){
                    console.log(1)
                     if(isMatch){
                        console.log(2)
                        req.flash('success', 'Login successful')
                        res.redirect('/users');
                    } else {
                        console.log(3)
                        req.flash('error', 'Login unsuccessful')
                        res.render('user/login',{
                        email: '',
                        password:''
                        });
                    }
                })
            }).catch( function(err){
                console.log(err)
                req.flash('error', error_msg)        
                console.log(4)
                res.render('user/login',{
                    email: '',
                    password:''
                })
            })
    
        
        
         

    }
    else{
        var error_msg = ''
        errors.forEach(function(error) {
            error_msg += error.msg + '<br>'
        })                
        req.flash('error', error_msg)        
        
        res.render('user/login',{
            email: '',
            password:''
        })
    }
})
 
// SHOW EDIT USER FORM
app.get('/edit/(:id)', function(req, res, next){
    var o_id = new ObjectId(req.params.id)
    req.db.collection('users').find({"_id": o_id}).toArray(function(err, result) {
        if(err) return console.log(err)
        
        // if user not found
        if (!result) {
            req.flash('error', 'User not found with id = ' + req.params.id)
            res.redirect('/users')
        }
        else { // if user found
            // render to views/user/edit.ejs template file
            res.render('user/edit', {
                title: 'Edit User', 
               
                id: result[0]._id,
                name: result[0].name,
                age: result[0].age,
                email: result[0].email ,
                         
            })
        }
    })    
})
 
// EDIT USER POST ACTION
app.put('/edit/(:id)', function(req, res, next) {
    req.assert('name', 'Name is required').notEmpty()           //Validate name
    req.assert('age', 'Age is required').notEmpty()             //Validate age
    req.assert('email', 'A valid email is required').isEmail()  //Validate email
    var errors = req.validationErrors()
    
    if( !errors ) {   //No errors were found.  Passed Validation!
        
        /********************************************
         * Express-validator module
         
        req.body.comment = 'a <span>comment</span>';
        req.body.username = '   a user    ';
 
        req.sanitize('comment').escape(); // returns 'a &lt;span&gt;comment&lt;/span&gt;'
        req.sanitize('username').trim(); // returns 'a user'
        ********************************************/
        var user = {
            name: req.sanitize('name').escape().trim(),
            age: req.sanitize('age').escape().trim(),
            email: req.sanitize('email').escape().trim(),
        }
        
        var o_id = new ObjectId(req.params.id)
        req.db.collection('users').update({"_id": o_id}, user, function(err, result) {
            if (err) {
                req.flash('error', err)
                
                // render to views/user/edit.ejs
                res.render('user/edit', {
                    title: 'Edit User',
                    id: req.params.id,
                    name: req.body.name,
                    age: req.body.age,
                    email: req.body.email,
                    
                })
            } else {
                req.flash('success', 'Data updated successfully!')
                
                res.redirect('/users')
                
                // render to views/user/edit.ejs
                /*res.render('user/edit', {
                    title: 'Edit User',
                    id: req.params.id,
                    name: req.body.name,
                    age: req.body.age,
                    email: req.body.email
                })*/
            }
        })        
    }
    else {   //Display errors to user
        var error_msg = ''
        errors.forEach(function(error) {
            error_msg += error.msg + '<br>'
        })
        req.flash('error', error_msg)
        
        /**
         * Using req.body.name 
         * because req.param('name') is deprecated
         */ 
        res.render('user/edit', { 
            title: 'Edit User',            
            id: req.params.id, 
            name: req.body.name,
            age: req.body.age,
            email: req.body.email,
           
        })
    }
})
 
// DELETE USER
app.delete('/delete/(:id)', function(req, res, next) {    
    var o_id = new ObjectId(req.params.id)
    req.db.collection('users').remove({"_id": o_id}, function(err, result) {
        if (err) {
            req.flash('error', err)
            // redirect to users list page
            res.redirect('/users')
        } else {
            req.flash('success', 'User deleted successfully! id = ' + req.params.id)
            // redirect to users list page
            res.redirect('/users')
        }
    })    
})
 
module.exports = app