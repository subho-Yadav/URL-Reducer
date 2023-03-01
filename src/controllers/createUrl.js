const urlModel = require("../models/urlModel");
const shortId = require("shortid");
const isUrl = require("is-valid-http-url");
const axios = require("axios");
const redis = require("redis");

/*--------------------Connect to the redis server----------------------*/
const redisClient = redis.createClient({
  url : "redis://default:zvyCd8xYcj2rO6N4NCUrbkivoAZiX15K@redis-19717.c264.ap-south-1-1.ec2.cloud.redislabs.com:19717"
});

redisClient.connect(console.log("Connected to Redis..."))

const createUrl = async function (req, res) {
  try {
    const { longUrl } = req.body;

    /*---------------------------Check Body is empty or not----------------------------------*/
    if (Object.keys(req.body).length == 0)
      return res.status(400).send({ status: false, message: "request body is empty" });

    /*---------------------------Check Url is valid or not----------------------------------*/
    if (!isUrl(longUrl))
      return res.status(400).send({ status: false, message: "provided longUrl is invalid" });

    /*---------------------------Check Url existence----------------------------------*/
    let checkUrlExistence = await axios.get(longUrl)
    .then(() => longUrl)
    .catch(() => null);
    if (!checkUrlExistence)return res.status(404).send({ status: false, message: "currently this url is not exist" });

    /*--------------------get data from redis(cache) server----------------------*/
    let cachedData = await redisClient.get(longUrl);
    if (cachedData) {return res.status(200).send({status:true, data:JSON.parse(cachedData)})} // convert into JSON

    /*---------------------------Check Url is present in DB or not----------------------------------*/
    let longUrlFound = await urlModel.findOne({ longUrl: longUrl }).select({ urlCode: 1, longUrl: 1, shortUrl: 1, _id: 0 });
    if (longUrlFound)return res.status(200).send({ status: true, data: longUrlFound });

    /*---------------------------Generate random short alpha-num characters----------------------------------*/
    const genShortUrl = shortId.generate().toLowerCase();

    /*-------------------------Assigning data to req body------------------------------------*/
    req.body.urlCode = genShortUrl;
    req.body.shortUrl = `http://localhost:3000/${genShortUrl}`;

    /*---------------------------Creating data----------------------------------*/
    let createData = await urlModel.create(req.body);

    /*---------------------------Creating a custom object to match response----------------------------------*/
    let obj = {
      urlCode: createData.urlCode,
      longUrl: createData.longUrl,
      shortUrl: createData.shortUrl,
    }

    /*--------------------set data to redis(cache) server----------------------*/
    await redisClient.setEx(longUrl,60,JSON.stringify(obj)); //convert into string & set expire 60 seconds
    return res.status(201).send({ status: true, data: obj });

  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

const getUrl = async function (req, res) {
  try {
    let urlCode = req.params.urlCode;

    /*--------------------get data from redis(cache) server----------------------*/
    let cachedData = await redisClient.get(urlCode);
    if (cachedData) {return res.status(302).redirect(cachedData)} 

    /*---------------------------Check urlCode is present in DB or not----------------------------------*/
    let foundUrl = await urlModel.findOne({ urlCode: urlCode });

    if (!foundUrl)return res.status(404).send({ status: false, message: "short url is not exit in DB" });

    /*--------------------set data to redis(cache) server----------------------*/
    await redisClient.set(urlCode, foundUrl.longUrl);
    await redisClient.expire(urlCode,60); //set expire 60 seconds

    return res.status(302).redirect(foundUrl.longUrl);
    
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};
module.exports.createUrl = createUrl;
module.exports.getUrl = getUrl;







