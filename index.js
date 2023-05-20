const restify = require("restify");
const mysql = require("mysql");
const corsMiddleware = require("restify-cors-middleware2");

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

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

const TOKEN_NAME = 'Authorization';
const customerId = 1;
const sep = path.sep;
const pathImages = `.${sep}${sep}media${sep}${sep}imgs`;
const pathQRCodes = `.${sep}media${sep}qrcodes`;

const BASE_URL_QRCODE_MESA = 'https://www.cardapil.com.br';

var htmlContentUserActivated = '';

const BASE_URL_SERVER = 'http://localhost:8080';
const REDIRECT_USER_ACTIVATED = './html/user-activated.html';

server.use(restify.plugins.bodyParser({ mapParams: true }));
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.pre(cors.preflight); // Precisa usar restify 7.x.x + restify-cors-middleware para ser compatível com cors preflight.
server.use(cors.actual);

// Filter - Autenticacao
server.pre((req, res, next) => {
    const SUCCESS = 200;
    const ACCESS_DENIED = 401;
    
    console.info(`${req.method} - ${req.url}`);
    
    // Se nao for /login, tenta autenticar.  
    if((req.url != "/login") && (req.url != "/signup") && (req.url != "/signup") && (!req.url.includes("/activate"))) {
        const token = getCleanTokenFromRequest(req);
        console.log("Validando token: " + token);

        if(token  != "") {
            var sql = `SELECT * FROM digital_menu.user_token WHERE token = '${token}'`;

            con.query(sql, function(err, result) {
                if (err) throw err;
                console.log(result)
                if(result.length > 0) {
                    var user = result[0].email;
                    console.log(`Usuario ${user} autenticado`);
                    return next();
                } else {
                    res.send(ACCESS_DENIED);
                }
            });
        } else {
            res.send(ACCESS_DENIED);
        }
        
    } else {
        return next();
    }
});

// Get All
server.get("/mock-endpoint", function(req, res, next) {
    res.send(201, "OK");
});

server.opts("/menu-items", function(req, res, next) {
    console.log(req);
});

// Login
// Post
server.post("/login", function(req, res, next) {
    var credentials = req.body;
    var sql = `SELECT * FROM digital_menu.user_empresa WHERE active = 1 and blocked = 0 and (email = '${credentials.user}' and password = '${credentials.password}')`;

    console.dir(credentials);
    console.log(sql);

    con.query(sql, function (err, result, fields) {

        if (err) throw err;
        console.log(result);

        if(result.length > 0) {
            var token = uuidv4();
            insereUserToken(credentials.user, token);
            token = token + "," + result[0].id_company; // Formatando token no formato: token + id da empresa
            res.send(201, {
                access_token: token
            });
        } else {
            res.send(401, {
                access_token: ""
            });
        }
    });
});


function insereUserToken(email, token) {
    var sql = `INSERT INTO digital_menu.user_token (email, token) VALUES ('${email}', '${token}')`

    console.log(sql);

    con.query(sql, function(err, result) {
        if (err) throw err;
        console.log(result);
    });
}

// Pega o token limpo, sem o codigo da empresa
function getCleanTokenFromRequest(req) {
    const token = req.header(TOKEN_NAME);
    if(token) return token.split(',')[0];
    return '';
    
}


// Pega codigo da empresa contido no token
function getCompanyIdFromRequest(req) {
    const token = req.header(TOKEN_NAME);
    return token.split(',')[1];
}

// APIs - Empresa ----------------------------------------------------------------------------------
// Post
server.post("/signup", function(req, res, next) {
    const company = req.body;

    console.log(company);

    var sqlCompany = `INSERT INTO digital_menu.company (name, active) VALUES ('${company.name}', '1')`;

    console.log(sqlCompany);

    con.query(sqlCompany, function(err, resultCompany) {
        if (err) throw err;
        console.log(resultCompany);
        // Usuario comeca como inativo, para ser ativado via API de ativacao.
        var sqlUser = `INSERT INTO digital_menu.user_empresa (email, password, id_company, blocked, active) VALUES ('${company.user}', '${company.password}', '${resultCompany.insertId}', '0', '0')`;
        
        con.query(sqlUser, function(err, resultUser) {
            if (err) throw err;
            console.log(resultUser);
            res.send("Linhas inseridas: " + resultUser.affectedRows);
        });
    });
});

// Get Activate Accunt
server.get("/activate/:user", function(req, res, next) {
    const user = req.params.user;

    var sql = `UPDATE digital_menu.user_empresa 
                  SET active    = '1'
               WHERE email = '${user}'`

    con.query(sql, function(err, result) {
        if (err) throw err;
        console.log(result);

        if(result.affectedRows == 0) {      

        } else {
            // Monta pagina de login, lendo pagina de resposta do disco, e coloca e-mail do usuario no html.
            res.end(htmlContentUserActivated.replace("<USER>", user));
        }
    });
});

