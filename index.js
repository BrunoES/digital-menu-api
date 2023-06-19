const restify = require("restify");
const mysql = require("mysql2");
const corsMiddleware = require("restify-cors-middleware2");

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

const TOKEN_NAME = 'Authorization';
const sep = path.sep;
const pathImages = `.${sep}${sep}media${sep}${sep}imgs`;
const pathQRCodes = `.${sep}${sep}media${sep}${sep}qrcodes`;

const BASE_IP = 'localhost';
const BASE_IP_DB = 'mysql://3j0qq9io32xqorb45tmi:pscale_pw_1FjEmrBrWecLqMpqdjqKUaHb61nhbWnMwcKDt4IoXO8@aws.connect.psdb.cloud/digital_menu?ssl={"rejectUnauthorized":true}';

const BASE_URL_QRCODE_MESA = `http://${BASE_IP}:3000`;
//const BASE_URL_QRCODE_MESA = 'http://192.168.0.18:3000';
//const BASE_URL_QRCODE_MESA = 'https://www.cardapil.com.br';

const BASE_URL_SERVER = `http://${BASE_IP}:8080`;
const BASE_URL_FRONTEND = `http://${BASE_IP}:9091`;

const REDIRECT_LOGIN = `${BASE_URL_FRONTEND}/login`;
const REDIRECT_USER_ACTIVATED = `${BASE_URL_FRONTEND}/user-activated`;
const REDIRECT_CHANGE_PASSWORD = `${BASE_URL_FRONTEND}/change-password`;

const TO_CHANGE = "TO_CHANGE";

const cors = corsMiddleware({
    origins: ["*"], // ""http://localhost:9091" http://localhost:3000"
    allowHeaders: ["Access-Control-Allow-Origin", "*"],
    exposeHeaders: ["*"]
  });

//const con = mysql.createConnection(BASE_IP_DB);
const con = mysql.createConnection('mysql://7fsfqg7492g1g9krbdhi:pscale_pw_VChqRT2vsK8prMD4pXCzcnd8AV2LFEKITd4U8uwQmJn@aws.connect.psdb.cloud/digital_menu?ssl={"rejectUnauthorized":true}');

/*
const con = mysql.createConnection({
    host    : 'aws.connect.psdb.cloud',
    user    : '6ftynju4igeodxkgzfyj',
    password: 'pscale_pw_g9LKxW27Ly5taLkQa8Y0BY8Rzoj2ZgXEs4CRV5i3q3d',
    port    : '3306',
    database: 'digital_menu'
});
*/
  /*
  var con = mysql.createConnection({
      host: BASE_IP_DB,
      user: "ys7vsalmafwtqvcy2mpo",
      password: "pscale_pw_umtVC5kH4H0I8mJJPHhvp3SGSM3uwNsIqdr8KDswoUY"
  });
  */

  const server = restify.createServer({
    name: "digital-menu-api",
    version: "1.0.0"
  });
  
  const mailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: 'suporte.cardapil@gmail.com',
          pass: 'pdktiohicekupata'
      }
  });

server.use(restify.plugins.bodyParser({ mapParams: true }));
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.pre(cors.preflight); // Precisa usar restify 7.x.x + restify-cors-middleware para ser compatível com cors preflight.
server.use(cors.actual);

// Tratamento de erros.
function handleError(err, res) {
    if (err) {
        console.dir(err);
        res.send(500, "Internal Server Error");
        return false
    }
    return true;
}

function isAuthUrl(url) {
    return ((url != "/login") &&
            (url != "/signup") &&
            (url != "/signup") &&
            (url != "/request-change-password") &&
            (!url.includes("/external")) &&
            (!url.includes("/activate")) &&
            (!url.includes("/redirect-change-password")) &&
            (!url.includes("/change-password")));
}

