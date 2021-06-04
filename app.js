const mysql = require('mysql');
const express = require('express');
var session = require('express-session');
const path = require('path');
const dateFormat = require('dateformat');
const { ifError } = require('assert');
const app = express();

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

//using body-parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//include all static files
app.use(express.static(path.join(__dirname, 'public')));

//ejs engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//CREATE DB CONNECTION
const db = mysql.createConnection({
    host: "localhost",
    port: "3306",
    user: "root",
    password: "ddd1810",
    database: "bakery"
});

//TEST DB CONNECTION
db.connect((err) => {
    if (err) throw err;
    else {
        console.log("Bakery DB connected...");
    }
});


//RENDERING MAIN PAGE
app.get('/', (req, res, next) => {
    console.log('in customer page');
    res.render('customerpage.ejs');
});

//RENDERING LOGIN PAGE
app.get('/customerlogin', (req, res, next) => {
    console.log('in customer login page'); 
    res.render('customerlogin.ejs');
});

//VERIFYING DATA FROM LOGIN PAGE
app.post('/login', (req, res) => {

    email = req.body.username;
    password = req.body.password;

    let sql = 'SELECT * FROM CUSTOMERS WHERE email = ? AND password = ?';
    db.query(sql, [email, password], (err, data, field) => {
        if (err) throw err;

        else if (data.length > 0) {
        
                req.session.loggedin = true;
                req.session.username = email;
            //var user = email;
         
            res.redirect('/customerprofile');
            console.log("USER LOGGED IN");
        }

        else {
            res.render('customerlogin', { alertMsg: "Your Email Address or password is wrong" });
        }

    });

});

//RENDERING REGISTRATION PAGE
app.get('/customerregister', (req, res, next) => {
    console.log('in customer resgister page');
    res.render('customerregister.ejs');
});

//GETTING DATA FROM REGISTRATION PAGE
app.post('/register', (req, res) => {

    name = req.body.Fullname;           //getting all the data
    password = req.body.Setpassword;
    email = req.body.emailid;
    phone_no = req.body.PhoneNumber;

    let sql = 'SELECT * FROM CUSTOMERS WHERE email = ? OR phone_no = ?';   //comparing the the email and phone no to make sure they are unique
    db.query(sql, [email, phone_no], (err, data, fields) => {
        if (err) console.log("ERROR WHEN CHECKING");

        if (data.length >= 1) {
            var msg = email + " or " + phone_no + " already exists";
            res.render('customerregister', { alertMsg: msg });
        }

        else {
            let sql = 'INSERT INTO CUSTOMERS (name,email,phone_no,password) VALUES (?,?,?,?)';
            db.query(sql, [name,email,phone_no,password], (err, data, fields) => {
                if (err) throw err;

                else {
                    console.log("USER REGISTERED");
                }
            });
            res.redirect('/customerlogin');
        }
    });
});

//DISPLAY CUSTOMER PROFILE AND ORDERS
app.get('/customerprofile', (req, res) => {

    console.log(req.session.username);
    var detail;
    let sql = 'SELECT * FROM CUSTOMERS WHERE email = ?';
    db.query(sql, [req.session.username], (err, data, fields) => {

        if (err) throw err;

        else {
            detail = data;
            console.log(detail,detail[0].cust_id);
        }
    });

    sql = 'SELECT o_id, DOO, order_status FROM ORDER_LIST WHERE cid = (SELECT cust_id FROM CUSTOMERS WHERE email = ?)';
    db.query(sql, [req.session.username], (err, data, fields) => {

        if (err) throw err;

        else {

            console.log(data.order_status);
            for (i = 0; i < data.length; i++)
                data[i].DOO = dateFormat(data[i].DOO, 'yyyy-mm-dd       HH:MM:ss');
           

            res.render('customerprofile.ejs', { displayData: data, detail });
        }
    });
});