// APIs - Menu Itens ----------------------------------------------------------------------------------

// Get All
server.get("/menu-items", function(req, res, next) {
    const companyId = getCompanyIdFromRequest(req);

    var response = [];
    var countMenuItemsProcessados = 0;
    var sql = "SELECT * FROM digital_menu.menu_items order by id";
    
    con.query(sql, function (err, result, fields) {
        if (err) throw err;
        console.log(result);

        result.forEach(menuItem => {

            const fileExists = fs.existsSync(menuItem.img_url);
            var content = '';

            console.log(fileExists);
            if(fileExists) {
                content = fs.readFileSync(menuItem.img_url, {encoding: 'base64'});
            }
            response.push({
                menuItem: menuItem,
                base64Img: `data:image/png;base64,${content}`
            });
        })

        res.send(response);
    });
});

// Post
server.post("/menu-items", function(req, res, next) {
    const companyId = getCompanyIdFromRequest(req);
    var menuItem = req.body;
    var image = menuItem.image;
    var base64Img = image.base64.split(';base64,').pop();
    var imgExtension = image.type.replace('image/', '');
    var imgName = getImageName(companyId, imgExtension);
    var imgPathName = getImagePathName(imgName);

    console.log(menuItem);

    fs.writeFileSync(imgPathName, base64Img, 'base64');

    var sql = `INSERT INTO digital_menu.menu_items (name, description, price, img_url) VALUES ('${menuItem.name}', '${menuItem.description}', '${menuItem.price}', '${imgPathName}')`

    console.log(sql);

    con.query(sql, function(err, result) {
        if (err) throw err;
        console.log(result);
        res.send("Linhas inseridas: " + result.affectedRows);
    });
});

// Put
server.put("/menu-items", function(req, res, next) {
    const companyId = getCompanyIdFromRequest(req);
    var menuItem = req.body;
    var image = menuItem.image;
    var base64Img = "";
    var imgExtension = "";
    var isImagemAlterada = (image.base64 != "");

    if(isImagemAlterada) {
        base64Img = image.base64.split(';base64,').pop();
        imgExtension = image.type.replace('image/', '');
    }

    console.log("Alterando item de id: %d ", menuItem.id);

    var sqlSelect = "SELECT * FROM digital_menu.menu_items WHERE id = ?";
    con.query(sqlSelect, menuItem.id, function (err, result, fields) {
        if (err) throw err;

        if(isImagemAlterada) {
            var imgName = getImageName(companyId, imgExtension);
            var imgPathName = getImagePathName(imgName);
            fs.writeFileSync(imgPathName, base64Img, 'base64');        }

        var sqlUpdate = `UPDATE digital_menu.menu_items 
                            SET name    = '${menuItem.name}',
                                description = '${menuItem.description}',
                                price = '${menuItem.price}',
                                img_url = ` + (isImagemAlterada ? `'${imgPathName}'` : 'img_url') +
                        ` WHERE id = ${menuItem.id}`;

        console.log(sqlUpdate);

        con.query(sqlUpdate, function(err, result) {
            if (err) throw err;
            console.log(result);
            res.send("Linhas alteradas: " + result.affectedRows);
        });
    });
});

// Delete
server.del("/menu-items/:id", function(req, res, next) {
    const companyId = getCompanyIdFromRequest(req);
    var id = req.params.id;
    console.log("Deletando item de ID: %d", id);

    var sql = "DELETE FROM digital_menu.menu_items WHERE id = ?";
    
    con.query(sql, id, function (err, result, fields) {
        if (err) throw err;
        console.log(result);
        res.send("Linhas deletadas" + result.affectedRows);
    });
});

// APIs - Mesas ----------------------------------------------------------------------------------

// Get All
server.get("/mesas", function(req, res, next) {
    const companyId = getCompanyIdFromRequest(req);
    var response = [];

    console.log(req);
    console.log(req.header("Authorization"));
    
    var sql = "SELECT * FROM digital_menu.mesa_empresa";
    con.query(sql, function (err, resultMesas, fields) {
        if (err) throw err;
        console.log(resultMesas);
        
        resultMesas.forEach(mesa => {
            const qrCodePathName = mesa.qrcode_url;
            const fileExists = fs.existsSync(qrCodePathName);
            var base64QRCode = '';
            var content = '';
            if(fileExists) {
                content = fs.readFileSync(qrCodePathName, {encoding: 'base64'});
                
            }
            base64QRCode = `data:image/png;base64,${content}`;
            response.push({
                mesa,
                base64QRCode
            });
        });

        console.dir(response);
        res.send(response);
    });
});

