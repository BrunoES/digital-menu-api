const restify = require("restify");
const mysql = require("mysql");
const corsMiddleware = require("restify-cors-middleware");

const cors = corsMiddleware({
  origins: ["*"],
  allowHeaders: ["Authorization"],
  exposeHeaders: ["Authorization"]
});

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1234"
});

const server = restify.createServer({
  name: "digital-menu-api",
  version: "1.0.0"
});

server.use(restify.plugins.bodyParser({ mapParams: true }));
server.pre(cors.preflight); // Precisa usar restify 7.x.x + restify-cors-middleware para ser compatível com cors preflight.
server.use(cors.actual);

// Get All
server.get("/menu-items", function(req, res, next) {
    var sql = "SELECT * FROM digital_menu.menu_items";
    con.query(sql, function (err, result, fields) {
        if (err) throw err;
        console.log(result);
        res.send(result);
    });
});

// Get By Id
server.get("/menu-items/:id", function (req, res, next) {
    var id = req.params.id;
    var titulo = 'teste';

    var sql = "SELECT * FROM digital_menu.menu_items WHERE id = ?";
    con.query(sql, id, function (err, result, fields) {
        if (err) throw err;
        console.log(result);
        res.send(result);
    });
});

// Post
server.post("/menu-items", function(req, res, next) {
    var meuItem = req.body;
    var sql = `INSERT INTO digital_menu.menu_items (name, description, price, img_url) VALUES ('${meuItem.name}', '${meuItem.description}', '${meuItem.price}', '${meuItem.img_url}')`

    console.log(meuItem);
    console.log(sql);

    con.query(sql, function(err, result) {
        if (err) throw err;
        console.log(result);
        res.send("Linhas inseridas: " + result.affectedRows);
    });
});

// Put
server.put("/menu-items", function(req, res, next) {
    var menuItem = req.body;

    console.log("Alterando item de id: %d ", menuItem.id);
    console.dir(menuItem);

    var sql = `UPDATE digital_menu.menu_items 
                  SET name    = '${menuItem.name}',
                      description = '${menuItem.description}'
                      price = '${menuItem.price}'
                      img_url = '${menuItem.img_url}'
               WHERE id = ${menuItem.id}`;

    console.log(menuItem);
    console.log(sql);

    con.query(sql, function(err, result) {
        if (err) throw err;
        console.log(result);
        res.send("Linhas alteradas: " + result.affectedRows);
    });
});

// Delete
server.del("/menu-items/:id", function(req, res, next) {
    var id = req.params.id;
    console.log("Deletando livro de ID: %d", id);

    var sql = "DELETE FROM digital_menu.menu_items WHERE id = ?";
    
    con.query(sql, id, function (err, result, fields) {
        if (err) throw err;
        console.log(result);
        res.send("Linhas deletadas" + result.affectedRows);
    });
});

server.listen(8080, function() {
    console.log("Listening at %s", server.url);
});

con.connect(function(err) {
    if(err) throw err;
    console.log("Connected!");
});

console.log("Running");