//DISPLAYING ALL PREVIOUS ORDERS
app.post('/view-order', (req, res) => {

    if(o == null)
         var o = req.body.order_id;

    let sql = 'CREATE OR REPLACE VIEW BILL AS SELECT p.type, p.flavor, o.price_per_qty, o.total_amt, o.quantity FROM PRODUCTS p, ORDER_DESP o WHERE p.p_id = o.pid AND o.oid = ?';
    db.query(sql, [o], (err, data, fields) => {

        if (err) throw err;
        else {
            console.log('viewing order' + o);

            sql = 'SELECT * FROM BILL';
            db.query(sql, (err, data, fields) => {

                if (err) throw err;

                else
                    // res.render('cart.ejs', {displayData : data});
                    displayData = data;

                total_q = 0;
                for (i = 0; i < data.length; i++) {
                    total_q += data[i].quantity;
                }
            });

            sql = 'CALL CALCULATE_BILL(?)';
            db.query(sql, [o], (err, data, fields) => {

                if (err) throw err;

                else {

                    t = data[0];
                    console.log(displayData, t);
                    res.render('order.ejs', { displayData, t, total_q, o });
                }
            });
        }
    });

});


//DISPLAYING PRODUCTS PAGE
app.get('/product', (req, res, next) => {

    res.render('product.ejs');

    let sql = 'SELECT cust_id FROM CUSTOMERS WHERE email = ?';
    db.query(sql, [req.session.username], (err, data, fields) => {

        var custid = data[0].cust_id;
        // console.log(ans);
        if (err) console.log('ERROR RETRIEVING CUST ID');
        else {

           // var no = 0;
            var e = 1002;
            var t = 0;
            var date_o = new Date().toISOString().slice(0, 19).replace('T', ' ');
            var o_status = 'Being Placed';
           // console.log(date_o);
            //var date_o = startDate.toISOString().slice(0, 19).replace('T', ' ');


            sql = 'INSERT INTO ORDER_LIST (cid,eid,net_total,DOO,order_status) VALUES (?,?,?,?,?)';
            db.query(sql, [custid, e, t, date_o, o_status], (err, data, fields) => {

                if (err) throw err;
                else
                    console.log('INSERTED INTO ORDER LIST');
            });

            //console.log(custid,date_o);

            sql = 'SELECT o_id FROM ORDER_LIST WHERE cid = ? AND DOO = ?';
            db.query(sql, [custid, date_o], (err, data, fields) => {

                order = data[0].o_id;

                if (err) throw err;
            });
        }

    });
});

    //DISPLAY CAKES
    app.get('/cakes', (req, res, next) => {

        var type = 'Cake';
        let sql = 'SELECT * FROM PRODUCTS WHERE type = ?';
        db.query(sql, [type], (err, data, fields) => {

            if (err) throw err;

            else {
                res.render('Cake.ejs', { displayData: data, order});
            }
        });

        console.log('in cakes');
        console.log(order);
    });


    //display cupcakes
app.get('/cupcakes', (req, res, next) => {

    var type = 'Cupcake';
        let sql = 'SELECT * FROM PRODUCTS WHERE type = ?';
        db.query(sql, [type], (err, data, fields) => {

            if (err) throw err;

            else {
                res.render('cupcake.ejs', { displayData: data });
            }
        });

        console.log('in cupcakes');
        console.log(order);
});

//display cookies
    app.get('/cookies', (req, res, next) => {

        var type = 'Cookie';
        let sql = 'SELECT * FROM PRODUCTS WHERE type = ?';
        db.query(sql, [type], (err, data, fields) => {

            if (err) throw err;

            else {
                res.render('cookie.ejs', { displayData: data });
            }
        });

        console.log('in cookie');
        console.log(order);
    });

