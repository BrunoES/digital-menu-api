const restify = require("restify");
const mysql = require("mysql");
const corsMiddleware = require("restify-cors-middleware2");

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require('uuid');

const cors = corsMiddleware({
  origins: ["*"],
  allowHeaders: ["*"],
  exposeHeaders: ["*"]
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

const customerId = 1;
const sep = path.sep;
const pathImages = `.${sep}${sep}media${sep}${sep}imgs`;

server.use(restify.plugins.bodyParser({ mapParams: true }));
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.pre(cors.preflight); // Precisa usar restify 7.x.x + restify-cors-middleware para ser compatível com cors preflight.
server.use(cors.actual);

server.pre((req, res, next) => {
    console.info(`${req.method} - ${req.url}`);
    return next();
});

server.opts("/menu-items", function(req, res, next) {
    console.log(req);
});

// Get All
server.get("/menu-items", function(req, res, next) {
    var response = [];
    var countMenuItemsProcessados = 0;
    var sql = "SELECT * FROM digital_menu.menu_items";
    
    con.query(sql, function (err, result, fields) {
        if (err) throw err;
        console.log(result);

        result.forEach(menuItem => {

            const fileExists = fs.existsSync(menuItem.img_url);
            console.log(fileExists);
            if(fileExists) {
                fs.readFile(menuItem.img_url, {encoding: 'base64'}, function(err, content) {
                    response.push({
                        menuItem: menuItem,
                        base64Img: content
                    });
                    
                    countMenuItemsProcessados++;

                    console.log(countMenuItemsProcessados);
                    console.log(result.length);

                    if(countMenuItemsProcessados === result.length) {
                        res.send(response);
                    }
                })
            }
        })
    });
});

// Get By Id
server.get("/menu-items/:id", function (req, res, next) {
    var id = req.params.id;
    
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
    var image = meuItem.image;
    var base64Img = image.base64.split(';base64,').pop();
    var imgExtension = image.type.replace('image/', '');
    var imgName = `customer-${customerId}-product-${uuidv4()}.${imgExtension}`;
    var imgPathName = `${pathImages}${sep}${sep}${imgName}`;

    console.log(meuItem);

    fs.writeFileSync(imgPathName, base64Img, 'base64');

    var sql = `INSERT INTO digital_menu.menu_items (name, description, price, img_url) VALUES ('${meuItem.name}', '${meuItem.description}', '${meuItem.price}', '${imgPathName}')`

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

// --

// Get By Id
server.get("/pedidos/:id", function (req, res, next) {
    var customerId = req.params.id;
    var response = [];
    var countPedidosProcessados = 0;
    var qtdPedidos = 0;

    var sqlPedidos = "SELECT * FROM digital_menu.pedidos WHERE id_customer = ? ORDER BY date_hour DESC";
    con.query(sqlPedidos, customerId, function (err, resultPedido, fields) {
        if (err) throw err;
        qtdPedidos = resultPedido.length;
        resultPedido.forEach(pedido => {
            var sqlDetalheItems = "SELECT id_pedido, id_menu, name, price, quantity FROM digital_menu.v_menu_items_pedidos_detalhe WHERE id_pedido = ?";
            con.query(sqlDetalheItems, pedido.id, function (err, resultItems, fields) {
                if (err) throw err;

                response.push({
                    pedido: pedido,
                    detalheItems: resultItems
                });
                countPedidosProcessados++;

                if(countPedidosProcessados === qtdPedidos) {
                    res.send(response);
                }
            });    
        });
    });
});

// Post
server.post("/pedidos", function(req, res, next) {
    var pedido = req.body;
    var checkoutItems = pedido.checkoutItems; 
    var customerId;

    console.log("ID: " + pedido.customerId);
    console.log(pedido);
    if(parseInt(pedido.customerId) > 0) {
        // Usuário já existente;
        customerId = pedido.customerId;
        insertCheckout(pedido, checkoutItems, customerId);
    } else {
        // Primeiro pedido;
        insertCustomer(pedido, checkoutItems, customerId);
    }
    
    res.send("Linhas inseridas com sucesso.");
});

// --

server.listen(8080, function() {
    console.log("Listening at %s", server.url);
});

con.connect(function(err) {
    if(err) throw err;
    console.log("Connected!");
});

console.log("Running");

// --

function selectPedidoItemsDetalhe() {
    
}

function insertCustomer(pedido, checkoutItems, customerId) {
    var sqlCliente = `INSERT INTO digital_menu.clientes (customer_name) VALUES ('${pedido.customerName}')`
    con.query(sqlCliente, function(err, result) {
        if (err) throw err;
        console.log(result);
        customerId = result.insertId;

        insertCheckout(pedido, checkoutItems, customerId);
    });
}

function insertCheckout(pedido, checkoutItems, customerId) {
    var sqlPedido = `INSERT INTO digital_menu.pedidos (id_customer, total, obs) VALUES ('${customerId}', '${pedido.total}', '${pedido.obs}')`
    con.query(sqlPedido, function(err, result) {
        if (err) throw err;
        console.log(result);
        pedidoId = result.insertId;

        insertCheckoutItems(checkoutItems, pedidoId);
    });
}

function insertCheckoutItems(checkoutItems, pedidoId) {
    insertCheckoutItemRecursive(checkoutItems, 0, pedidoId);

    /*checkoutItems.forEach(item => {
        console.dir("Inserindo item: ");
        console.dir(item);
        var sqlMenuItemsPedidos = `INSERT INTO digital_menu.menu_items_pedidos (id_item, id_pedido, quantity, price) VALUES ('${item.itemId}', '${pedidoId}', '${item.quantity}', '${item.price}')`
        con.query(sqlMenuItemsPedidos, function(err, result) {
            if (err) throw err;
            console.log(result);
        });    
    });*/
}

function insertCheckoutItemRecursive(checkoutItems, index, pedidoId) {
    var item = checkoutItems[index];

    console.dir("Inserindo item: ");
    console.dir(item);

    var sqlMenuItemsPedidos = `INSERT INTO digital_menu.menu_items_pedidos (id_item, id_pedido, quantity, price) VALUES ('${item.itemId}', '${pedidoId}', '${item.quantity}', '${item.price}')`
    con.query(sqlMenuItemsPedidos, function(err, result) {
        if (err) throw err;
        console.log(result);

        console.log("Size:" + checkoutItems.length);
        index++;
        if(index < checkoutItems.length) {
            insertCheckoutItemRecursive(checkoutItems, index, pedidoId);
        }
    });    
}

function getImageFromDisk(pathName) {
    const fileExists = fs.existsSync(pathName);
    console.log(pathName);
    console.log(fileExists);
    if(fileExists) {
        fs.readFileSync(pathName, {encoding: 'base64'}, function(err, content) {
            //console.dir(err);
            //console.dir(content);
            return content;
        })
    }
}