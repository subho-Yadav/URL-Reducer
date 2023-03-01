const express = require('express')
const router = express.Router()
const urlController = require('../controllers/createUrl')

// router.get('/test', function(req,res){
//     res.send("test is done dana done")
// })

/*---------------------------To Create shorten Url----------------------------------*/
router.post('/url/shorten', urlController.createUrl)

/*---------------------------To fetch data----------------------------------*/
router.get(('/:urlCode'), urlController.getUrl)

router.get('/*', function(req,res){
    return res.status(400).send("Provided route url is wrong")
})
module.exports = router