//DISPLAY DONUTS
    app.get('/donuts', (req, res, next) => {

        var type = 'Donut';
        let sql = 'SELECT * FROM PRODUCTS WHERE type = ?';
        db.query(sql, [type], (err, data, fields) => {

            if (err) throw err;

            else {
                res.render('donut.ejs', { displayData: data });
            }
        });

        console.log('in donuts');
        console.log(order);
    });


//ADDING A PRODUCT TO THE CART
app.post('/add', (req, res) => {

    id = req.body.prod;
    pid = id[0];
    q = req.body.qty;

    for (i = 0; i < q.length; i++) {
        console.log(q[i]);
    }
    console.log(pid);

    sql = 'SELECT price, type FROM PRODUCTS WHERE p_id = ?';
    db.query(sql, [pid], (err, data, field) => {

    if (err) throw err;

    else {
        p = data[0].price;
        page = data[0].type;
        total = 0;
        for (i = 0; i < q.length; i++) {
            total = (p * q[i]);

            if (total != 0) {
                quant = q[i];
                break;
            } 
        }
        console.log(total, quant, pid);

        sql = 'INSERT INTO ORDER_DESP ( oid, pid, price_per_qty, total_amt, quantity) VALUES (?,?,?,?,?)';
        db.query(sql, [order, pid, p, total, quant], (err, data, result) => {

            if (err) throw err;

            else {
                console.log('ORDER ADDED');
                var msg = "ITEM ADDED";
            }
        });
    }

    });
});

//DISPLAYING CART 
app.get('/cart', (req, res, next) => {

    let sql = 'CREATE OR REPLACE VIEW BILL AS SELECT p.p_id, p.type, p.flavor, o.price_per_qty, o.total_amt, o.quantity FROM PRODUCTS p, ORDER_DESP o WHERE p.p_id = o.pid AND o.oid = ?';
    db.query(sql, [order], (err, data, fields) => {

        if (err) throw err;
        else
        {
            console.log('viewing cart');

            sql = 'SELECT type, flavor, price_per_qty, total_amt, quantity FROM BILL';
            db.query(sql, (err, data, fields) => {

                if (err) throw err;

                else
                    // res.render('cart.ejs', {displayData : data});
                    displayData = data;

                total_q = 0;
                for (i = 0; i < data.length; i++) {
                    total_q += data[i].quantity;
                }
            });

            sql = 'CALL CALCULATE_BILL(?)';
            db.query(sql, [order], (err, data, fields) => {

                if (err) throw err;

                else {

                    t = data[0];
                    //console.log(displayData, t);
                    res.render('cart.ejs', { displayData, t, total_q });
                }
            });
        }
    });
});

//EDITING ORDERS
app.post('/edit-order', (req, res) => {

    let sql = 'CREATE OR REPLACE VIEW BILL AS SELECT p.p_id, p.type, p.flavor, o.price_per_qty, o.total_amt, o.quantity FROM PRODUCTS p, ORDER_DESP o WHERE p.p_id = o.pid AND o.oid = ?';
    db.query(sql, [order], (err, data, fields) => {

        if (err) throw err;

        else {

            sql = 'SELECT * FROM BILL';
            db.query(sql, (err, data, fields) => {

                if (err) throw err;

                else {
                    res.render('edit_cart.ejs', { displayData: data });
                }

            });

        }

    });

});

//DELETING ITEM
app.get('/:id/delete', (req, res) => {

    console.log('IN DELETE-ITEM');
   // type = req.body.type;
   // flavor = req.body.flavor;
    p_id = req.params.id;
    console.log(p_id,'DELETING ITEM');

    sql = 'DELETE FROM ORDER_DESP WHERE oid = ? AND pid = ?';
    db.query(sql, [order, p_id], (err, data, fields) => {

        if (err) throw err;

        else {
            console.log('ITEM DELETED');
            
        }
    });

});

//RENDERING EDIT-CART AFTER DELETING
app.post('/:id/delete', (req, res) => {

    res.redirect('/edit-order');

});