// Patch
server.patch("/mesas", function(req, res, next) {
    const companyId = getCompanyIdFromRequest(req);
    var mesa = req.body;

    console.log("Patch em mesa de número: %d ", mesa.tableNumber);
    console.dir(mesa);

    var sql = `UPDATE digital_menu.mesa_empresa 
                  SET complement    = '${mesa.complement}'
               WHERE table_number = '${mesa.tableNumber}'
                 AND id_company   = '${companyId}'`

    con.query(sql, function(err, result) {
        if (err) throw err;
        console.log(result);

        if(result.affectedRows == 0) {      

            const qrCodeName = getQRCodeName(companyId);
            const qrCodePathName = getQRCodePathName(qrCodeName);
            const qrCodeURl = `${BASE_URL_QRCODE_MESA}/${companyId}/${mesa.tableNumber}`;

            QRCode.toFile(qrCodePathName, qrCodeURl, {
                errorCorrectionLevel: 'H'
            }, function(err) {
                if (err) throw err;
                console.log('QR code saved!');    

                var sqlInsert = `INSERT INTO digital_menu.mesa_empresa (table_number, id_company, complement, qrcode_url) VALUES ('${mesa.tableNumber}', '${companyId}', '${mesa.complement}', '${qrCodePathName}')`;
                con.query(sqlInsert, function(err, result) {
                    if (err) throw err;
                    console.log(result);
                    res.send("Linhas inseridas: " + result.affectedRows);
                });
            });
        } else {
            res.send("Linhas alteradas: " + result.affectedRows);
        }
    });
});

// Delete
server.del("/mesas/:tableNumber", function(req, res, next) {
    const companyId = getCompanyIdFromRequest(req);
    var tableNumber = req.params.tableNumber;
    console.log("Deletando mesa de número: %d", tableNumber);

    var sql = "DELETE FROM digital_menu.mesa_empresa WHERE table_number = ?";
    
    con.query(sql, tableNumber, function (err, result, fields) {
        if (err) throw err;
        console.log(result);
        res.send("Linhas deletadas" + result.affectedRows);
    });
});

// APIs - Pedidos ----------------------------------------------------------------------------------

// Get By Id
server.get("/pedidos/:id", function (req, res, next) {
    var id = req.params.id;

    var sqlDetalheItems = "SELECT id_pedido, id_menu, name, price, quantity FROM digital_menu.v_menu_items_pedidos_detalhe WHERE id_pedido = ?";
    con.query(sqlDetalheItems, id, function (err, resultItems, fields) {
        if (err) throw err;
        res.send(resultItems);
    });
});

// Get By Id Customer
server.get("/pedidos-by-customer-id/:id", function (req, res, next) {
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

// Get By Period (Historico de pedidos)
server.get("/pedidos/:initialDate/:finalDate", function (req, res, next) {
    var initialDate = req.params.initialDate;
    var finalDate = req.params.finalDate;
    initialDate = initialDate + " 00:00:00";
    finalDate = finalDate + " 23:59:50";

    console.log(initialDate);
    console.log(finalDate);

    //'2018-01-01 12:00:00' AND '2018-01-01 23:30:00'

    var sqlPedidos = `SELECT * FROM digital_menu.v_historico_pedidos WHERE date_hour BETWEEN '${initialDate}' AND '${finalDate}'`;
    con.query(sqlPedidos, function (err, resultPedido, fields) {
        if (err) throw err;
        res.send(resultPedido);
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
        // Usuário já existente, cadastra apenas o pedido.
        customerId = pedido.customerId;
        insertCheckout(pedido, checkoutItems, customerId);
    } else {
        // Primeiro pedido, cadastra usuario e depois pedido.
        insertCustomer(pedido, checkoutItems, customerId);
    }
    
    res.send("Linhas inseridas com sucesso.");
});

// -----------------------------------------------------------------------------------------------

server.listen(8080, function() {
    console.log("Listening at %s", server.url);
});

con.connect(function(err) {
    if(err) throw err;
    console.log("Connected!");
});

fs.readFile('./html/user-activated.html', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    htmlContentUserActivated = data;
  });

console.log("Running");

// --

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

function getImageName(companyId, imgExtension) {
    return `company-${companyId}-product-${uuidv4()}.${imgExtension}`;
}

function getImagePathName(imgName) {
    return `${pathImages}${sep}${sep}${imgName}`;
}

function getQRCodeName(companyId) {
    return `company-${companyId}-qrcode-${uuidv4()}.png`;
}

function getQRCodePathName(qrCodeName) {
    return `${pathQRCodes}${sep}${qrCodeName}`;
}