// Filter - Autenticacao
server.pre((req, res, next) => {
    try {
        const SUCCESS = 200;
        const ACCESS_DENIED = 401;
        
        console.info(`${req.method} - ${req.url}`);
        
        // Se nao for /login, tenta autenticar.  
        if(isAuthUrl(req.url)) {
            const token = getCleanTokenFromRequest(req);
            console.log("Validando token: " + token);

            if(token  != "") {
                var sql = `SELECT * FROM digital_menu.user_token WHERE token = '${token}' AND expired = '0'`;

                con.query(sql, function(err, result) {
                    if (!handleError(err, res)) return;
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
            console.log("entrei false")
            return next();
        }
    } catch(e) {
        handleError(e ,res);
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
    try {
        var credentials = req.body;
        var escapedUser = escapeSQL(credentials.user);
        var escapedPassword = escapeSQL(credentials.password);

        console.log(escapedUser);
        console.log(escapedPassword);
        
        var sql = `SELECT * FROM digital_menu.v_company_user WHERE user_active = 1 and user_blocked = 0 and (user_email = ${escapedUser} and user_password = ${escapedPassword})`;

        console.dir(credentials);
        console.log(sql);

        con.query(sql, function (err, result, fields) {
            if (!handleError(err, res)) return;
            console.log(result);

            if(result.length > 0) {
                var token = uuidv4();
                invalidaInsereUserTokens(escapedUser, token, res);
                token = token + "," + result[0].id_company + "," + result[0].company_name; // Formatando token no formato: token + id da empresa + nome da empresa.

                res.send(201, {
                    access_token: token
                });
            } else {
                res.send(401, {
                    access_token: ""
                });
            }
        });
    } catch(e) {
        handleError(e ,res);
    }
});


function insereUserToken(email, token, res) {
    try {
        var sql = `INSERT INTO digital_menu.user_token (email, token) VALUES (${email}, '${token}')`

        console.log(sql);

        con.query(sql, function(err, result) {
            if (!handleError(err, res)) return;
            console.log(result);
        });
    } catch(e) {
        handleError(e ,res);
    }
}

function invalidaInsereUserTokens(email, token, res) {
    try {
        var sql = `UPDATE digital_menu.user_token 
                    SET expired = '1'
                    WHERE email = ${email}`;

        con.query(sql, function(err, result) {
            if (!handleError(err, res)) return;
            console.log(result);

            if(result.affectedRows == 0) {      
                console.log(`Nenhum token invalidado para o user ${email}`);
            } else {
                if(token != "") {
                    insereUserToken(email, token, res);
                }
            }
        });
    } catch(e) {
        handleError(e ,res);
    }
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

// Get By Id
// Retorna dados da empresa logada.
server.get("/company", function (req, res, next) {
    try {
        const companyId = getCompanyIdFromRequest(req);
        var base64Img = '';

        var sql = "SELECT * FROM digital_menu.company WHERE id = ?";
        con.query(sql, companyId, function (err, result, fields) {
            if (!handleError(err, res)) return;

            var company;
            var content;

            if(result.length > 0 ) {
                company = result[0];
                console.log(company);
                const fileExists = fs.existsSync(company.logo_url);

                console.log(fileExists);
                if(fileExists) {
                    content = fs.readFileSync(company.logo_url, {encoding: 'base64'});
                    base64Img = `data:image/png;base64,${content}`;
                }
            }

            res.send({
                name: company.name,
                base64Img: base64Img
            });
        });
    } catch(e) {
        handleError(e ,res);
    }
});

// Get By Id
// Retorna dados da empresa logada.
server.get("/company-user", function (req, res, next) {
    try {
        const companyId = getCompanyIdFromRequest(req);
        var base64Img = '';

        var sql = "SELECT company_name, id_company, logo_url, user_email FROM digital_menu.v_company_user WHERE id_company = ?";
        con.query(sql, companyId, function (err, result, fields) {
            if (!handleError(err, res)) return;
            var company;
            var content;

            if(result.length > 0 ) {
                company = result[0];
                console.log(company);
                const fileExists = fs.existsSync(company.logo_url);

                console.log(fileExists);
                if(fileExists) {
                    content = fs.readFileSync(company.logo_url, {encoding: 'base64'});
                    base64Img = `data:image/png;base64,${content}`;
                }
            }

            res.send({
                company,
                base64Img: base64Img
            });
        });
    } catch(e) {
        handleError(e ,res);
    }
});

// Salva logo da empresa
server.post("/company/logo", function (req, res, next) {
    try {
        const companyId = getCompanyIdFromRequest(req);
        var image = req.body.image;
        var base64Img = image.base64.split(';base64,').pop();
        var imgExtension = image.type.replace('image/', '');
        var imgName = getImageName(companyId, "logo", imgExtension);
        var imgPathName = getImagePathName(imgName);

        console.log(base64Img);
        console.log(imgPathName);

        fs.writeFileSync(imgPathName, base64Img, 'base64');

        var sqlUpdate = `UPDATE digital_menu.company 
                            SET logo_url = '${imgPathName}'
                        WHERE id = ${companyId}`;

        console.log(sqlUpdate);

        con.query(sqlUpdate, function(err, result) {
            if (!handleError(err, res)) return;
            console.log(result);
            res.send("Linhas alteradas: " + result.affectedRows);
        });
    } catch(e) {
        handleError(e ,res);
    }
});

server.put("/company", function (req, res, next) {
    try {
        const companyId = getCompanyIdFromRequest(req);
        var company = req.body;

        console.log(company);

        var name = company.name;
        var email = company.user;
        var password = company.password;

        var sql = "SELECT * FROM digital_menu.v_company_user WHERE id_company = ?";
        con.query(sql, companyId, function (err, result, fields) {
            if (!handleError(err, res)) return;
            var companyData = result[0];
            var originalName = companyData.company_name;
            var originalEmail = companyData.user_email;
            var originalPassword = companyData.user_password;

            if(name == "") name = originalName;
            if(email == "") email = originalEmail;
            if(password == "") password = originalPassword;

            // Atualiza dados da empresa.
            var sqlUpdateCompany = `UPDATE digital_menu.company 
                                    SET name = '${name}'
                                    WHERE id   = '${companyId}';`;

            // Atualiza dados do usuaio, e inativa o mesmo para confirmação via link enviado no e-mail.
            var sqlUpdateUser = `UPDATE digital_menu.user_empresa 
                                    SET email    = '${email}',
                                        password = '${password}',
                                        active   = '0'
                                WHERE email    = '${originalEmail}';`;
            
            con.query(sqlUpdateCompany, function(err, resultCompany) {
                if (!handleError(err, res)) return;
                console.log(resultCompany);

                con.query(sqlUpdateUser, function(err, resultUser) {
                    if (!handleError(err, res)) return;
                    console.log(resultUser);

                    sendChangeAccountDataMail(originalName, originalEmail);
                    res.send(200, "");
                });
            });
        });
    } catch(e) {
        handleError(e ,res);
    }
});

server.post("/signup", function(req, res, next) {
    try {
        const company = req.body;
        console.log(company);
        var sqlCompany = `INSERT INTO digital_menu.company (name, active) VALUES ('${company.name}', '1')`;

        console.log(sqlCompany);

        con.query(sqlCompany, function(err, resultCompany) {
            if (!handleError(err, res)) return;
            console.log(resultCompany);
            // Usuario comeca como inativo, para ser ativado via API de ativacao.
            var sqlUser = `INSERT INTO digital_menu.user_empresa (email, password, id_company, blocked, active) VALUES ('${company.user}', '${company.password}', '${resultCompany.insertId}', '0', '0')`;
            
            con.query(sqlUser, function(err, resultUser) {
                if (!handleError(err, res)) return;
                console.log(resultUser);

                sendActivateMail(company.name, company.user);

                res.send("Linhas inseridas: " + resultUser.affectedRows);
            });
        });
    } catch(e) {
        handleError(e ,res);
    }
});

server.post("/change-password", function(req, res, next) {
    try {
        const newPassword = req.body.password;
        const uuidTokenChangePassword = req.body.token;

        console.log("Token: " + uuidTokenChangePassword);

        if(uuidTokenChangePassword != '') {
            var sqlConsulta = `SELECT * FROM digital_menu.user_empresa WHERE temp_token_change_pass = '${uuidTokenChangePassword}'`;
            con.query(sqlConsulta, function (err, resultConsulta, fields) {
                if (!handleError(err, res)) return;
                console.log(resultConsulta);
    
                if(resultConsulta.length > 0) {
                    invalidaInsereUserTokens(`'${resultConsulta[0].email}'`, '', res);

                    var sql = `UPDATE digital_menu.user_empresa 
                        SET temp_token_change_pass = '',
                            password = '${newPassword}'
                        WHERE active = 1
                        and blocked = 0
                        and temp_token_change_pass = '${uuidTokenChangePassword}'
                        and temp_token_change_pass is not null`;

                    con.query(sql, function(err, result) {
                        if (!handleError(err, res)) return;
                        console.log(result);

                        if(result.affectedRows == 0) {      
                            res.send(404, "");
                        } else {
                            res.send(200, "");
                        }
                    });                    
                } else {
                    res.send(404, "");
                }
            });
        }
    } catch(e) {
        handleError(e ,res);
    }
});

server.post("/request-change-password", function(req, res, next) {
    try {
        const user = req.body.user;
        var sql = `SELECT * FROM digital_menu.user_empresa WHERE active = 1 and blocked = 0 and email = '${user}'`;

        console.log(sql);

        con.query(sql, function (err, result, fields) {

            if (!handleError(err, res)) return;
            console.log(result);

            if(result.length > 0) {
                    const uuidTokenChangePassword = uuidv4();
                    var sqlUpdate = `UPDATE digital_menu.user_empresa SET temp_token_change_pass = '${uuidTokenChangePassword}' WHERE email = '${user}'`;
                    console.log(sqlUpdate);
                    con.query(sqlUpdate, function(errUpdate, resultUpdate) {
                        if (!handleError(errUpdate, res)) return;
                        console.log(resultUpdate);
            
                        if(resultUpdate.affectedRows > 0) {
                            sendChangePasswordeMail(user, uuidTokenChangePassword);
                            changeUserToRedefinePassword(user, res);
                            res.send(200, "");
                        } else {
                            res.send(404, "");            
                        }
                    });
            } else {
                res.send(404, "");
            }
        });
    } catch(e) {
        handleError(e ,res);
    }
});

function changeUserToRedefinePassword(user, res) {
    try {
        var sql = `UPDATE digital_menu.user_empresa 
                      SET temp_token_change_pass = '${TO_CHANGE}'
                    WHERE email = '${user}'
                      and temp_token_change_pass = ''`;

        con.query(sql, function(err, result) {
            if (!handleError(err, res)) return;
            console.log(result);
        });
    } catch(e) {
        handleError(e ,res);
    }
}

// Get Change password through e-mail
server.get("/redirect-change-password/:uuidTokenChangePassword", function(req, res, next) {
    try {
        const uuidTokenChangePassword = req.params.uuidTokenChangePassword;

        var sql = `SELECT * FROM digital_menu.user_empresa WHERE temp_token_change_pass = '${uuidTokenChangePassword}'`;
        console.log(sql);
        con.query(sql, function (err, result, fields) {
            if (!handleError(err, res)) return;
            console.log(result);

            if(result.length > 0) {
                res.redirect(`${REDIRECT_CHANGE_PASSWORD}?uuidTokenChangePassword=${uuidTokenChangePassword}`, next)
            } else {
                res.redirect(`${REDIRECT_LOGIN}`, next)
            }
        });
    } catch(e) {
        handleError(e ,res);
    }
});

function sendChangeAccountDataMail(name, email) {
    var mailOptions = {
        from: 'suporte.cardapil@gmail.com',
        to: email,
        subject: 'Cardapil - Alteração de dados da sua conta',
        html: `<html><body>Olá ${name}, houveram alterações nos dados cadastrais de sua conta, dados como Nome da sua empresa, e-mail, ou senha de acesso foram alterados.<br>
        Se você não reconhece esta alteração de dados entre em contato conosco, caso tenha sido você mesmo, apenas clique <a href='${BASE_URL_SERVER}/activate/${email}'>aqui</a> <br>
        para ativar sua conta e continuar utilizando nossa plataforma.
        <BR><BR> Tenha um ótimo uso da plataforma!</body></html>`        
    };

    mailTransporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

function sendActivateMail(name, email) {
    var mailOptions = {
        from: 'suporte.cardapil@gmail.com',
        to: email,
        subject: 'Cardapil - Ative sua conta!',
        html: `<html><body>Olá ${name}, clique <a href='${BASE_URL_SERVER}/activate/${email}'>aqui</a> para ativar sua conta.
        <BR><BR> Tenha um ótimo uso da plataforma!</body></html>`        
    };

    mailTransporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

function sendChangePasswordeMail(email, uuidTokenChangePassword) {
    var mailOptions = {
        from: 'suporte.cardapil@gmail.com',
        to: email,
        subject: 'Cardapil - Redefinição de senha',
        html: `<html><body>Olá, clique <a href='${BASE_URL_SERVER}/redirect-change-password/${uuidTokenChangePassword}'>aqui</a> para redefinir sua senha.
        <BR><BR> Tenha um ótimo uso da plataforma!</body></html>`        
    };

    mailTransporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

// Get Activate Accunt
server.get("/activate/:user", function(req, res, next) {
    try {
        const user = req.params.user;
        var sql = `UPDATE digital_menu.user_empresa 
                    SET active    = '1'
                WHERE email = '${user}'`

        con.query(sql, function(err, result) {
            if (!handleError(err, res)) return;
            console.log(result);

            if(result.affectedRows == 0) {      

            } else {
                // Monta pagina de login, lendo pagina de resposta do disco, e coloca e-mail do usuario no html.
                res.redirect(`${REDIRECT_USER_ACTIVATED}?user=${user}`, next)
            }
        });
    } catch(e) {
        handleError(e ,res);
    }
});

// APIs - Menu Itens ----------------------------------------------------------------------------------

// Get All
server.get("/menu-items", function(req, res, next) {
    try {
        const companyId = getCompanyIdFromRequest(req);
        var response = [];
        var sql = `SELECT * FROM digital_menu.menu_items where id_company = '${companyId}' order by id`;
        
        con.query(sql, function (err, result, fields) {
            if (!handleError(err, res)) return;
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
    } catch(e) {
        handleError(e ,res);
    }
});

// Post
server.post("/menu-items", function(req, res, next) {
    try {
        const companyId = getCompanyIdFromRequest(req);
        var menuItem = req.body;
        var image = menuItem.image;
        var base64Img = image.base64.split(';base64,').pop();
        var imgExtension = image.type.replace('image/', '');
        var imgName = getImageName(companyId, "product", imgExtension);
        var imgPathName = getImagePathName(imgName);

        console.log(menuItem);

        fs.writeFileSync(imgPathName, base64Img, 'base64');

        var sql = `INSERT INTO digital_menu.menu_items (id_company, name, description, price, img_url) VALUES ('${companyId}', '${menuItem.name}', '${menuItem.description}', '${menuItem.price}', '${imgPathName}')`

        console.log(sql);

        con.query(sql, function(err, result) {
            if (!handleError(err, res)) return;
            console.log(result);
            res.send("Linhas inseridas: " + result.affectedRows);
        });
    } catch(e) {
        handleError(e ,res);
    }
});

// Put
server.put("/menu-items", function(req, res, next) {
    try {
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
            if (!handleError(err, res)) return;

            if(isImagemAlterada) {
                var imgName = getImageName(companyId, "product", imgExtension);
                var imgPathName = getImagePathName(imgName);
                fs.writeFileSync(imgPathName, base64Img, 'base64');        }

            var sqlUpdate = `UPDATE digital_menu.menu_items 
                                SET name    = '${menuItem.name}',
                                    description = '${menuItem.description}',
                                    price = '${menuItem.price}',
                                    img_url = ` + (isImagemAlterada ? `'${imgPathName}'` : 'img_url') +
                            ` WHERE id = ${menuItem.id} AND id_company = ${companyId}`;

            console.log(sqlUpdate);

            con.query(sqlUpdate, function(err, result) {
                if (!handleError(err, res)) return;
                console.log(result);
                res.send("Linhas alteradas: " + result.affectedRows);
            });
        });
    } catch(e) {
        handleError(e ,res);
    }
});

// Delete
server.del("/menu-items/:id", function(req, res, next) {
    try {
        const companyId = getCompanyIdFromRequest(req);
        var id = req.params.id;
        console.log("Deletando item de ID: %d", id);

        var sql = `DELETE FROM digital_menu.menu_items WHERE id = '${id}' AND id_company = '${companyId}'`;
        
        con.query(sql, function (err, result, fields) {
            if (!handleError(err, res)) return;
            console.log(result);
            res.send("Linhas deletadas" + result.affectedRows);
        });
    } catch(e) {
        handleError(e ,res);
    }
});

// APIs - Mesas ----------------------------------------------------------------------------------

// Get All
server.get("/mesas", function(req, res, next) {
    try {
        const companyId = getCompanyIdFromRequest(req);
        var response = [];

        console.log(req);
        console.log(req.header("Authorization"));
        
        var sql = `SELECT * FROM digital_menu.mesa_empresa WHERE id_company = '${companyId}'`;
        con.query(sql, function (err, resultMesas, fields) {
            if (!handleError(err, res)) return;
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
    } catch(e) {
        handleError(e ,res);
    }
});

// Patch
server.patch("/mesas", function(req, res, next) {
    try {
        const companyId = getCompanyIdFromRequest(req);
        var mesa = req.body;

        console.log("Patch em mesa de número: %d ", mesa.tableNumber);
        console.dir(mesa);

        var sql = `UPDATE digital_menu.mesa_empresa 
                    SET complement    = '${mesa.complement}'
                WHERE table_number = '${mesa.tableNumber}'
                    AND id_company   = '${companyId}'`

        con.query(sql, function(err, result) {
            if (!handleError(err, res)) return;
            console.log(result);

            if(result.affectedRows == 0) {      

                const qrCodeName = getQRCodeName(companyId);
                const qrCodePathName = getQRCodePathName(qrCodeName);
                const qrCodeURl = `${BASE_URL_QRCODE_MESA}/?c=${companyId}&m=${mesa.tableNumber}`;

                QRCode.toFile(qrCodePathName, qrCodeURl, {
                    errorCorrectionLevel: 'H'
                }, function(err) {
                    if (!handleError(err, res)) return;
                    console.log('QR code saved!');    

                    var sqlInsert = `INSERT INTO digital_menu.mesa_empresa (table_number, id_company, complement, qrcode_url) VALUES ('${mesa.tableNumber}', '${companyId}', '${mesa.complement}', '${qrCodePathName}')`;
                    con.query(sqlInsert, function(err, result) {
                        if (!handleError(err, res)) return;
                        console.log(result);
                        res.send("Linhas inseridas: " + result.affectedRows);
                    });
                });
            } else {
                res.send("Linhas alteradas: " + result.affectedRows);
            }
        });
    } catch(e) {
        handleError(e ,res);
    }
});

// Delete
server.del("/mesas/:tableNumber", function(req, res, next) {
    try {
        const companyId = getCompanyIdFromRequest(req);
        var tableNumber = req.params.tableNumber;
        console.log("Deletando mesa de número: %d", tableNumber);

        var sql = `DELETE FROM digital_menu.mesa_empresa WHERE table_number = '${tableNumber}' AND id_company = ${companyId}`;
        
        con.query(sql, function (err, result, fields) {
            if (!handleError(err, res)) return;
            console.log(result);
            res.send("Linhas deletadas" + result.affectedRows);
        });
    } catch(e) {
        handleError(e ,res);
    }
});

// APIs - Pedidos ----------------------------------------------------------------------------------

// Get By Id
server.get("/pedidos/:id", function (req, res, next) {
    try {
        var id = req.params.id;

        var sqlDetalheItems = "SELECT * FROM digital_menu.v_menu_items_pedidos_detalhe WHERE id_pedido = ?";
        con.query(sqlDetalheItems, id, function (err, resultItems, fields) {
            if (!handleError(err, res)) return;
            res.send(resultItems);
        });
    } catch(e) {
        handleError(e ,res);
    }
});

// Get Full checkoutBy Period (Historico de pedidos)
server.get("/pedidos-full/:initialDateHour/:finalDateHour", function (req, res, next) {
    try {
        const companyId = getCompanyIdFromRequest(req);
        var initialDateHour = req.params.initialDateHour.replace("T", " ");
        var finalDateHour = req.params.finalDateHour.replace("T", " ");

        console.log(initialDateHour);
        console.log(finalDateHour);

        var response = [];
        var countPedidosProcessados = 0;
        var qtdPedidos = 0;

        console.log(`SELECT * FROM digital_menu.v_historico_pedidos WHERE date_hour BETWEEN '${initialDateHour}' AND '${finalDateHour}' AND id_company = ${companyId} ORDER BY date_hour DESC`);

        var sqlPedidos = `SELECT * FROM digital_menu.v_historico_pedidos WHERE date_hour BETWEEN '${initialDateHour}' AND '${finalDateHour}' AND id_company = ${companyId} ORDER BY date_hour DESC`;
        con.query(sqlPedidos, function (err, resultPedido, fields) {
            if (!handleError(err, res)) return;
            qtdPedidos = resultPedido.length;
            resultPedido.forEach(pedido => {
                var sqlDetalheItems = "SELECT * FROM digital_menu.v_menu_items_pedidos_detalhe WHERE id_pedido = ?";
                con.query(sqlDetalheItems, pedido.id_pedido, function (err, resultItems, fields) {
                    if (!handleError(err, res)) return;

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
    } catch(e) {
        handleError(e ,res);
    }
});

// Get By Period (Historico de pedidos)
server.get("/pedidos/:initialDate/:finalDate", function (req, res, next) {
    try {
        const companyId = getCompanyIdFromRequest(req);
        var initialDate = req.params.initialDate;
        var finalDate = req.params.finalDate;
        initialDate = initialDate + " 00:00:00";
        finalDate = finalDate + " 23:59:50";

        console.log(initialDate);
        console.log(finalDate);

        var sqlPedidos = `SELECT * FROM digital_menu.v_historico_pedidos WHERE date_hour BETWEEN '${initialDate}' AND '${finalDate}' AND id_company = ${companyId}`;
        con.query(sqlPedidos, function (err, resultPedido, fields) {
            if (!handleError(err, res)) return;
            res.send(resultPedido);
        });
    } catch(e) {
        handleError(e ,res);
    }
});

// Post
server.post("/pedidos/check", function(req, res, next) {
    try {
        const companyId = getCompanyIdFromRequest(req);
        var pedidoId = req.body.pedidoId;

        var sql = `UPDATE digital_menu.pedidos 
                    SET checked = '1'
                    WHERE id = '${pedidoId}' AND id_company = '${companyId}'`;

        con.query(sql, function(err, result) {
            if (!handleError(err, res)) return;
            console.log(result);

            if(result.affectedRows == 0) {      
                res.send(500);
            } else {
                res.send(201);
            }
        });
    } catch(e) {
        handleError(e ,res);
    }
});

// Post
server.get("/pedidos/count", function(req, res, next) {
    try {
        const companyId = getCompanyIdFromRequest(req);
        var sql = `SELECT count(*) as count FROM digital_menu.pedidos WHERE id_company = ?`;

        console.log(sql);
        con.query(sql, companyId, function (err, result, fields) {
            if (!handleError(err, res)) return;
            if(result.length > 0) {      
                res.send( { count : result[0].count } ) ;
            } else {
                res.send( { count : 0 } );
            }
        });
    } catch(e) {
        handleError(e ,res);
    }
});

// -----------------------------------------------------------------------------------------------

// - External APIS: ------------------------------------------------------------------------------

// Get All
server.get("/external/menu-items/:companyId", function(req, res, next) {
    try {
        var companyId = req.params.companyId;
        var response = [];
        var sql = `SELECT * FROM digital_menu.menu_items where id_company = '${companyId}' order by id`;
        
        con.query(sql, function (err, result, fields) {
            if (!handleError(err, res)) return;
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
    } catch(e) {
        handleError(e ,res);
    }
});

// Get By Id Customer
server.get("/external/pedidos/:customerId", function (req, res, next) {
    try {
        var customerId = req.params.customerId;
        var response = [];
        var countPedidosProcessados = 0;
        var qtdPedidos = 0;

        var sqlPedidos = "SELECT * FROM digital_menu.v_pedidos_company WHERE id_customer = ? ORDER BY date_hour DESC";
        con.query(sqlPedidos, customerId, function (err, resultPedido, fields) {
            if (!handleError(err, res)) return;
            qtdPedidos = resultPedido.length;
            resultPedido.forEach(pedido => {
                var sqlDetalheItems = "SELECT id_pedido, id_menu, name, price, quantity FROM digital_menu.v_menu_items_pedidos_detalhe WHERE id_pedido = ?";
                con.query(sqlDetalheItems, pedido.id, function (err, resultItems, fields) {
                    if (!handleError(err, res)) return;

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
    } catch(e) {
        handleError(e ,res);
    }
});

// Post
server.post("/external/pedidos", function(req, res, next) {
    try {
        var pedido = req.body;
        var checkoutItems = pedido.checkoutItems; 
        var customerId;

        console.log("ID Customer: " + pedido.customerId);
        console.log("ID Company: " + pedido.companyId);
        console.log("Table Number: " + pedido.tableNumber);
        console.log(pedido);
        if(parseInt(pedido.customerId) > 0) {
            // Usuário já existente, cadastra apenas o pedido.
            customerId = pedido.customerId;
            insertCheckout(pedido, checkoutItems, customerId, res);
        } else {
            // Primeiro pedido, cadastra usuario e depois pedido.
            insertCustomer(pedido, checkoutItems, customerId, res);
        }
        
        res.send("Linhas inseridas com sucesso.");
    } catch(e) {
        handleError(e ,res);
    }
});

// -----------------------------------------------------------------------------------------------

server.listen(8080, function() {
    console.log("Listening at %s", server.url);
});

con.connect(function(err) {
    if(err) throw err;
    console.log("Connected!");
});

// --

function escapeSQL(value) {
    return con.escape(value);
}

// --

function insertCustomer(pedido, checkoutItems, customerId, res) {
    var sqlCliente = `INSERT INTO digital_menu.clientes (customer_name) VALUES ('${pedido.customerName}')`
    con.query(sqlCliente, function(err, result) {
        if (!handleError(err, res)) return;
        console.log(result);
        customerId = result.insertId;

        insertCheckout(pedido, checkoutItems, customerId, res);
    });
}

function insertCheckout(pedido, checkoutItems, customerId, res) {
    var sqlPedido = `INSERT INTO digital_menu.pedidos (id_customer, id_company, table_number, total, obs) VALUES ('${customerId}', '${pedido.companyId}', '${pedido.tableNumber}', '${pedido.total}', '${pedido.obs}')`
    con.query(sqlPedido, function(err, result) {
        if (!handleError(err, res)) return;
        console.log(result);
        pedidoId = result.insertId;

        insertCheckoutItems(checkoutItems, pedidoId);
    });
}

function insertCheckoutItems(checkoutItems, pedidoId, res) {
    insertCheckoutItemRecursive(checkoutItems, 0, pedidoId, res);
}

function insertCheckoutItemRecursive(checkoutItems, index, pedidoId, res) {
    var item = checkoutItems[index];

    console.dir("Inserindo item: ");
    console.dir(item);

    var sqlMenuItemsPedidos = `INSERT INTO digital_menu.menu_items_pedidos (id_item, id_pedido, quantity, price) VALUES ('${item.itemId}', '${pedidoId}', '${item.quantity}', '${item.price}')`
    con.query(sqlMenuItemsPedidos, function(err, result) {
        if (!handleError(err, res)) return;
        console.log(result);

        console.log("Size:" + checkoutItems.length);
        index++;
        if(index < checkoutItems.length) {
            insertCheckoutItemRecursive(checkoutItems, index, pedidoId);
        }
    });    
}

function getImageName(companyId, type, imgExtension) {
    return `company-${companyId}-${type}-${uuidv4()}.${imgExtension}`;
}

function getImagePathName(imgName) {
    return `${pathImages}${sep}${sep}${imgName}`;
}

function getQRCodeName(companyId) {
    return `company-${companyId}-qrcode-${uuidv4()}.png`;
}

function getQRCodePathName(qrCodeName) {
    return `${pathQRCodes}${sep}${sep}${qrCodeName}`;
}