//UPDATING ORDER CHANGES
app.post('/update-change', (req, res) => {

    console.log('Making changes to the order');

    food_type = req.body.type;
    food_flavor = req.body.flavor;

    new_quant = req.body.quant;

    console.log(food_type,food_flavor,new_quant,order);

    sql = 'SELECT * FROM BILL'; 
    db.query(sql, (err, data, fields) => {

        if (err) throw err;

        else {

            console.log(data);
            for (i = 0; i < data.length; i++)
                if (new_quant[i] != data[i].quantity) {

                    console.log(new_quant[i], order, food_type[i], food_flavor[i]);

                    sql = 'UPDATE ORDER_DESP SET quantity = ? WHERE oid = ? AND pid = (SELECT p_id FROM PRODUCTS WHERE type = ? AND flavor = ?)';
                    db.query(sql, [new_quant[i], order, food_type[i], food_flavor[i]], (err, data, flavor) => {

                        if (err) throw err;

                        else
                            console.log('CHANGES UPDATED');
                    });
                }

            res.redirect('/cart');
        }

    });

});

//CONFIRM ORDER
app.get('/confirm', (req, res) => {

    var o_status = 'Waiting for Confirmation'
    let sql = 'UPDATE ORDER_LIST SET net_total = ?, order_status = ? WHERE o_id = ?';
    db.query(sql, [t[0].TOTAL, o_status, order], (err, data, fields) => {
        if (err) throw err;
        else
            console.log('TOTAL AMOUNT ADDED');
    });

    res.redirect('/customerprofile');
    });


//CUSTOMER LOGOUT
app.get('/custlogout', (req, res, next) => {
    res.redirect('/');
});

// -------------------------------------EMPLOYEE FUNCTIONALITIES------------------------------------------------

//EMPLOYEE LOGIN
app.get('/employeelogin', (req, res, next) => {
    res.render('employeelogin.ejs');
});

//AUTHENTICATING EMPLOYEE LOGIN
app.post('/emp-login', (req, res) => {
    e_id = req.body.emp_id;
    password = req.body.password;

    let sql = 'SELECT * FROM EMPLOYEE WHERE emp_id = ? AND password = ?';
    db.query(sql, [e_id, password], (err, data, field) => {
        if (err) throw err;

        else if (data.length > 0) {

            req.session.loggedin = true;
            req.session.user = e_id;

            res.redirect('/employeeprofile');
            console.log("EMPLOYEE LOGGED IN");
        }

        else {
            res.render('employeelogin', { alertMsg: "Your Employee ID or password is wrong" });
        }

    });


});

//DISPLAYING THE EMPLOYEE PROFILE
app.get('/employeeprofile', (req, res, next) => {

    var detail;
    let sql = 'SELECT * FROM EMPLOYEE WHERE emp_id = ?';
    db.query(sql, [req.session.user], (err, data, fields) => {

        if (err) throw err;

        else {

           data[0].DOB = dateFormat(data[0].DOB, 'yyyy-mm-dd');
           detail = data;
        }
    });

    sql = 'SELECT o_id, DOO, order_status FROM ORDER_LIST WHERE eid = ?';
    db.query(sql, [req.session.user], (err, data, fields) => {

        if (err) throw err;

        else {

            for (i = 0; i < data.length; i++)
                data[i].DOO = dateFormat(data[i].DOO, 'yyyy-mm-dd       HH:MM:ss');

            console.log(detail);
            res.render('employeeprofile.ejs', { displayData: data, detail});
        }
    });

});

//EDITING ORDERS
app.get('/edit_order', (req, res, next) => {

    var s = 'Order Delivered';
    let sql = 'SELECT *  FROM ORDER_LIST WHERE eid = ? AND order_status != ?';
    db.query(sql, [req.session.user, s], (err, data, fields) => {

        if (err) throw err;

        else {

            for (i = 0; i < data.length; i++)
                data[i].DOO = dateFormat(data[i].DOO, 'yyyy-mm-dd       HH:MM:ss');


            res.render('edit-order.ejs', { displayData: data });
        }
    });

});

