// 1: http://expressjs.com/en/starter/hello-world.html
const express = require('express');
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const session = require("express-session");
// Requerimos axios, esta es una libreria hacer llamadas a la api de 42.
const axios = require('axios').default;

const app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
let sessionObject = {
	resave: true,
	secret: "TEST",
	saveUninitialized: true,
	cookie: {
	  maxAge: 2 * 60 * 60 * 1000,
	},
};
app.use(session(sessionObject));

const port = 3000;

// 2: Definimos los tokens
const uid = "a4a151ad912a7b4b3fb3994c5a2fea1c109f91dda4fb2b3fe10efce5f87a3c9e";
const secret = "d6b4ac01cf852306bea1c5a828e18392fa282fa7e2809104f4675e2e51ba5870";

// 3: Esto es necesario para establecer la ruta de los archivos estaticos. Ergo, el index.html es uno de ellos. Se mete en public para que encapsular la visivilidad.
app.use(express.static(__dirname + "/public"));

// 4: Definimos la ruta de tipo get.
app.get('/', (req, res) => {
	console.log(req.session.user)
	return res.send(req.session.user.login);
	// 2: Aqui definimos el archivo html que vamos a renderizar en la ruta localhost:3000/
	res.render('./public/index.html');
});

app.get('/info', (req, res) => {
	return res.send(req.session.user);
});

const getMyData = async function(token, refresh)
{
	return new Promise((resolve, reject) => {
		axios
		.request({
		  method: "GET",
		  url: "https://api.intra.42.fr/v2/me",
		  headers: {
			Accept: "application/json",
			Authorization: "Bearer " + token,
		  },
		})
		.then(async (response) => {
			resolve(response.data);
		})
		.catch((error) => {
			reject(error);
		});
	})
}

app.get('/callback', (req, res) => {
	// Revisamos que la url del callback (la del redirect del login) tiene el parametro del "code". Si es asi genial. Y si no, mostramos un error.
	if (typeof req.query.code !== "undefined") {
		// https://api.intra.42.fr/apidoc/guides/web_application_flow#exchange-your-code-for-an-access-token
		axios
		.request({
		  method: "POST",
		  url: "https://api.intra.42.fr/oauth/token",
		  data: { // Aqui van los datos que vamos a mander a la api.
			grant_type: "authorization_code",
			client_id: uid,
			client_secret: secret,
			code: req.query.code,
			redirect_uri: "http://localhost:3000/callback"
		  },
		  headers: {
			Accept: "application/json",
		  },
		})
		.then(async (response) => {
			req.session.user = await getMyData(response.data.access_token, response.data.refresh_token);
			req.session.cookie.maxAge = 2 * 60 * 60 * 1000;
			req.session.save(() => {
				return res.redirect("/info");
			});
		})
		.catch((error) => {
			console.log(error)
			res.status(403).send(error);
		});
	} else {
		res.send('Necesito un code!')
	}
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