//UPDATING CHANGES AFTER CHANGING ORDER STATUS
app.post('/update-order-change', (req, res) => {

    console.log('Employee making changes to the order');

    var s = 'Order Delivered';
    o_id = req.body.oid;
    o_status = req.body.status;

    console.log(o_id,o_status);

   let sql = 'SELECT o_id, order_status FROM ORDER_LIST WHERE eid = ? AND order_status != ?';
    db.query(sql, [req.session.user, s], (err, data, fields) => {

        if (err) throw err;

        else {

            for (i = 0; i < data.length; i++)
                if (o_status[i] != data[i].order_status) {

                    console.log(o_status[i], o_id[i]);

                    sql = 'UPDATE ORDER_LIST SET order_status = ? WHERE o_id = ?';
                    db.query(sql, [o_status[i], o_id[i]], (err, data, flavor) => {

                        if (err) throw err;

                        else
                            console.log('ORDER CHANGES UPDATED');
                    });
                }

            res.redirect('/employeeprofile');
        }

    });

});

//DISPLAY INVENTORY
app.get('/edit_inv', (req, res, next) => {


    let sql = 'SELECT * FROM PRODUCTS';
    db.query(sql, (err, data, fields) => {

        if (err) throw err;

        else 
            res.render('inventory.ejs', {displayData:data});
    });
   
});

//ADDING NEW ITEM TO INVENTORY
app.get('/add-new-item', (req, res, next) => {
    res.render('add_new_item.ejs');
});

app.post('/add-new-item', (req, res, next) => {

    type = req.body.type;
    flavor = req.body.flavor;
    price = req.body.price;
    status = req.body.status;

    let sql = 'INSERT INTO PRODUCTS (type,flavor,price,status) VALUES (?,?,?,?)';
    db.query(sql, [type,flavor,price,status], (err, data, fields) => {

        if (err) throw err;

        else
            res.redirect('/edit_inv');
    });

});

//UPDATING INVENTORY CHANGES
app.post('/:id/update/inv', (req, res) => {

    type = req.params.id;
    console.log('IN UPDATE INVENTORY');
    pid = req.body.pid;
    flavor = req.body.fl;
    price = req.body.p;
    status = req.body.s;
    console.log(type, flavor, status, price);

    let sql = 'SELECT * FROM PRODUCTS WHERE type = ?';
    db.query(sql, [type], (err, data, fields) => {

        if (err) throw err;

        else {

            for (i = 0; i < data.length; i++) {

                if (data[i].flavor != flavor[i] || data[i].price != price[i] || data[i].status != status[i]) {
                    sql = 'UPDATE PRODUCTS SET flavor = ?, price = ?, status =? WHERE p_id = ?';
                    db.query(sql, [flavor[i], price[i], status[i], pid[i]], (err, data, fields) => {

                        if (err) throw err;

                        else
                            console.log(pid[i] + 'updated');
                    });
                }

            }

            res.redirect('/edit_inv');
        }
    });
});

//DELETING ITEM FROM INVENTORY
app.get('/:id/delete/inv', (req, res) => {

    console.log('IN DELETE-ITEM FROM INVENTORY');
    p_id = req.params.id;
    console.log(p_id, 'DELETING ITEM');

    sql = 'DELETE FROM PRODUCTS WHERE p_id = ?';
    db.query(sql, [p_id], (err, data, fields) => {

        if (err) throw err;

        else {
            console.log('ITEM DELETED FROM INVENTORY');

        }
    });

});

//EMPLOYEE LOGOUT
app.get('/emplogout', (req, res, next) => {
    res.redirect('/employeelogin');
});

//SETTING UP SERVER AND TESTING CONNECTION
 app.listen(1000, () => {
     console.log('Listening on Port 1000...');
 });